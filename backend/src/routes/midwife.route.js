import { Router } from "express";
import {
  getAggregateReport,
  getAppointments,
  getConditionPatients,
  getDashboard,
  getReports,
} from "../controllers/admin/getRequests.controller.js";

const router = Router();

router.get("/dashboard", getDashboard);
router.get("/appointments", getAppointments);
router.get("/reports", getReports);
router.get("/reports/aggregate", getAggregateReport);
router.get("/reports/conditions/:condition/patients", getConditionPatients);

export default router;
