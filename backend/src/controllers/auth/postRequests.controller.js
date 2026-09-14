import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../../config/db.js";
import { ENV } from "../../config/env.js";

/**
 * POST /api/auth/login
 *
 * Login only -- staff account registration and password resets are handled by
 * admin setup and patient portal accounts are created from the patient record
 * screen. This app does not expose a public sign-up route.
 */
export async function login(req, res) {
  const { email, password, accountType } = req.body;

  console.log(`[AUTH] Login attempt: ${email || "No email provided"}`);

  const roleByAccountType = {
    patient: "patient",
    health_worker: "health_worker",
    admin: "admin",
  };
  const expectedRole = roleByAccountType[accountType];

  if (!email || !password || !expectedRole) {
    console.warn(`[AUTH] Login failed: Missing email or password`);

    return res.status(422).json({
      error: "Choose a valid account type and enter your email and password.",
    });
  }

  try {
    console.log(`[AUTH] Looking up user: ${email}`);

    const rows = await sql`
      SELECT id, user_id, name, email, password, role
      FROM users
      WHERE email = ${email}
    `;

    const user = rows[0];

    if (!user) {
      console.warn(`[AUTH] Login failed: User not found - ${email}`);

      return res.status(401).json({
        error: "Those credentials don't match our records.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.warn(`[AUTH] Login failed: Invalid password - ${email}`);

      return res.status(401).json({
        error: "Those credentials don't match our records.",
      });
    }

    if (user.role !== expectedRole) {
      console.warn(
        `[AUTH] Login failed: Account type mismatch for ${email} (selected=${accountType}, actual=${user.role})`
      );
      return res.status(401).json({
        error: "Those credentials do not match the selected account type.",
      });
    }

    console.log(
      `[AUTH] Login successful: ${user.email} | user_id=${user.user_id} | role=${user.role}`
    );

    const token = jwt.sign(
      { user_id: user.user_id },
      ENV.JWT_SECRET,
      {
        expiresIn: ENV.JWT_EXPIRES_IN,
      }
    );

    console.log(`[AUTH] JWT generated for user_id=${user.user_id}`);

    return res.status(200).json({
      message: "Logged in.",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[AUTH] Login error for ${email}:`, error);

    return res.status(500).json({
      error: "An internal server error occurred.",
    });
  }
}