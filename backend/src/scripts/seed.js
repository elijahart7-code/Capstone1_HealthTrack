/**
 * Optional demo-data seed, run with: npm run seed.
 *
 * This script creates a few demo accounts for local testing and development.
 * Every seeded account uses the password "password" and is intended only for
 * local/demo use, never for a real deployment.
 */
import bcrypt from "bcryptjs";
import { connectNeon, sql } from "../config/db.js";
import { generateUserId } from "../utils/generateId.js";

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

  console.log('Seeded accounts (password: "password"):');
  console.log("  admin@healthtrack.test          -- Admin");
  console.log("  healthworker@healthtrack.test  -- Health Worker");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
