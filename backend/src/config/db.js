import { neon } from "@neondatabase/serverless";
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || DATABASE_URL.includes("@host") || DATABASE_URL.includes("username:password")) {
  throw new Error(
    "DATABASE_URL is missing or still using the placeholder host. Set it to a real PostgreSQL/Neon connection string, e.g. postgresql://postgres:postgres@127.0.0.1:5432/healthtrack"
  );
}

function createLocalSql(connectionString) {
  const pool = new Pool({ connectionString });

  const sql = (strings, ...values) => {
    const text = strings.reduce(
      (query, string, index) => query + string + (index < values.length ? `$${index + 1}` : ""),
      ""
    );
    return pool.query(text, values).then(({ rows }) => rows);
  };

  sql.query = (text, values = []) => pool.query(text, values).then(({ rows }) => rows);

  return sql;
}

function createNeonSql(connectionString) {
  const neonSql = neon(connectionString);

  // Keep the tagged-template API and the positional-query API identical
  // across local PostgreSQL and Neon deployments.
  const sql = (strings, ...values) => neonSql(strings, ...values);
  sql.query = (text, values = []) => neonSql.query(text, values);

  return sql;
}

const databaseUrl = new URL(DATABASE_URL);
export const sql = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname)
  ? createLocalSql(DATABASE_URL)
  : createNeonSql(DATABASE_URL);

// =======================================================================
// TABLE DEFINITIONS
//
// This is the single source of truth for the schema. Every table lists both
// a `createSQL` string (for a brand-new database) and a `columns` map (so
// syncSchema() can diff an existing database against it). These tables cover
// patients, appointments, users, and the five clinical-record tables
// (health_assessments, vital_signs, midwife_notes, medical_histories,
// allergies) with matching relationships and fields.
//
// All tables use a SERIAL `id` primary key plus a separate human-readable
// string id (see utils/generateId.js). Foreign keys reference the string
// id columns, not the serial id.
// =======================================================================

