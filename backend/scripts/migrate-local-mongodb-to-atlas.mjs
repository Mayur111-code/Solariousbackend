import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import mongoose from "mongoose";

const execute = process.argv.includes("--execute");
const database = process.env.DB_NAME?.trim() || "solarious";
const sourceUri = process.env.LOCAL_MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017/";
const atlasUri = process.env.ATLAS_MONGODB_URI?.trim();
const expectedHost = process.env.ATLAS_EXPECTED_HOST?.trim();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDirectory = resolve(
  process.env.MIGRATION_BACKUP_DIR?.trim() || `backups/solarious-${stamp}`,
);

function safeUri(value, label) {
  if (!value) throw new Error(`${label} is required`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid MongoDB URI`);
  }
  if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use mongodb:// or mongodb+srv://`);
  }
  return parsed;
}

const source = safeUri(sourceUri, "LOCAL_MONGODB_URI");
const target = safeUri(atlasUri, "ATLAS_MONGODB_URI");
if (!["localhost", "127.0.0.1", "::1"].includes(source.hostname)) {
  throw new Error("LOCAL_MONGODB_URI must point to the local machine");
}
if (target.protocol !== "mongodb+srv:") {
  throw new Error("ATLAS_MONGODB_URI must be an Atlas mongodb+srv:// URI");
}
if (expectedHost && target.hostname !== expectedHost) {
  throw new Error(`Atlas host does not match ATLAS_EXPECTED_HOST (${expectedHost})`);
}

const localArchive = resolve(backupDirectory, `${database}-local.archive.gz`);
const atlasArchive = resolve(backupDirectory, `${database}-atlas-before-migration.archive.gz`);

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${command} exited with code ${code}`)),
    );
  });
}

async function atlasRecordCount() {
  const connection = mongoose.createConnection(atlasUri, {
    appName: "solarious-migration-preflight",
    dbName: database,
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    await connection.asPromise();
    const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    let total = 0;
    for (const { name } of collections) {
      total += await connection.db.collection(name).estimatedDocumentCount();
    }
    return { collections: collections.length, records: total };
  } finally {
    await connection.close();
  }
}

console.log("Solarious MongoDB migration plan", {
  database,
  source: "local MongoDB",
  targetHost: target.hostname,
  backupDirectory,
  mode: execute ? "execute" : "dry-run",
});

if (!execute) {
  console.log("No data was changed. Re-run with --execute after reviewing the plan.");
  process.exit(0);
}

await mkdir(backupDirectory, { recursive: true });
await run("mongodump", [
  `--uri=${sourceUri}`,
  `--db=${database}`,
  `--archive=${localArchive}`,
  "--gzip",
]);
await run("mongodump", [
  `--uri=${atlasUri}`,
  `--db=${database}`,
  `--archive=${atlasArchive}`,
  "--gzip",
]);

const existing = await atlasRecordCount();
if (existing.records > 0) {
  throw new Error(
    `Atlas already contains ${existing.records} records across ${existing.collections} collections. ` +
      `The Atlas backup was created, but migration was stopped to prevent overwriting or merging data.`,
  );
}

await run("mongorestore", [
  `--uri=${atlasUri}`,
  `--archive=${localArchive}`,
  "--gzip",
  `--nsInclude=${database}.*`,
  "--stopOnError",
]);

console.log("Migration completed without dropping any Atlas collections.", {
  localArchive,
  atlasArchive,
});
