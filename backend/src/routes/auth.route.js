import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { completeAccount, initiateAccount, login } from "../controllers/auth/postRequests.controller.js";

const router = Router();

const limit = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: max,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: message },
});

router.post("/login", limit(30, "Too many sign-in attempts. Try again in 15 minutes."), login);
router.post("/initiate", limit(10, "Too many setup requests. Try again in 15 minutes."), initiateAccount);
router.post("/complete", limit(20, "Too many setup attempts. Try again in 15 minutes."), completeAccount);

export default router;
