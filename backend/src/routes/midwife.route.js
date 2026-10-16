import { Router } from "express";
import {
  getAppointments,
  getDashboard,
  getReports,
} from "../controllers/admin/getRequests.controller.js";

const router = Router();

router.get("/dashboard", getDashboard);
router.get("/appointments", getAppointments);
router.get("/reports", getReports);

export default router;
