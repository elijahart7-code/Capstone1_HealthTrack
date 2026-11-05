import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export function sessionForUser(user) {
  return {
    token: jwt.sign({ user_id: user.user_id }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN }),
    user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
  };
}
