import { Router } from "express";
import {
  getAllPatients,
  getClinicalRecords,
  getPatient,
  getPatientAppointments,
  getRecordTypes,
} from "../controllers/patients/getRequests.controller.js";
import {
  createAppointment,
  createClinicalRecord,
  createPortalAccount,
  registerPatient,
} from "../controllers/patients/postRequests.controller.js";
import { updateClinicalRecord, updatePatient } from "../controllers/patients/updateRequests.controller.js";
import { deleteClinicalRecord, deletePatient } from "../controllers/patients/deleteRequest.controller.js";

/**
 * Shared by admin and health worker roles. The route group handles the
 * registry workflow while each controller enforces role-specific rules via
 * policies/policies.js.
 */
const router = Router();

router.get("/record-types", getRecordTypes);
router.get("/", getAllPatients);
router.post("/", registerPatient);
router.get("/:patientId", getPatient);
router.patch("/:patientId", updatePatient);
router.delete("/:patientId", deletePatient);

router.get("/:patientId/appointments", getPatientAppointments);
router.post("/:patientId/appointments", createAppointment);

router.post("/:patientId/portal-account", createPortalAccount);

router.get("/:patientId/records/:type", getClinicalRecords);
router.post("/:patientId/records/:type", createClinicalRecord);
router.patch("/:patientId/records/:type/:recordId", updateClinicalRecord);
router.delete("/:patientId/records/:type/:recordId", deleteClinicalRecord);

export default router;
