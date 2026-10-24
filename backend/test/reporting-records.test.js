import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function controller(path, context) {
  const source = (await readFile(new URL(`../src/controllers/${path}`, import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/export /g, '');
  return vm.runInNewContext(`${source}\n;({ ${context.names.join(',')} });`, context);
}
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } }; }

test('reports preserve patient/follow-up meanings and include hourly buckets without top-eight truncation', async () => {
  const calls = [];
  const resultSets = [[], [], [], [], [{ patient_id: 'P1', appointment_count: 3 }], [{ patient_id: 'P2', condition: 'Hypertension' }]];
  const { getReports } = await controller('admin/getRequests.controller.js', { names: ['getReports'], sql: { query: async (query, params) => { calls.push({query, params}); return resultSets[calls.length - 1]; } } });
  const res = response();
  await getReports({ query: { period: 'hour', from: '2026-10-24', to: '2026-10-24' } }, res);
  assert.equal(res.data.patients[0].appointment_count, 3);
  assert.equal(res.data.followUps[0].condition, 'Hypertension');
  assert.match(calls[0].query, /INTERVAL '1 hour'/);
  assert.match(calls[0].query, /INTERVAL '1 second'/);
  assert.ok(calls.every(c => !/LIMIT (8|10)\b/.test(c.query)));
  assert.deepEqual(Array.from(calls[5].params), ['2026-10-24', '2026-10-24']);
  assert.match(calls[5].query, /NOT EXISTS/);
});

test('clinical record listing binds selected appointment instead of mixing all visits', async () => {
  const calls = [];
  const { getClinicalRecords } = await controller('patients/getRequests.controller.js', { names: ['getClinicalRecords'], isRecordType: () => true, RECORD_TYPES: { 'vital-signs': { table: 'vital_signs', dateField: 'recorded_at' } }, sql: { query: async (query, params) => { calls.push({query, params}); return calls.length === 1 ? [{ patient_id: 'P1' }] : []; } } });
  await getClinicalRecords({ params: { patientId: 'P1', type: 'vital-signs' }, query: { appointmentId: 'APT1', perPage: '20' }, user: { role: 'admin' } }, response());
  assert.match(calls[1].query, /appointment_id = \$3/);
  assert.deepEqual(Array.from(calls[1].params), ['P1', 20, 'APT1']);
});

test('record creation rejects an appointment belonging to another patient', async () => {
  let calls = 0;
  const sql = async () => (++calls === 1 ? [{ patient_id: 'P1' }] : []);
  sql.query = async () => { throw new Error('Must not insert'); };
  const { createClinicalRecord } = await controller('patients/postRequests.controller.js', { names: ['createClinicalRecord'], sql, isRecordType: () => true, ClinicalRecordPolicy: { create: () => true }, RECORD_TYPES: { notes: { table: 'midwife_notes', dateLabel: 'Date', fields: {} } } });
  const res = response();
  await createClinicalRecord({ params: { patientId: 'P1', type: 'notes' }, body: { recordDate: '2026-10-24', appointmentId: 'OTHER' }, user: { user_id: 'U1' } }, res);
  assert.equal(res.code, 422);
  assert.match(res.data.error, /does not belong/);
});

test('new records persist their appointment association using bound parameters', async () => {
  let calls = 0; let inserted;
  const sql = async () => (++calls === 1 ? [{ patient_id: 'P1' }] : [{ appointment_id: 'APT1' }]);
  sql.query = async (query, params) => { inserted = {query, params}; return [{ record_id: 'REC1' }]; };
  const { createClinicalRecord } = await controller('patients/postRequests.controller.js', { names: ['createClinicalRecord'], sql, generateRecordId: async () => 'REC1', isRecordType: () => true, ClinicalRecordPolicy: { create: () => true }, RECORD_TYPES: { notes: { table: 'midwife_notes', dateField: 'consultation_date', dateLabel: 'Date', fields: { notes: { required: true } } } } });
  const res = response();
  await createClinicalRecord({ params: { patientId: 'P1', type: 'notes' }, body: { recordDate: '2026-10-24', appointmentId: 'APT1', notes: 'Follow up' }, user: { user_id: 'U1' } }, res);
  assert.equal(res.code, 201);
  assert.match(inserted.query, /patient_id, appointment_id, created_by/);
  assert.deepEqual(Array.from(inserted.params), ['REC1', 'P1', 'APT1', 'U1', 'Follow up', '2026-10-24']);
});


test('appointment status updates allow confirmed/cancelled and block manual completion', async () => {
  const { updateAppointmentStatus } = await controller('patients/updateRequests.controller.js', {
    names: ['updateAppointmentStatus'], AppointmentPolicy: { update: () => true },
    sql: async () => [{ appointment_id: 'APT1' }],
  });
  for (const status of ['confirmed', 'cancelled']) {
    const res = response();
    await updateAppointmentStatus({ user: {}, params: { appointmentId: 'APT1' }, body: { status } }, res);
    assert.equal(res.code, 200);
  }
  const res = response();
  await updateAppointmentStatus({ user: {}, params: { appointmentId: 'APT1' }, body: { status: 'pending' } }, res);
  assert.equal(res.code, 422);
  const completed = response();
  await updateAppointmentStatus({ user: {}, params: { appointmentId: 'APT1' }, body: { status: 'completed' } }, completed);
  assert.equal(completed.code, 422);
  assert.match(completed.data.error, /Finish recording/);
});

