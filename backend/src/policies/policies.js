
const isStaff = (user) => user.role === "admin" || user.role === "health_worker";
const isAdmin = (user) => user.role === "admin";
const isHealthWorker = (user) => user.role === "health_worker";

export const PatientPolicy = {
  viewAny: (user) => isStaff(user),

  view: (user, patient) => isStaff(user) || patient.user_id === user.user_id,

  create: (user) => isStaff(user),

  register: (user) => isHealthWorker(user),

  createAccount: (user) => isStaff(user),

  update: (user) => isAdmin(user),

  delete: (user) => isAdmin(user),
};

export const AppointmentPolicy = {
  viewAny: (user) => isStaff(user),

  view: (user, appointment) => isStaff(user) || appointment.patient_user_id === user.user_id,

  create: (user) => isAdmin(user),

  update: (user) => isAdmin(user),

  delete: (user) => isAdmin(user),
};

export const ClinicalRecordPolicy = {
  view: (user, record) => isStaff(user) || record.patient_user_id === user.user_id,

  create: (user) => isAdmin(user),

  update: (user) => isAdmin(user),

  delete: (user) => isAdmin(user),
};
