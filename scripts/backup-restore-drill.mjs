import { spawnSync } from 'node:child_process';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

const IMAGE = 'postgres:17-alpine';
const MAGIC = Buffer.from('SHOPBACKUP1');

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    const diagnostic = `${result.stderr || result.stdout || ''}`
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]')
      .trim();
    throw new Error(
      `${command} failed with exit code ${result.status}${diagnostic ? `: ${diagnostic}` : ''}`,
    );
  }
  return result;
}

export async function encryptBackup(inputPath, outputPath, passphrase) {
  const plaintext = await readFile(inputPath);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  await writeFile(outputPath, Buffer.concat([MAGIC, salt, iv, tag, ciphertext]), { mode: 0o600 });
}

export async function decryptBackup(inputPath, outputPath, passphrase) {
  const encrypted = await readFile(inputPath);
  if (!encrypted.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Backup file has an invalid format marker.');
  }
  let offset = MAGIC.length;
  const salt = encrypted.subarray(offset, offset += 16);
  const iv = encrypted.subarray(offset, offset += 12);
  const tag = encrypted.subarray(offset, offset += 16);
  const key = scryptSync(passphrase, salt, 32);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted.subarray(offset)), decipher.final()]);
  await writeFile(outputPath, plaintext, { mode: 0o600 });
}

function sha256(fileBuffer) {
  return createHash('sha256').update(fileBuffer).digest('hex');
}

function dockerMountPath(value) {
  return path.resolve(value).replaceAll('\\', '/');
}

async function restoreAndVerify(dumpPath) {
  const containerName = `shopping-restore-drill-${Date.now()}`;
  let containerStarted = false;
  try {
    run('docker', [
      'run', '--detach', '--rm', '--name', containerName,
      '--env', 'POSTGRES_PASSWORD=restore-drill-only',
      '--env', 'POSTGRES_DB=restore_drill',
      IMAGE,
    ], { capture: true });
    containerStarted = true;

    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const result = run('docker', ['exec', containerName, 'pg_isready', '-U', 'postgres'], {
        capture: true,
        allowFailure: true,
      });
      if (result.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    if (!ready) throw new Error('Temporary restore database did not become ready.');

    run('docker', [
      'exec', containerName,
      'psql', '--username=postgres', '--dbname=restore_drill', '--set=ON_ERROR_STOP=1',
      '--command', `create role authenticated nologin;
        create schema auth;
        create function auth.uid() returns uuid language sql stable as 'select null::uuid';`,
    ], { capture: true });

    run('docker', ['cp', dumpPath, `${containerName}:/tmp/application.dump`]);
    run('docker', [
      'exec', containerName,
      'pg_restore', '--username=postgres', '--dbname=restore_drill',
      '--no-owner', '--no-privileges', '/tmp/application.dump',
    ], { capture: true });

    const result = run('docker', [
      'exec', containerName,
      'psql', '--username=postgres', '--dbname=restore_drill', '--tuples-only', '--no-align',
      '--command', `select json_build_object(
        'families', (select count(*) from public.families),
        'family_members', (select count(*) from public.family_members),
        'grocery_items', (select count(*) from public.grocery_items),
        'foreign_keys', (select count(*) from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace)
      );`,
    ], { capture: true });

    const report = JSON.parse(result.stdout.trim());
    if (report.foreign_keys < 2) throw new Error('Restore drill did not preserve expected foreign keys.');
    return report;
  } finally {
    if (containerStarted) {
      run('docker', ['stop', containerName], { capture: true, allowFailure: true });
    }
  }
}

async function createDump(sourceDatabaseUrl, tempDirectory) {
  const dumpPath = path.join(tempDirectory, 'application.dump');
  const envPath = path.join(tempDirectory, 'source.env');
  const source = new URL(sourceDatabaseUrl);
  const databaseName = decodeURIComponent(source.pathname.replace(/^\//, ''));
  const sslMode = source.searchParams.get('sslmode')
    || (/^(127\.0\.0\.1|localhost)$/.test(source.hostname) ? 'disable' : 'require');
  const libpqEnvironment = [
    `PGHOST=${source.hostname}`,
    `PGPORT=${source.port || '5432'}`,
    `PGUSER=${decodeURIComponent(source.username)}`,
    `PGPASSWORD=${decodeURIComponent(source.password)}`,
    `PGDATABASE=${databaseName}`,
    `PGSSLMODE=${sslMode}`,
  ].join('\n');
  await writeFile(envPath, `${libpqEnvironment}\n`, { mode: 0o600 });
  run('docker', [
    'run', '--rm', '--env-file', envPath,
    '--volume', `${dockerMountPath(tempDirectory)}:/backup`,
    IMAGE,
    'pg_dump', '--format=custom', '--no-owner', '--no-privileges',
    '--table=public.families', '--table=public.family_members', '--table=public.grocery_items',
    '--file=/backup/application.dump',
  ], { capture: true });
  return dumpPath;
}

function parseArgs() {
  const inputIndex = process.argv.indexOf('--encrypted-input');
  return {
    encryptedInput: inputIndex >= 0 ? process.argv[inputIndex + 1] : null,
  };
}

async function main() {
  dotenv.config({ path: '.env.production', quiet: true });
  const { encryptedInput } = parseArgs();
  const outputPath = process.env.BACKUP_OUTPUT ? path.resolve(process.env.BACKUP_OUTPUT) : null;
  const passphrase = process.env.BACKUP_ENCRYPTION_KEY;
  const tempDirectory = await mkdtemp(path.join(tmpdir(), 'shopping-restore-drill-'));

  try {
    let dumpPath;
    if (encryptedInput) {
      if (!passphrase) throw new Error('BACKUP_ENCRYPTION_KEY is required to verify an encrypted backup.');
      dumpPath = path.join(tempDirectory, 'decrypted.dump');
      await decryptBackup(path.resolve(encryptedInput), dumpPath, passphrase);
    } else {
      const sourceDatabaseUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
      if (!sourceDatabaseUrl) throw new Error('SOURCE_DATABASE_URL is required.');
      const hostname = new URL(sourceDatabaseUrl).hostname;
      if (!hostname.endsWith('.supabase.com') && !/^(127\.0\.0\.1|localhost)$/.test(hostname)) {
        throw new Error('Refusing to dump an unexpected database host.');
      }
      dumpPath = await createDump(sourceDatabaseUrl, tempDirectory);

      if (outputPath) {
        if (!passphrase || passphrase.length < 24) {
          throw new Error('BACKUP_ENCRYPTION_KEY must be at least 24 characters for retained backups.');
        }
        await mkdir(path.dirname(outputPath), { recursive: true });
        await encryptBackup(dumpPath, outputPath, passphrase);
        const verificationPath = path.join(tempDirectory, 'encryption-check.dump');
        await decryptBackup(outputPath, verificationPath, passphrase);
        if (sha256(await readFile(dumpPath)) !== sha256(await readFile(verificationPath))) {
          throw new Error('Encrypted backup verification failed.');
        }
      }
    }

    const restoreReport = await restoreAndVerify(dumpPath);
    console.log(JSON.stringify({ ok: true, restoreReport, encryptedArtifact: Boolean(outputPath) }, null, 2));
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
