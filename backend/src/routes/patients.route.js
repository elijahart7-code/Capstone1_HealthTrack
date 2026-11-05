import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  getAllPatients,
  getClinicalRecords,
  getPatient,
  getPatientAppointments,
  getRecordTypes,
} from "../controllers/patients/getRequests.controller.js";
import {
  createAppointment,
  createAppointmentRecords,
  createClinicalRecord,
  createPortalAccount,
  registerPatient,
} from "../controllers/patients/postRequests.controller.js";
import { updateClinicalRecord, updatePatient, updatePendingPortalEmail } from "../controllers/patients/updateRequests.controller.js";
import { archivePatient, deleteClinicalRecord, restorePatient } from "../controllers/patients/deleteRequest.controller.js";
import { getHealthOptions } from "../controllers/options.controller.js";

const router = Router();

router.get("/record-types", getRecordTypes);
router.get("/options", getHealthOptions);
router.get("/", getAllPatients);
router.post("/", registerPatient);
router.get("/:patientId", getPatient);
router.patch("/:patientId", updatePatient);
router.post("/:patientId/archive", archivePatient);
router.post("/:patientId/restore", restorePatient);

router.get("/:patientId/appointments", getPatientAppointments);
router.post("/:patientId/appointments", createAppointment);
router.post("/:patientId/appointments/:appointmentId/records", createAppointmentRecords);

router.post("/:patientId/portal-account", createPortalAccount);
router.patch("/:patientId/portal-account/email", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.user_id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many email corrections. Try again in 15 minutes." },
}), updatePendingPortalEmail);

router.get("/:patientId/records/:type", getClinicalRecords);
router.post("/:patientId/records/:type", createClinicalRecord);
router.patch("/:patientId/records/:type/:recordId", updateClinicalRecord);
router.delete("/:patientId/records/:type/:recordId", deleteClinicalRecord);

export default router;
