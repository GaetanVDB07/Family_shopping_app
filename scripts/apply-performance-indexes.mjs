import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.production", quiet: true });

const { Client } = pg;
const verifyOnly = process.argv.includes("--verify-only");

const indexStatements = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS family_members_user_family_idx
     ON family_members (user_id, family_id)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS grocery_items_active_list_idx
     ON grocery_items (family_id, archived_at, sort_order, added_at)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS grocery_items_history_idx
     ON grocery_items (family_id, completed_at, archived_at, added_at)`,
];

const indexNames = [
  "family_members_user_family_idx",
  "grocery_items_active_list_idx",
  "grocery_items_history_idx",
];

async function readRowCounts(client) {
  const tables = ["families", "family_members", "grocery_items"];
  const entries = [];

  for (const table of tables) {
    const result = await client.query(`SELECT count(*)::text AS count FROM ${table}`);
    entries.push([table, result.rows[0].count]);
  }

  return Object.fromEntries(entries);
}

async function readInstalledIndexes(client) {
  const result = await client.query(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])
      ORDER BY indexname`,
    [indexNames],
  );

  return result.rows.map((row) => row.indexname);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env.production");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const before = await readRowCounts(client);

    if (!verifyOnly) {
      for (const statement of indexStatements) {
        await client.query(statement);
      }
    }

    const after = await readRowCounts(client);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error(`Production row counts changed: ${JSON.stringify({ before, after })}`);
    }

    const installedIndexes = await readInstalledIndexes(client);
    if (!verifyOnly && installedIndexes.length !== indexNames.length) {
      throw new Error(`Not all performance indexes were installed: ${installedIndexes.join(", ")}`);
    }

    console.log(JSON.stringify({
      mode: verifyOnly ? "verify-only" : "apply",
      rowCounts: after,
      installedIndexes,
      dataChanged: false,
    }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
