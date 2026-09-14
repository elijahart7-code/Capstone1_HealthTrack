/**
 * Optional demo-data seed, run with: npm run seed.
 *
 * This script creates a few demo accounts for local testing and development.
 * Every seeded account uses the password "password" and is intended only for
 * local/demo use, never for a real deployment.
 */
import bcrypt from "bcryptjs";
import { connectNeon, sql } from "../config/db.js";
import { generatePatientId, generateUserId } from "../utils/generateId.js";

async function main() {
  await connectNeon();
  const password = await bcrypt.hash("password", 10);

  const adminId = await generateUserId();
  await sql`
    INSERT INTO users (user_id, name, email, password, role)
    VALUES (${adminId}, 'Admin User', 'admin@healthtrack.test', ${password}, 'admin')
    ON CONFLICT (email) DO NOTHING
  `;

  const hwId = await generateUserId();
  await sql`
    INSERT INTO users (user_id, name, email, password, role)
    VALUES (${hwId}, 'Health Worker User', 'healthworker@healthtrack.test', ${password}, 'health_worker')
    ON CONFLICT (email) DO NOTHING
  `;

  const patientUserId = await generateUserId();
  await sql`
    INSERT INTO users (user_id, name, email, password, role)
    VALUES (${patientUserId}, 'Juan Dela Cruz', 'patient@healthtrack.test', ${password}, 'patient')
    ON CONFLICT (email) DO NOTHING
  `;

  const patientId = await generatePatientId();
  await sql`
    INSERT INTO patients (
      patient_id, user_id, first_name, middle_name, last_name, sex, birthdate,
      civil_status, blood_type, occupation, barangay_id_number, contact_number,
      address, emergency_contact_name, emergency_contact_number
    ) VALUES (
      ${patientId}, ${patientUserId}, 'Juan', 'Santos', 'Dela Cruz', 'male', '1991-04-17',
      'married', 'O+', 'Driver', 'BRGY-0001', '09171234567',
      'Mambog I, Bacoor, Cavite', 'Maria Dela Cruz', '09179876543'
    )
    ON CONFLICT DO NOTHING
  `;

  const demoPatients = [
    {
      firstName: "Karli",
      middleName: "",
      lastName: "Bogisich",
      sex: "female",
      birthdate: "2018-03-10",
      civilStatus: "single",
      bloodType: "O+",
      occupation: "Student",
      contactNumber: "0923 109 1552",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Romaine",
      middleName: "",
      lastName: "Fisher",
      sex: "female",
      birthdate: "1977-08-14",
      civilStatus: "married",
      bloodType: "B+",
      occupation: "Housewife",
      contactNumber: "0956 629 2394",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Darwin",
      middleName: "Gerlach",
      lastName: "Gusikowski",
      sex: "male",
      birthdate: "1998-07-18",
      civilStatus: "single",
      bloodType: "O+",
      occupation: "IT Specialist",
      contactNumber: "0922 406 6680",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Ernest",
      middleName: "Bashirian",
      lastName: "Hartmann",
      sex: "female",
      birthdate: "2008-11-22",
      civilStatus: "single",
      bloodType: "A+",
      occupation: "Student",
      contactNumber: "0965 431 3635",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Joshua",
      middleName: "",
      lastName: "Heidenreich",
      sex: "female",
      birthdate: "1980-01-12",
      civilStatus: "married",
      bloodType: "B+",
      occupation: "Sales Associate",
      contactNumber: "0980 084 5191",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Johnny",
      middleName: "",
      lastName: "Hermann",
      sex: "male",
      birthdate: "1967-04-03",
      civilStatus: "married",
      bloodType: "O+",
      occupation: "Retired",
      contactNumber: "0960 892 4385",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Ulises",
      middleName: "",
      lastName: "Kuhn",
      sex: "male",
      birthdate: "1950-05-20",
      civilStatus: "married",
      bloodType: "A-",
      occupation: "Farmer",
      contactNumber: "0955 531 1547",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Michaela",
      middleName: "",
      lastName: "Littel",
      sex: "male",
      birthdate: "1999-09-07",
      civilStatus: "single",
      bloodType: "B+",
      occupation: "Engineer",
      contactNumber: "0919 834 3429",
      address: "Mambog I, Bacoor, Cavite",
    },
    {
      firstName: "Janice",
      middleName: "",
      lastName: "Littel",
      sex: "male",
      birthdate: "2007-12-01",
      civilStatus: "single",
      bloodType: "O-",
      occupation: "Student",
      contactNumber: "0936 931 9149",
      address: "Mambog I, Bacoor, Cavite",
    },
  ];

  for (const patient of demoPatients) {
    const existing = await sql`
      SELECT patient_id
      FROM patients
      WHERE first_name = ${patient.firstName}
        AND last_name = ${patient.lastName}
      LIMIT 1
    `;

    if (existing.length > 0) continue;

    const patientId = await generatePatientId();
    await sql`
      INSERT INTO patients (
        patient_id, first_name, middle_name, last_name, sex, birthdate,
        civil_status, blood_type, occupation, contact_number, address
      ) VALUES (
        ${patientId}, ${patient.firstName}, ${patient.middleName || null}, ${patient.lastName},
        ${patient.sex}, ${patient.birthdate}, ${patient.civilStatus}, ${patient.bloodType},
        ${patient.occupation}, ${patient.contactNumber}, ${patient.address}
      )
    `;
  }

  console.log('Seeded accounts (password: "password"):');
  console.log("  admin@healthtrack.test          -- Admin");
  console.log("  healthworker@healthtrack.test  -- Health Worker");
  console.log("  patient@healthtrack.test       -- Patient");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
