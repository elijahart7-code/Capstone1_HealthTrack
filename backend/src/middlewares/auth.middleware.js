import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";
import { ENV } from "../config/env.js";

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, ENV.JWT_SECRET);

    const rows = await sql`
      SELECT id, user_id, name, email, role FROM users WHERE user_id = ${payload.user_id}
    `;

    if (rows.length === 0) {
      return res.status(401).json({ error: "Account no longer exists." });
    }

    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this section." });
    }
    next();
  };
}
