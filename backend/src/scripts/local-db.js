import EmbeddedPostgres from "embedded-postgres";
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Local development convenience: a real persistent PostgreSQL cluster running
// as the current user, with no Docker or system service changes.
const backend = fileURLToPath(new URL("../..", import.meta.url));
const local = path.join(backend, ".local-db");
await mkdir(local, { recursive: true, mode: 0o700 });
const configPath = path.join(local, "connection.json");
let config;
try { config = JSON.parse(await readFile(configPath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  config = { user: "healthtrack", password: randomBytes(32).toString("hex"), port: 55433, database: "healthtrack" };
  await writeFile(configPath, JSON.stringify(config), { mode: 0o600, flag: "wx" });
}
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(local, "postgres"),
  user: config.user, password: config.password, port: config.port,
  authMethod: "scram-sha-256", persistent: true, autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1", "-c", "unix_socket_directories="],
  onLog: () => {}, onError: () => console.error("[local-db] PostgreSQL reported an error."),
});

try {
  try { await access(path.join(local, "postgres", "PG_VERSION")); }
  catch (error) { if (error.code === "ENOENT") await postgres.initialise(); else throw error; }
  await postgres.start();
  const client = postgres.getPgClient("postgres", "127.0.0.1");
  try {
    await client.connect();
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [config.database]);
    if (!result.rows.length) await client.query(`CREATE DATABASE ${client.escapeIdentifier(config.database)}`);
  } finally { await client.end(); }

  const envPath = path.join(backend, ".env");
  let env;
  try { env = await readFile(envPath, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; env = ""; }
  const databaseUrl = `postgresql://${config.user}:${config.password}@127.0.0.1:${config.port}/${config.database}`;
  const current = env.match(/^DATABASE_URL=(.*)$/m)?.[1];
  if (current !== databaseUrl) {
    if (env) {
      try { await copyFile(envPath, `${envPath}.before-local-db`, constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    const line = `DATABASE_URL=${databaseUrl}`;
    env = current === undefined ? `${env.trimEnd()}\n${line}\n` : env.replace(/^DATABASE_URL=.*$/m, line);
    await writeFile(envPath, env, { mode: 0o600 });
  }
  console.log(`[local-db] PostgreSQL ready at 127.0.0.1:${config.port}/${config.database}. Data persists in backend/.local-db.`);
  console.log("[local-db] backend/.env is configured. Restart the API to load it. Keep this process running; Ctrl+C stops the database.");
} catch (error) {
  console.error("[local-db] Could not start PostgreSQL:", error?.message || "Check that port 55433 is available and another copy is not running.");
  process.exitCode = 1;
}