const TABLES = [
  {
    // A login account. role is one of "admin", "health_worker",
    // "patient" -- enforced in application code (controllers/auth), not a
    // DB CHECK constraint, so that syncSchema() never has to reconcile a
    // changed constraint.
    table: "users",
    createSQL: `CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      user_id      VARCHAR(255) UNIQUE NOT NULL,
      name         VARCHAR(255) NOT NULL,
      email        VARCHAR(255) NOT NULL UNIQUE,
      password     VARCHAR(255) NOT NULL,
      role         VARCHAR(50) NOT NULL,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      user_id: "VARCHAR(255) UNIQUE NOT NULL",
      name: "VARCHAR(255) NOT NULL",
      email: "VARCHAR(255) NOT NULL UNIQUE",
      password: "VARCHAR(255) NOT NULL",
      role: "VARCHAR(50) NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    // The person registered at the health centre. user_id is the optional
    // portal login -- nullable, because a health worker can register a
    // walk-in patient who has no account yet; an admin grants one later.
    table: "patients",
    createSQL: `CREATE TABLE IF NOT EXISTS patients (
      id                        SERIAL PRIMARY KEY,
      patient_id                VARCHAR(255) UNIQUE NOT NULL,
      user_id                   VARCHAR(255) UNIQUE REFERENCES users(user_id),
      first_name                VARCHAR(255) NOT NULL,
      middle_name               VARCHAR(255),
      last_name                 VARCHAR(255) NOT NULL,
      sex                       VARCHAR(20) NOT NULL,
      birthdate                 DATE NOT NULL,
      civil_status              VARCHAR(50),
      blood_type                VARCHAR(10),
      occupation                VARCHAR(255),
      barangay_id_number        VARCHAR(100),
      contact_number            VARCHAR(20),
      address                   TEXT NOT NULL,
      nationality              VARCHAR(100),
      place_of_birth            VARCHAR(255),
      emergency_contact_name    VARCHAR(255),
      emergency_contact_number  VARCHAR(20),
      emergency_contact_relationship VARCHAR(100),
      created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      patient_id: "VARCHAR(255) UNIQUE NOT NULL",
      user_id: "VARCHAR(255) UNIQUE REFERENCES users(user_id)",
      first_name: "VARCHAR(255) NOT NULL",
      middle_name: "VARCHAR(255)",
      last_name: "VARCHAR(255) NOT NULL",
      sex: "VARCHAR(20) NOT NULL",
      birthdate: "DATE NOT NULL",
      civil_status: "VARCHAR(50)",
      blood_type: "VARCHAR(10)",
      occupation: "VARCHAR(255)",
      barangay_id_number: "VARCHAR(100)",
      contact_number: "VARCHAR(20)",
      address: "TEXT NOT NULL",
      nationality: "VARCHAR(100)",
      place_of_birth: "VARCHAR(255)",
      emergency_contact_name: "VARCHAR(255)",
      emergency_contact_number: "VARCHAR(20)",
      emergency_contact_relationship: "VARCHAR(100)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    // Created from a patient's record screen by an admin.
    table: "appointments",
    createSQL: `CREATE TABLE IF NOT EXISTS appointments (
      id             SERIAL PRIMARY KEY,
      appointment_id VARCHAR(255) UNIQUE NOT NULL,
      patient_id     VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      admin_id       VARCHAR(255) REFERENCES users(user_id),
      scheduled_at   TIMESTAMP NOT NULL,
      status         VARCHAR(20) NOT NULL DEFAULT 'pending',
      reason         TEXT NOT NULL,
      notes          TEXT,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      appointment_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      admin_id: "VARCHAR(255) REFERENCES users(user_id)",
      scheduled_at: "TIMESTAMP NOT NULL",
      status: "VARCHAR(20) NOT NULL DEFAULT 'pending'",
      reason: "TEXT NOT NULL",
      notes: "TEXT",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  // ---------------------------------------------------------------------
  // The five clinical-record tables. Same skeleton (patient, author, one
  // date), differing only in their content columns -- which fields exist
  // per type is also mirrored in config/recordTypes.js, so a new record
  // type means editing both that file and this one.
  // ---------------------------------------------------------------------

  {
    table: "health_assessments",
    createSQL: `CREATE TABLE IF NOT EXISTS health_assessments (
      id             SERIAL PRIMARY KEY,
      record_id      VARCHAR(255) UNIQUE NOT NULL,
      patient_id     VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      created_by     VARCHAR(255) REFERENCES users(user_id),
      condition      VARCHAR(255) NOT NULL,
      description    TEXT,
      assessment_date DATE NOT NULL,
      status         VARCHAR(30) NOT NULL,
      medication     TEXT,
      remarks        TEXT,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      condition: "VARCHAR(255) NOT NULL",
      description: "TEXT",
      assessment_date: "DATE NOT NULL",
      status: "VARCHAR(30) NOT NULL",
      medication: "TEXT",
      remarks: "TEXT",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "vital_signs",
    createSQL: `CREATE TABLE IF NOT EXISTS vital_signs (
      id                  SERIAL PRIMARY KEY,
      record_id           VARCHAR(255) UNIQUE NOT NULL,
      patient_id          VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      created_by          VARCHAR(255) REFERENCES users(user_id),
      blood_pressure      VARCHAR(20) NOT NULL,
      temperature         DECIMAL(4,1) NOT NULL,
      pulse_rate          INTEGER NOT NULL,
      respiratory_rate    INTEGER NOT NULL,
      height_cm           DECIMAL(5,2) NOT NULL,
      weight_kg           DECIMAL(5,2) NOT NULL,
      bmi                 DECIMAL(4,1) NOT NULL,
      oxygen_saturation   INTEGER NOT NULL,
      pain_score          INTEGER NOT NULL,
      recorded_at         TIMESTAMP NOT NULL,
      created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      blood_pressure: "VARCHAR(20) NOT NULL",
      temperature: "DECIMAL(4,1) NOT NULL",
      pulse_rate: "INTEGER NOT NULL",
      respiratory_rate: "INTEGER NOT NULL",
      height_cm: "DECIMAL(5,2) NOT NULL",
      weight_kg: "DECIMAL(5,2) NOT NULL",
      bmi: "DECIMAL(4,1) NOT NULL",
      oxygen_saturation: "INTEGER NOT NULL",
      pain_score: "INTEGER NOT NULL",
      recorded_at: "TIMESTAMP NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "midwife_notes",
    createSQL: `CREATE TABLE IF NOT EXISTS midwife_notes (
      id               SERIAL PRIMARY KEY,
      record_id        VARCHAR(255) UNIQUE NOT NULL,
      patient_id       VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      created_by       VARCHAR(255) REFERENCES users(user_id),
      consultation_date DATE NOT NULL,
      notes            TEXT NOT NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      consultation_date: "DATE NOT NULL",
      notes: "TEXT NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "medical_histories",
    createSQL: `CREATE TABLE IF NOT EXISTS medical_histories (
      id                        SERIAL PRIMARY KEY,
      record_id                 VARCHAR(255) UNIQUE NOT NULL,
      patient_id                VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      created_by                VARCHAR(255) REFERENCES users(user_id),
      past_illnesses            TEXT NOT NULL,
      chronic_conditions        TEXT NOT NULL,
      past_surgeries            TEXT NOT NULL,
      previous_hospitalizations TEXT NOT NULL,
      family_medical_history    TEXT NOT NULL,
      immunization_status       VARCHAR(100) NOT NULL,
      recorded_at               DATE NOT NULL,
      created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      past_illnesses: "TEXT NOT NULL",
      chronic_conditions: "TEXT NOT NULL",
      past_surgeries: "TEXT NOT NULL",
      previous_hospitalizations: "TEXT NOT NULL",
      family_medical_history: "TEXT NOT NULL",
      immunization_status: "VARCHAR(100) NOT NULL",
      recorded_at: "DATE NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "allergies",
    createSQL: `CREATE TABLE IF NOT EXISTS allergies (
      id                    SERIAL PRIMARY KEY,
      record_id             VARCHAR(255) UNIQUE NOT NULL,
      patient_id            VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      created_by            VARCHAR(255) REFERENCES users(user_id),
      medication_allergies TEXT NOT NULL,
      food_allergies        TEXT NOT NULL,
      environmental_allergies TEXT NOT NULL,
      reaction              TEXT NOT NULL,
      status                VARCHAR(30) NOT NULL,
      recorded_at           DATE NOT NULL,
      remarks               TEXT,
      created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      medication_allergies: "TEXT NOT NULL",
      food_allergies: "TEXT NOT NULL",
      environmental_allergies: "TEXT NOT NULL",
      reaction: "TEXT NOT NULL",
      status: "VARCHAR(30) NOT NULL",
      recorded_at: "DATE NOT NULL",
      remarks: "TEXT",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },
];

// -----------------------------------------------------------------------
// CONNECT TO DATABASE
//
// Creates tables that don't exist. Does NOT modify existing tables.
// Use syncSchema() when you want the database to exactly match TABLES.
// -----------------------------------------------------------------------
export async function connectNeon() {
  try {
    for (const { createSQL } of TABLES) {
      await sql.query(createSQL);
    }

    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'appointments'
            AND column_name = 'midwife_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'appointments'
            AND column_name = 'admin_id'
        ) THEN
          ALTER TABLE appointments RENAME COLUMN midwife_id TO admin_id;
        END IF;
      END $$;
    `;

    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS place_of_birth VARCHAR(255)`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100)`;
    await sql`ALTER TABLE patients DROP COLUMN IF EXISTS philhealth_number`;

    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(20)`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS temperature DECIMAL(4,1)`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pulse_rate INTEGER`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,2)`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2)`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,1)`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_saturation INTEGER`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_score INTEGER`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'vital_signs'
            AND column_name = 'test_name'
        ) THEN
          ALTER TABLE vital_signs ALTER COLUMN test_name DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'vital_signs'
            AND column_name = 'value'
        ) THEN
          ALTER TABLE vital_signs ALTER COLUMN value DROP NOT NULL;
        END IF;
      END $$;
    `;

    await sql`ALTER TABLE health_assessments ADD COLUMN IF NOT EXISTS condition VARCHAR(255)`;
    await sql`ALTER TABLE health_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE`;
    await sql`ALTER TABLE health_assessments ADD COLUMN IF NOT EXISTS status VARCHAR(30)`;
    await sql`ALTER TABLE health_assessments ADD COLUMN IF NOT EXISTS medication TEXT`;
    await sql`ALTER TABLE health_assessments ADD COLUMN IF NOT EXISTS remarks TEXT`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'health_assessments'
            AND column_name = 'diagnosis'
        ) THEN
          ALTER TABLE health_assessments ALTER COLUMN diagnosis DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'health_assessments'
            AND column_name = 'diagnosed_at'
        ) THEN
          ALTER TABLE health_assessments ALTER COLUMN diagnosed_at DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'health_assessments'
            AND column_name = 'diagnosis'
        ) THEN
          EXECUTE 'UPDATE health_assessments SET condition = diagnosis WHERE condition IS NULL AND diagnosis IS NOT NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'health_assessments'
            AND column_name = 'diagnosed_at'
        ) THEN
          EXECUTE 'UPDATE health_assessments SET assessment_date = diagnosed_at WHERE assessment_date IS NULL AND diagnosed_at IS NOT NULL';
        END IF;
        EXECUTE 'UPDATE health_assessments SET status = ''active'' WHERE status IS NULL';
      END $$;
    `;

    await sql`ALTER TABLE medical_histories ADD COLUMN IF NOT EXISTS past_illnesses TEXT`;
    await sql`ALTER TABLE medical_histories ADD COLUMN IF NOT EXISTS chronic_conditions TEXT`;
    await sql`ALTER TABLE medical_histories ADD COLUMN IF NOT EXISTS past_surgeries TEXT`;
    await sql`ALTER TABLE medical_histories ADD COLUMN IF NOT EXISTS previous_hospitalizations TEXT`;
    await sql`ALTER TABLE medical_histories ADD COLUMN IF NOT EXISTS family_medical_history TEXT`;
    await sql`ALTER TABLE medical_histories ADD COLUMN IF NOT EXISTS immunization_status VARCHAR(100)`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'medical_histories'
            AND column_name = 'condition'
        ) THEN
          ALTER TABLE medical_histories ALTER COLUMN condition DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'medical_histories'
            AND column_name = 'recorded_at'
        ) THEN
          ALTER TABLE medical_histories ALTER COLUMN recorded_at DROP NOT NULL;
        END IF;
      END $$;
    `;

    await sql`ALTER TABLE allergies ADD COLUMN IF NOT EXISTS medication_allergies TEXT`;
    await sql`ALTER TABLE allergies ADD COLUMN IF NOT EXISTS food_allergies TEXT`;
    await sql`ALTER TABLE allergies ADD COLUMN IF NOT EXISTS environmental_allergies TEXT`;
    await sql`ALTER TABLE allergies ADD COLUMN IF NOT EXISTS status VARCHAR(30)`;
    await sql`ALTER TABLE allergies ADD COLUMN IF NOT EXISTS remarks TEXT`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'allergies'
            AND column_name = 'allergen'
        ) THEN
          ALTER TABLE allergies ALTER COLUMN allergen DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'allergies'
            AND column_name = 'reaction'
        ) THEN
          ALTER TABLE allergies ALTER COLUMN reaction DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'allergies'
            AND column_name = 'status'
        ) THEN
          EXECUTE 'UPDATE allergies SET status = ''active'' WHERE status IS NULL';
        END IF;
      END $$;
    `;

    await sql`ALTER TABLE midwife_notes ADD COLUMN IF NOT EXISTS consultation_date DATE`;
    await sql`ALTER TABLE midwife_notes ADD COLUMN IF NOT EXISTS notes TEXT`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'midwife_notes'
            AND column_name = 'title'
        ) THEN
          ALTER TABLE midwife_notes ALTER COLUMN title DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'midwife_notes'
            AND column_name = 'note'
        ) THEN
          ALTER TABLE midwife_notes ALTER COLUMN note DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'midwife_notes'
            AND column_name = 'noted_at'
        ) THEN
          ALTER TABLE midwife_notes ALTER COLUMN noted_at DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'midwife_notes'
            AND column_name = 'note'
        ) THEN
          EXECUTE 'UPDATE midwife_notes SET notes = note WHERE notes IS NULL AND note IS NOT NULL';
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'midwife_notes'
            AND column_name = 'noted_at'
        ) THEN
          EXECUTE 'UPDATE midwife_notes SET consultation_date = noted_at WHERE consultation_date IS NULL AND noted_at IS NOT NULL';
        END IF;
      END $$;
    `;

    // Preserve existing accounts after the old staff role was renamed to admin.
    await sql`UPDATE users SET role = 'admin' WHERE role = 'midwife'`;

    console.log("[db] Database initialized successfully");
  } catch (error) {
    console.error("[db] Error initializing DB:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------
// SYNC DATABASE SCHEMA
//
// TABLES is the source of truth.
//
// This function will:
//
//   1. Create missing tables
//   2. Drop tables that are not defined in TABLES
//   3. Add missing columns
//   4. Drop extra columns
//
// IMPORTANT:
// - Existing data is preserved whenever possible.
// - Tables are NOT dropped/recreated just because a column changed.
// - If nothing changed, no ALTER TABLE is executed.
// - Adding a NOT NULL column to a table with existing rows requires
//   either a DEFAULT or existing rows must be populated first.
// -----------------------------------------------------------------------
export async function syncSchema(onlyTables) {
  try {
    console.log("[schema-sync] starting...");

    // ---------------------------------------------------------------
    // Determine which tables we are synchronizing
    // ---------------------------------------------------------------

    const configuredTables = onlyTables
      ? TABLES.filter((table) => onlyTables.includes(table.table))
      : TABLES;

    const configuredTableNames = configuredTables.map((table) => table.table);

    // ---------------------------------------------------------------
    // 1. GET EXISTING TABLES
    // ---------------------------------------------------------------

    const existingTableRows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    const existingTableNames = existingTableRows.map((row) => row.table_name);

    // ---------------------------------------------------------------
    // 2. DROP EXTRA TABLES
    //
    // Example: TABLES contains users, patients. Database contains
    // users, patients, consultations. consultations will be dropped.
    // ---------------------------------------------------------------

    const tablesToDrop = existingTableNames.filter(
      (tableName) => !configuredTableNames.includes(tableName)
    );

    for (const tableName of tablesToDrop) {
      console.log(`[schema-sync] dropping extra table "${tableName}"`);
      await sql.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }

    // ---------------------------------------------------------------
    // 3. PROCESS EACH CONFIGURED TABLE
    // ---------------------------------------------------------------

    for (const tableDefinition of configuredTables) {
      const { table: tableName, createSQL, columns: desiredColumns } = tableDefinition;

      // TABLE DOES NOT EXIST
      if (!existingTableNames.includes(tableName)) {
        console.log(`[schema-sync] ${tableName}: table does not exist, creating...`);
        await sql.query(createSQL);
        console.log(`[schema-sync] ${tableName}: created`);
        continue;
      }

      // TABLE EXISTS -- get current columns
      const existingColumnRows = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      const existingColumnNames = existingColumnRows.map((column) => column.column_name);
      const desiredColumnNames = Object.keys(desiredColumns);

      const columnsToAdd = desiredColumnNames.filter((name) => !existingColumnNames.includes(name));
      const columnsToDrop = existingColumnNames.filter((name) => !desiredColumnNames.includes(name));

      if (columnsToAdd.length === 0 && columnsToDrop.length === 0) {
        console.log(`[schema-sync] ${tableName}: already in sync`);
        continue;
      }

      // ADD MISSING COLUMNS
      for (const columnName of columnsToAdd) {
        const definition = desiredColumns[columnName];

        console.log(`[schema-sync] ${tableName}: adding column "${columnName}"`);

        const isNotNull = /\bNOT\s+NULL\b/i.test(definition);
        const hasDefault = /\bDEFAULT\b/i.test(definition);

        // CASE 1: NOT NULL + DEFAULT -- safe, Postgres backfills existing rows.
        if (isNotNull && hasDefault) {
          await sql.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
          continue;
        }

        // CASE 2: NOT NULL without DEFAULT -- add nullable first, then
        // tighten to NOT NULL only if no existing row would violate it.
        if (isNotNull && !hasDefault) {
          const nullableDefinition = definition.replace(/\s+NOT\s+NULL\b/gi, "");

          await sql.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${nullableDefinition}`);

          const result = await sql.query(
            `SELECT COUNT(*)::int AS count FROM "${tableName}" WHERE "${columnName}" IS NULL`
          );
          const nullCount = result[0]?.count ?? 0;

          if (nullCount === 0) {
            await sql.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET NOT NULL`);
            console.log(`[schema-sync] ${tableName}.${columnName}: NOT NULL applied`);
          } else {
            console.warn(
              `[schema-sync] ${tableName}.${columnName}: added as nullable because ${nullCount} existing row(s) would contain NULL.`
            );
            console.warn(`[schema-sync] Populate "${columnName}" before making it NOT NULL.`);
          }

          continue;
        }

        // CASE 3: nullable column -- safe to add directly.
        await sql.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
      }

      // DROP EXTRA COLUMNS
      for (const columnName of columnsToDrop) {
        console.log(`[schema-sync] ${tableName}: dropping extra column "${columnName}"`);
        await sql.query(`ALTER TABLE "${tableName}" DROP COLUMN "${columnName}" CASCADE`);
      }

      console.log(`[schema-sync] ${tableName}: schema updated`);
    }

    console.log("[schema-sync] database schema synchronized successfully");
  } catch (error) {
    console.error("[schema-sync] Error synchronizing database schema:", error);
    throw error;
  }
}

// To change columns, do this:
//
// 1. Edit two spots for the table you're changing, inside the `TABLES` array:
//    - The `createSQL` string (so a brand-new DB gets it right from scratch)
//    - The `columns` object (so `syncSchema()` knows what to add/drop on an existing DB)
//
//    Example -- adding a `notes` column to `patients`:
//      createSQL: `CREATE TABLE IF NOT EXISTS patients ( ... notes TEXT, ... )`,
//      columns:   { ... notes: "TEXT", ... },
//
//    To remove a column, just delete it from both places.
//
// 2. Run `syncSchema()` to apply it to the actual Neon DB:
//      npm run sync-schema
//    or `await syncSchema(["patients"])` to only touch that one table.
