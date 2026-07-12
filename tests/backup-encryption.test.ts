import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup } from '../scripts/backup-restore-drill.mjs';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('encrypted database backups', () => {
  it('round-trips backup bytes and rejects the wrong key', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'backup-encryption-test-'));
    temporaryDirectories.push(directory);
    const input = path.join(directory, 'input.dump');
    const encrypted = path.join(directory, 'backup.enc');
    const output = path.join(directory, 'output.dump');
    await writeFile(input, Buffer.from('representative postgres custom backup bytes'));

    await encryptBackup(input, encrypted, 'correct horse battery staple 2026');
    await decryptBackup(encrypted, output, 'correct horse battery staple 2026');

    expect(await readFile(output)).toEqual(await readFile(input));
    await expect(decryptBackup(encrypted, output, 'wrong passphrase but long enough')).rejects.toThrow();
  });
});
