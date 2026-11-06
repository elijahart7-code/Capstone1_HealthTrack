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

  const sql = (strings, ...values) => neonSql(strings, ...values);
  sql.query = (text, values = []) => neonSql.query(text, values);

  return sql;
}

const databaseUrl = new URL(DATABASE_URL);
export const sql = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname)
  ? createLocalSql(DATABASE_URL)
  : createNeonSql(DATABASE_URL);


const TABLES = [
  {
    table: "health_option_values",
    createSQL: `CREATE TABLE IF NOT EXISTS health_option_values (
      id          SERIAL PRIMARY KEY,
      option_key  VARCHAR(100) NOT NULL,
      value       VARCHAR(255) NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (option_key, value)
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      option_key: "VARCHAR(100) NOT NULL",
      value: "VARCHAR(255) NOT NULL",
      sort_order: "INTEGER NOT NULL DEFAULT 0",
      active: "BOOLEAN NOT NULL DEFAULT TRUE",
    },
  },
  {
    table: "users",
    createSQL: `CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      user_id      VARCHAR(255) UNIQUE NOT NULL,
      name         VARCHAR(255) NOT NULL,
      email        VARCHAR(255) NOT NULL UNIQUE,
      password     VARCHAR(255) NOT NULL,
      role         VARCHAR(50) NOT NULL,
      is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
      verification_token VARCHAR(64),
      token_expires_at TIMESTAMPTZ,
      verification_sent_at TIMESTAMPTZ,
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
      is_verified: "BOOLEAN NOT NULL DEFAULT FALSE",
      verification_token: "VARCHAR(64)",
      token_expires_at: "TIMESTAMPTZ",
      verification_sent_at: "TIMESTAMPTZ",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
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
      place_of_birth_data       JSONB,
      emergency_contact_name    VARCHAR(255),
      emergency_contact_number  VARCHAR(20),
      emergency_contact_relationship VARCHAR(100),
      archived_at               TIMESTAMP,
      archived_by               VARCHAR(255) REFERENCES users(user_id),
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
      place_of_birth_data: "JSONB",
      emergency_contact_name: "VARCHAR(255)",
      emergency_contact_number: "VARCHAR(20)",
      emergency_contact_relationship: "VARCHAR(100)",
      archived_at: "TIMESTAMP",
      archived_by: "VARCHAR(255) REFERENCES users(user_id)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "appointments",
    createSQL: `CREATE TABLE IF NOT EXISTS appointments (
      id             SERIAL PRIMARY KEY,
      appointment_id VARCHAR(255) UNIQUE NOT NULL,
      patient_id     VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      admin_id       VARCHAR(255) REFERENCES users(user_id),
      scheduled_at   TIMESTAMP NOT NULL,
      status         VARCHAR(20) NOT NULL DEFAULT 'confirmed',
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
      status: "VARCHAR(20) NOT NULL DEFAULT 'confirmed'",
      reason: "TEXT NOT NULL",
      notes: "TEXT",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },


  {
    table: "health_assessments",
    createSQL: `CREATE TABLE IF NOT EXISTS health_assessments (
      id             SERIAL PRIMARY KEY,
      record_id      VARCHAR(255) UNIQUE NOT NULL,
      appointment_id VARCHAR(255) REFERENCES appointments(appointment_id),
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
      appointment_id: "VARCHAR(255) REFERENCES appointments(appointment_id)",
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
      appointment_id VARCHAR(255) REFERENCES appointments(appointment_id),
      patient_id          VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      created_by          VARCHAR(255) REFERENCES users(user_id),
      blood_pressure      TEXT NOT NULL,
      temperature         TEXT NOT NULL,
      pulse_rate          TEXT NOT NULL,
      respiratory_rate    TEXT NOT NULL,
      height_cm           TEXT NOT NULL,
      weight_kg           TEXT NOT NULL,
      bmi                 TEXT NOT NULL,
      oxygen_saturation   TEXT NOT NULL,
      pain_score          TEXT NOT NULL,
      recorded_at         TIMESTAMP NOT NULL,
      created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      record_id: "VARCHAR(255) UNIQUE NOT NULL",
      appointment_id: "VARCHAR(255) REFERENCES appointments(appointment_id)",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      blood_pressure: "TEXT NOT NULL",
      temperature: "TEXT NOT NULL",
      pulse_rate: "TEXT NOT NULL",
      respiratory_rate: "TEXT NOT NULL",
      height_cm: "TEXT NOT NULL",
      weight_kg: "TEXT NOT NULL",
      bmi: "TEXT NOT NULL",
      oxygen_saturation: "TEXT NOT NULL",
      pain_score: "TEXT NOT NULL",
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
      appointment_id VARCHAR(255) REFERENCES appointments(appointment_id),
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
      appointment_id: "VARCHAR(255) REFERENCES appointments(appointment_id)",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      created_by: "VARCHAR(255) REFERENCES users(user_id)",
      consultation_date: "DATE NOT NULL",
      notes: "TEXT NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "health_background",
    createSQL: `CREATE TABLE IF NOT EXISTS health_background (
      id                        SERIAL PRIMARY KEY,
      record_id                 VARCHAR(255) UNIQUE NOT NULL,
      appointment_id VARCHAR(255) REFERENCES appointments(appointment_id),
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
      appointment_id: "VARCHAR(255) REFERENCES appointments(appointment_id)",
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
      appointment_id VARCHAR(255) REFERENCES appointments(appointment_id),
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
      appointment_id: "VARCHAR(255) REFERENCES appointments(appointment_id)",
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

export async function connectNeon() {
  try {
    await sql`
      DO $$
      BEGIN
        IF to_regclass('public.health_background') IS NULL
          AND to_regclass('public.medical_histories') IS NOT NULL THEN
          ALTER TABLE medical_histories RENAME TO health_background;
        END IF;
      END $$;
    `;

    for (const { createSQL } of TABLES) {
      await sql.query(createSQL);
    }
    // Preserve access for existing accounts; newly provisioned accounts must
    // confirm their email and choose a password. Tokens contain SHA-256 hashes.
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE`;
    await sql`ALTER TABLE users ALTER COLUMN is_verified SET DEFAULT FALSE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_verification_token_idx ON users (verification_token) WHERE verification_token IS NOT NULL`;
    await sql`ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'confirmed'`;
    await sql`UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE status = 'pending'`;
    for (const table of ["health_assessments", "vital_signs", "midwife_notes", "health_background", "allergies"]) {
      await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(255) REFERENCES appointments(appointment_id)`);
      await sql.query(`CREATE INDEX IF NOT EXISTS ${table}_appointment_idx ON ${table} (patient_id, appointment_id)`);
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
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS place_of_birth_data JSONB`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100)`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_by VARCHAR(255) REFERENCES users(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS patients_active_name_idx ON patients (last_name, first_name) WHERE archived_at IS NULL`;
    await sql`ALTER TABLE patients DROP COLUMN IF EXISTS philhealth_number`;

    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS temperature TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pulse_rate TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS respiratory_rate TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS height_cm TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight_kg TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bmi TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_saturation TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_score TEXT`;
    await sql`ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP`;
    await sql`
      DO $$
      DECLARE
        column_to_convert TEXT;
      BEGIN
        FOR column_to_convert IN
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'vital_signs'
            AND column_name = ANY (ARRAY[
              'blood_pressure', 'temperature', 'pulse_rate', 'respiratory_rate',
              'height_cm', 'weight_kg', 'bmi', 'oxygen_saturation', 'pain_score'
            ])
            AND data_type <> 'text'
        LOOP
          EXECUTE format(
            'ALTER TABLE vital_signs ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
            column_to_convert,
            column_to_convert
          );
        END LOOP;
      END $$;
    `;
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
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'vital_signs'
            AND column_name = 'tested_at'
        ) THEN
          ALTER TABLE vital_signs ALTER COLUMN tested_at DROP NOT NULL;
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

    await sql`ALTER TABLE health_background ADD COLUMN IF NOT EXISTS past_illnesses TEXT`;
    await sql`ALTER TABLE health_background ADD COLUMN IF NOT EXISTS chronic_conditions TEXT`;
    await sql`ALTER TABLE health_background ADD COLUMN IF NOT EXISTS past_surgeries TEXT`;
    await sql`ALTER TABLE health_background ADD COLUMN IF NOT EXISTS previous_hospitalizations TEXT`;
    await sql`ALTER TABLE health_background ADD COLUMN IF NOT EXISTS family_medical_history TEXT`;
    await sql`ALTER TABLE health_background ADD COLUMN IF NOT EXISTS immunization_status VARCHAR(100)`;
    await sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'health_background'
            AND column_name = 'condition'
        ) THEN
          ALTER TABLE health_background ALTER COLUMN condition DROP NOT NULL;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'health_background'
            AND column_name = 'recorded_at'
        ) THEN
          ALTER TABLE health_background ALTER COLUMN recorded_at DROP NOT NULL;
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

    await sql`UPDATE users SET role = 'admin' WHERE role = 'midwife'`;

    const optionSeeds = {
      appointment_reasons: [
        "General Checkup", "Prenatal Checkup", "Postnatal Checkup",
        "Child Wellness Checkup", "Vaccination", "Immunization",
        "Family Planning", "Maternal Health Consultation",
        "Blood Pressure Monitoring", "Diabetes Monitoring",
        "Medical Consultation", "Circumcision", "Others",
      ],
      health_conditions: [
        "No Known Condition", "Hypertension", "Diabetes", "Asthma",
        "Dengue", "Tuberculosis", "Malnutrition", "Anemia",
        "Respiratory Infection", "Skin Infection",
        "Gastrointestinal Infection", "Pregnancy", "Other",
      ],
      allergy_reactions: [
        "Rash", "Itching", "Swelling", "Hives", "Shortness of Breath",
        "Nausea or Vomiting", "Anaphylaxis", "Other",
      ],
      medication_allergies: [
        "Penicillin", "Amoxicillin", "Sulfa Drugs", "Aspirin",
        "Ibuprofen", "Paracetamol", "Acetaminophen", "Other",
      ],
      food_allergies: [
        "Peanuts", "Tree Nuts", "Shrimp", "Milk", "Eggs", "Fish",
        "Shellfish", "Wheat", "Soy", "Other",
      ],
      environmental_allergies: [
        "Dust", "Dust Mites", "Pollen", "Mold", "Pet Dander",
        "Insect Bites", "Latex", "Other",
      ],
      immunization_statuses: [
        "Up to Date", "Partially Immunized", "Not Immunized", "Unknown", "Other",
      ],
    };

    for (const [optionKey, values] of Object.entries(optionSeeds)) {
      const existing = await sql`
        SELECT id, value
        FROM health_option_values
        WHERE option_key = ${optionKey}
      `;
      const normalize = (value) => {
        const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
        return optionKey === "appointment_reasons" && normalized === "other"
          ? "others"
          : normalized;
      };

      for (const [sortOrder, value] of values.entries()) {
        const matching = existing.filter((row) => normalize(row.value) === normalize(value));
        const canonical = matching.find((row) => row.value === value);
        const primary = canonical || matching[0];

        if (primary) {
          await sql`
            UPDATE health_option_values
            SET value = ${value}, sort_order = ${sortOrder}, active = TRUE
            WHERE id = ${primary.id}
          `;
          for (const duplicate of matching) {
            if (duplicate.id !== primary.id) {
              await sql`UPDATE health_option_values SET active = FALSE WHERE id = ${duplicate.id}`;
            }
          }
        } else {
          await sql`
            INSERT INTO health_option_values (option_key, value, sort_order)
            VALUES (${optionKey}, ${value}, ${sortOrder})
            ON CONFLICT (option_key, value) DO UPDATE
            SET sort_order = EXCLUDED.sort_order, active = TRUE
          `;
        }
      }
    }

    await sql`
      UPDATE appointments AS appointment
      SET reason = options.value, updated_at = NOW()
      FROM health_option_values AS options
      WHERE options.option_key = 'appointment_reasons'
        AND options.active = TRUE
        AND CASE
          WHEN regexp_replace(lower(trim(appointment.reason)), '[^a-z0-9]', '', 'g') = 'other'
            THEN 'others'
          ELSE regexp_replace(lower(trim(appointment.reason)), '[^a-z0-9]', '', 'g')
        END = regexp_replace(lower(options.value), '[^a-z0-9]', '', 'g')
        AND appointment.reason IS DISTINCT FROM options.value
    `;

    console.log("[db] Database initialized successfully");
  } catch (error) {
    console.error("[db] Error initializing DB:", error);
    throw error;
  }
}

export async function syncSchema(onlyTables) {
  try {
    console.log("[schema-sync] starting...");


    const configuredTables = onlyTables
      ? TABLES.filter((table) => onlyTables.includes(table.table))
      : TABLES;

    const configuredTableNames = configuredTables.map((table) => table.table);


    const existingTableRows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    const existingTableNames = existingTableRows.map((row) => row.table_name);


    const tablesToDrop = existingTableNames.filter(
      (tableName) => !configuredTableNames.includes(tableName)
    );

    for (const tableName of tablesToDrop) {
      console.log(`[schema-sync] dropping extra table "${tableName}"`);
      await sql.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }


    for (const tableDefinition of configuredTables) {
      const { table: tableName, createSQL, columns: desiredColumns } = tableDefinition;

      if (!existingTableNames.includes(tableName)) {
        console.log(`[schema-sync] ${tableName}: table does not exist, creating...`);
        await sql.query(createSQL);
        console.log(`[schema-sync] ${tableName}: created`);
        continue;
      }

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

      for (const columnName of columnsToAdd) {
        const definition = desiredColumns[columnName];

        console.log(`[schema-sync] ${tableName}: adding column "${columnName}"`);

        const isNotNull = /\bNOT\s+NULL\b/i.test(definition);
        const hasDefault = /\bDEFAULT\b/i.test(definition);

        if (isNotNull && hasDefault) {
          await sql.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
          continue;
        }

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

        await sql.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
      }

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
