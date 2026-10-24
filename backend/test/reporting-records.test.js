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
