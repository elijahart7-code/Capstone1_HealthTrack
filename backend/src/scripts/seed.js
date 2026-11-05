import bcrypt from "bcryptjs";
import { connectNeon, sql } from "../config/db.js";
import { generateUserId } from "../utils/generateId.js";

async function main() {
  await connectNeon();
  const password = await bcrypt.hash("password", 10);

  const adminId = await generateUserId();
  await sql`
    INSERT INTO users (user_id, name, email, password, role, is_verified)
    VALUES (${adminId}, 'Admin User', 'admin@healthtrack.test', ${password}, 'admin', TRUE)
    ON CONFLICT (email) DO NOTHING
  `;

  const hwId = await generateUserId();
  await sql`
    INSERT INTO users (user_id, name, email, password, role, is_verified)
    VALUES (${hwId}, 'Health Worker User', 'healthworker@healthtrack.test', ${password}, 'health_worker', TRUE)
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