test('new appointments default to confirmed and reject pending', async () => {
  let inserted;
  const { createAppointment } = await controller('patients/postRequests.controller.js', {
    names: ['createAppointment'], AppointmentPolicy: { create: () => true },
    generateAppointmentId: async () => 'APT1',
    sql: async (strings, ...values) => {
      if (strings.join('').includes('INSERT')) { inserted = values; return [{ appointment_id: 'APT1' }]; }
      return [{ patient_id: 'P1' }];
    },
  });
  const req = { user: { user_id: 'U1' }, params: { patientId: 'P1' }, body: { scheduledAt: '2026-10-24T09:00', reason: 'Consultation' } };
  const res = response();
  await createAppointment(req, res);
  assert.equal(res.code, 201);
  assert.equal(inserted.at(-1), 'confirmed');
  const invalid = response();
  await createAppointment({ ...req, body: { ...req.body, status: 'pending' } }, invalid);
  assert.equal(invalid.code, 422);
});

test('recording validates all sections before writing and saves valid sections in one statement', async () => {
  const statements = [];
  const context = {
    names: ['createAppointmentRecords'], ClinicalRecordPolicy: { create: () => true },
    isRecordType: type => ['notes', 'assessment'].includes(type),
    RECORD_TYPES: {
      notes: { table: 'midwife_notes', label: 'Notes', dateLabel: 'Date', dateField: 'consultation_date', fields: { notes: { required: true, label: 'Notes', type: 'text' } } },
      assessment: { table: 'health_assessments', label: 'Assessment', dateLabel: 'Date', dateField: 'assessment_date', fields: { condition: { required: true, label: 'Condition', type: 'text' } } },
    },
    generateRecordId: async table => table + '-1',
    sql: { query: async (query, params) => { statements.push({ query, params }); return [{ eligible: 1, finished: 1 }]; } },
  };
  const { createAppointmentRecords } = await controller('patients/postRequests.controller.js', context);
  const req = { user: { user_id: 'U1' }, params: { patientId: 'P1', appointmentId: 'APT1' } };
  const invalid = response();
  await createAppointmentRecords({ ...req, body: { records: { notes: { notes: 'Draft', recordDate: '2026-10-24' }, assessment: { recordDate: '2026-10-24' } } } }, invalid);
  assert.equal(invalid.code, 422);
  assert.equal(statements.length, 0);
  const res = response();
  await createAppointmentRecords({ ...req, body: { records: { notes: { notes: 'Draft', recordDate: '2026-10-24' }, assessment: { condition: 'Monitoring', recordDate: '2026-10-24' } } } }, res);
  assert.equal(res.code, 201);
  assert.equal(res.data.sectionsSaved, 2);
  assert.equal(res.data.appointmentStatus, 'completed');
  assert.equal(statements.length, 1);
  assert.match(statements[0].query, /saved_0 AS \(INSERT INTO midwife_notes/);
  assert.match(statements[0].query, /saved_1 AS \(INSERT INTO health_assessments/);
  assert.match(statements[0].query, /FOR UPDATE OF a, p/);
  assert.ok(statements[0].params.includes('Draft'));
  assert.match(statements[0].query, /finished AS \(UPDATE appointments SET status = 'completed'/);
});

test('recording refuses an ineligible appointment and preserves the draft', async () => {
  const { createAppointmentRecords } = await controller('patients/postRequests.controller.js', {
    names: ['createAppointmentRecords'], ClinicalRecordPolicy: { create: () => true },
    isRecordType: () => true,
    RECORD_TYPES: { notes: { table: 'midwife_notes', label: 'Notes', dateLabel: 'Date', dateField: 'consultation_date', fields: { notes: { required: true, label: 'Notes', type: 'text' } } } },
    generateRecordId: async () => 'NOTE1', sql: { query: async () => [{ eligible: 0 }] },
  });
  const res = response();
  await createAppointmentRecords({ user: { user_id: 'U1' }, params: { patientId: 'P1', appointmentId: 'OTHER' }, body: { records: { notes: { notes: 'Draft', recordDate: '2026-10-24' } } } }, res);
  assert.equal(res.code, 409);
});


test('report summary is returned independently from row lists and uses bound date ranges', async () => {
  const statements = [];
  const summary = { appointments: 12, completed: 8, patients_served: 5, overdue: 2 };
  const { getReports } = await controller('admin/getRequests.controller.js', { names: ['getReports'], sql: { query: async (query, params) => { statements.push({query, params}); return statements.length === 7 ? [summary] : []; } } });
  const res = response();
  await getReports({ query: { from: '2026-10-01', to: '2026-10-24', period: 'day' } }, res);
  assert.equal(res.data.summary.appointments, 12);
  assert.equal(res.data.summary.patients_served, 5);
  assert.deepEqual(Array.from(statements[6].params), ['2026-10-01', '2026-10-24']);
  assert.match(statements[6].query, /COUNT\(DISTINCT a.patient_id\) FILTER \(WHERE a.status = 'completed'\)/);
  assert.match(statements[6].query, /previous_appointments/);
  assert.match(statements[6].query, /Asia\/Manila/);
  assert.match(statements[6].query, /r.patient_id = a.patient_id AND r.appointment_id = a.appointment_id/);
});


test('recording rejects entirely omitted required clinical sections before any write', async () => {
  const { createAppointmentRecords } = await controller('patients/postRequests.controller.js', {
    names: ['createAppointmentRecords'], ClinicalRecordPolicy: { create: () => true },
    isRecordType: () => true,
    RECORD_TYPES: { notes: { fields: {} }, vitals: { fields: {} } },
    generateRecordId: async () => { throw new Error('Must not generate IDs'); },
    sql: { query: async () => { throw new Error('Must not write'); } },
  });
  const res = response();
  await createAppointmentRecords({ user: {}, params: {}, body: { records: { notes: { recordDate: '2026-10-24', notes: 'Partial' } } } }, res);
  assert.equal(res.code, 422);
  assert.match(res.data.error, /all required clinical sections/);
});
