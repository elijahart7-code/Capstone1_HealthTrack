import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { MessageChannel as NodeMessageChannel } from 'node:worker_threads';

// Browser-bundled React act() schedules tasks through MessageChannel. Close its
// ports after the suite so Node can exit cleanly.
const channels = [];
const originalMessageChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NodeMessageChannel {
  constructor() { super(); channels.push(this); }
};

// Exercise the real React screens and query-param navigation without a browser
// or a live patient database. Only the API transport is replaced with fixtures.
const frontend = fileURLToPath(new URL('..', import.meta.url));
const scratch = await mkdtemp(path.join(tmpdir(), 'healthtrack-ui-'));
const dom = new JSDOM('<div id="root"></div>', { url: 'http://healthtrack-test.invalid/admin' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'Node', 'Event', 'MouseEvent', 'localStorage']) globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
const outfile = path.join(scratch, 'ui.mjs');
await build({
  stdin: { contents: `
    export { AdminShell } from './src/users/admin/AdminShell.jsx';
    export { api } from './src/lib/axios.js';
    export { ReportInsights } from './src/shared/ReportInsights.jsx';
    export { RECORD_TYPES } from './src/config/recordTypes.js';
    export { createRoot } from 'react-dom/client';
    export { MemoryRouter } from 'react-router';
    export { createElement as h, act } from 'react';
  `, resolveDir: frontend, loader: 'jsx' },
  bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', outfile,
  define: { 'import.meta.env.VITE_API_BASE_URL': '"/api"', 'process.env.NODE_ENV': '"development"' },
});
const { AdminShell, api, RECORD_TYPES, ReportInsights, createRoot, MemoryRouter, h, act } = await import(pathToFileURL(outfile));
const patient = { patient_id: 'P1', full_name: 'Test Patient', first_name: 'Test', last_name: 'Patient', sex: 'female', birthdate: '1990-01-01', address: 'Test address' };
const appointment = { appointment_id: 'A1', patient_id: 'P1', first_name: 'Test', last_name: 'Patient', scheduled_at: new Date().toISOString(), reason: 'Consultation', notes: 'Follow-up requested', status: 'confirmed' };
let appointments;
let root;
let posted;
let patched;
let rejectStatus;
let rejectRecording;
function fixtureRecord(type) {
  const def = RECORD_TYPES[type];
  return { record_id: type, appointment_id: 'A1', [def.dateField]: '2026-10-24', ...Object.fromEntries(Object.entries(def.fields).map(([key, field]) => [key, field.type === 'number' ? 1 : field.type === 'select' ? Object.keys(field.options)[0] : 'Sample clinical information'])) };
}
async function mount(url = '/admin', extraAppointments = []) {
  posted = []; patched = []; rejectStatus = false; rejectRecording = false;
  appointments = [appointment, ...extraAppointments];
  api.get = async (url, config) => {
    if (url === '/admin/dashboard') return { data: { patientCount: 1, appointmentsToday: 1, upcomingCount: 1, todaysAppointments: [appointment] } };
    if (url === '/patients') return { data: { patients: [patient] } };
    if (url === '/admin/appointments' || url === '/patients/P1/appointments') return { data: { appointments } };
    if (url === '/patients/P1') return { data: { patient } };
    if (url === '/patients/options') return { data: { options: {} } };
    if (url.startsWith('/admin/reports?')) {
      const params = new URLSearchParams(url.split('?')[1]);
      const daily = params.get('period') === 'hour';
      const total = daily ? 4 : 15;
      const fromDate = new Date(params.get('from') + 'T00:00:00Z');
      const days = Math.round((new Date(params.get('to') + 'T00:00:00Z') - fromDate) / 86400000) + 1;
      const previousFrom = new Date(fromDate.getTime() - days * 86400000).toISOString().slice(0, 10);
      const previousTo = new Date(fromDate.getTime() - 86400000).toISOString().slice(0, 10);
      return { data: {
        filters: { from: params.get('from'), to: params.get('to'), period: params.get('period') },
        trend: [{ period: daily ? `${params.get('from')}T09:00:00` : '2026-10-22T00:00:00', total: daily ? 1 : 3, completed: daily ? 0 : 2 }, { period: daily ? `${params.get('from')}T10:00:00` : '2026-10-23T00:00:00', total: daily ? 2 : 7, completed: daily ? 1 : 4 }, { period: daily ? `${params.get('from')}T11:00:00` : '2026-10-24T00:00:00', total: daily ? 1 : 5, completed: daily ? 1 : 3 }],
        reasons: [{ label: 'Consultation', count: daily ? 3 : 9 }, { label: 'Immunization', count: daily ? 1 : 6 }],
        conditions: [{ label: 'Hypertension', count: daily ? 2 : 4 }, { label: 'Monitoring', count: daily ? 1 : 2 }],
        statuses: [{ label: 'Confirmed', count: daily ? 2 : 6 }, { label: 'Completed', count: daily ? 2 : 9 }],
        patients: [patient], followUps: [{ ...patient, condition: 'Hypertension', status: 'monitoring' }],
        summary: { appointments: total, completed: daily ? 2 : 9, confirmed: daily ? 2 : 6, cancelled: 0, overdue: daily ? 1 : 3, upcoming: daily ? 1 : 3, patients_scheduled: 1, patients_served: 1, repeat_patients: 1, new_patients: 1, documented_completed: daily ? 1 : 6, assessments: daily ? 3 : 6, patients_assessed: 1, current_follow_up_patients: 1, period_follow_up_patients: 1, previous_appointments: daily ? 2 : 10, previous_completed: daily ? 1 : 7, previous_from: previousFrom, previous_to: previousTo },
      } };
    }
    if (url.includes('/records/')) return { data: { records: (config?.params?.appointmentId || config?.params?.perPage === 1000) ? [fixtureRecord(url.split('/').at(-1))] : [] } };
    throw new Error(`Unexpected API request: ${url}`);
  };
  api.patch = async (url, body) => {
    if (rejectStatus) throw new Error('Status update failed');
    patched.push({ url, body });
    appointments = appointments.map(a => url.includes(a.appointment_id) ? { ...a, status: body.status } : a);
    return { data: {} };
  };
  api.post = async (url, body) => {
    posted.push({ url, body });
    if (url.endsWith("/records") && rejectRecording) throw new Error("Save failed");
    if (url.endsWith("/records")) { appointments = appointments.map(a => ({ ...a, status: "completed" })); return { data: { appointmentStatus: "completed" } }; }
    if (url.endsWith('/appointments')) {
      const created = { ...appointment, appointment_id: 'A2', scheduled_at: body.scheduledAt, reason: body.reason };
      appointments = [created, ...appointments];
      return { data: { appointment: created } };
    }
    return { data: {} };
  };
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [url] }, h(AdminShell))));
}
async function click(element) {
  assert.ok(element, 'Expected an interactive element');
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
const button = (text, scope = document) => [...scope.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const visibleText = () => { const copy = document.body.cloneNode(true); copy.querySelectorAll('style,script').forEach(e => e.remove()); return copy.textContent; };
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; document.getElementById('root').replaceChildren(); });
after(async () => { dom.window.close(); for (const channel of channels) { channel.port1.close(); channel.port2.close(); } globalThis.MessageChannel = originalMessageChannel; await rm(scratch, { recursive: true, force: true }); });

for (const [label, selector, expected] of [
  ['follow-up patient', '.ht-follow-up-item', 'General Information'],
  ["today's appointment patient", '.ht-dashboard-schedule .ht-link-button', 'Appointment record'],
  ['notable-event patient', '.ht-dashboard-events .ht-link-button', 'Appointment record'],
]) {
  test(`${label} opens a patient without a blank screen and returns to dashboard`, async () => {
    await mount(); await click(document.querySelector(selector));
    assert.match(visibleText(), /Test Patient/);
    assert.match(visibleText(), new RegExp(expected));
    await click(button('Dashboard', document.querySelector('nav')));
    assert.ok(document.querySelector('.ht-dashboard-screen'));
  });
}

test('appointment list opens the selected appointment; activation exposes every clinical form', async () => {
  await mount('/admin?page=appointments');
  await click(button('Open appointment'));
  assert.match(visibleText(), /Appointment record/);
  assert.equal(document.querySelectorAll('.ht-clinical-sections details[open]').length, 0);
  assert.equal(document.querySelectorAll('.ht-clinical-content h2').length, 0);
  assert.equal(document.querySelectorAll('.ht-clinical-content .ht-vital-record-card').length, 0);
  assert.equal(document.querySelectorAll('.ht-encounter-section > .ht-health-assessment').length, 5);
  await click(button('Activate'));
  assert.ok(document.querySelector('.ht-appointment-record.is-recording'));
  assert.equal(document.querySelector('.ht-appointment-scroll'), null);
  assert.equal(document.querySelectorAll('.ht-clinical-sections details[open]').length, 5);
  assert.equal(document.querySelectorAll('.ht-health-add-button').length, 0);
  assert.equal(document.querySelectorAll('.ht-health-form').length, 5);
  assert.equal([...document.querySelectorAll('button')].some(b => ['Edit', 'Delete', 'Remove'].includes(b.textContent.trim())), false);
});

test('patient list opens and returns without needing a page refresh', async () => {
  await mount('/admin?page=patients');
  await click(button('Open record'));
  assert.match(visibleText(), /General Information/);
  await click(button('Back to patients'));
  assert.match(visibleText(), /Patient Lists/);
});

test('export dialog opens from dashboard and from patient rows before opening a patient', async () => {
  await mount(); await click(button('Export PDF'));
  assert.ok(document.querySelector('dialog[open]'));
  await click(button('Cancel', document.querySelector('dialog')));
  assert.equal(document.querySelector('dialog'), null);
  await click(button('Patients', document.querySelector('nav')));
  await click(button('Export PDF'));
  assert.match(document.querySelector('dialog').textContent, /Patient report/);
  await click(button('Cancel', document.querySelector('dialog')));
});

test('creating an appointment refreshes data without unmounting the active patient screen', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  await click(button('Activate'));
  const screen = document.querySelector('.ht-patient-page');
  await click(button('Cancel changes'));
  await click(button('+ New Appointment'));
  const dialog = document.querySelector('dialog[open]');
  assert.ok(dialog);
  const setValue = async (input, value) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  await setValue(dialog.querySelector('input[type="datetime-local"]'), '2026-10-25T10:00');
  await setValue(dialog.querySelector('input[list]'), 'New test consultation');
  assert.equal(button('Save and activate', dialog).disabled, false);
  await act(async () => dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(posted.length, 1);
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(document.querySelector('.ht-patient-page'), screen);
  assert.match(document.querySelector('.ht-appointment-record').textContent, /New test consultation/);
  assert.equal(document.querySelector('.ht-appointment-scroll'), null);
  assert.ok(button('Finish recording'));
});

test('dashboard has a shared spacing wrapper and adjacent Overview/Notable Events cards', async () => {
  await mount();
  const cards = document.querySelector('.ht-dashboard-events-grid');
  assert.equal(cards.children.length, 2);
  assert.ok(cards.querySelector('.ht-dashboard-schedule'));
  assert.ok(cards.querySelector('.ht-dashboard-events'));
  const css = await readFile(path.join(frontend, 'src/utils/index.css'), 'utf8');
  assert.match(css, /\.ht-dashboard-screen\s*\{[^}]*display:\s*grid;[^}]*gap:\s*1rem;/);
  assert.match(css, /\.ht-dashboard-events-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1\.25fr\)/);
  assert.match(css, /\.ht-small-button\s*\{[^}]*border:[^}]*background:/);
});


test('appointment status dropdown supports all remaining statuses while browsing appointments', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  const select = document.querySelector('.ht-appointment-scroll select');
  assert.deepEqual([...select.options].map(o => o.value), ['confirmed', 'cancelled']);
  await act(async () => {
    select.value = 'cancelled';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(patched.length, 1);
  assert.equal(patched[0].body.status, 'cancelled');
  assert.equal(document.querySelector('.ht-appointment-scroll select').value, 'cancelled');
  assert.equal(document.querySelector('.ht-appointment-record.is-recording'), null);
  assert.equal(button('Activate'), undefined);
  assert.match(document.querySelector('.ht-recording-state').textContent, /Viewing record/);
});

test('failed status update shows an error and retains the original status', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  rejectStatus = true;
  const select = document.querySelector('.ht-appointment-scroll select');
  await act(async () => { select.value = 'cancelled'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  assert.match(document.querySelector('[role="alert"]').textContent, /Could not update/);
  assert.equal(select.value, 'confirmed');
  assert.equal(select.disabled, false);
});

test('patient action buttons share an alignment container and export options use explicit left alignment', async () => {
  await mount('/admin?page=patients');
  const actions = document.querySelector('.ht-patient-row-actions');
  assert.ok(button('Export PDF', actions));
  assert.ok(button('Archive', actions));
  const css = await readFile(path.join(frontend, 'src/utils/index.css'), 'utf8');
  assert.match(css, /\.ht-patient-row-actions\s*\{[^}]*gap:\s*8px/);
  assert.match(css, /\.ht-patient-row-actions > button\s*\{[^}]*height:\s*36px/);
  assert.match(css, /\.ht-export-dialog \.ht-export-options > label\s*\{[^}]*justify-content:\s*flex-start[^}]*text-align:\s*left/);
});


const setInput = async (input, value) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

async function fillRequiredClinicalFields() {
  for (const [type, definition] of Object.entries(RECORD_TYPES)) {
    const section = [...document.querySelectorAll('.ht-clinical-sections details')].find(d => d.querySelector('summary > span').textContent === definition.label);
    const fields = [...section.querySelectorAll('.ht-health-form-grid > .ht-field')];
    for (const [index, [key, field]] of Object.entries(definition.fields).entries()) {
      if (!field.required) continue;
      const wrapper = fields[index];
      const value = field.type === 'number' ? '1' : key === 'blood_pressure' ? '120/80' : 'None';
      if (field.type === 'select') {
        const select = wrapper.querySelector('select');
        await act(async () => { select.value = Object.keys(field.options)[0]; select.dispatchEvent(new Event('change', { bubbles: true })); });
      } else if (field.type === 'textarea') {
        const textarea = wrapper.querySelector('textarea');
        await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, value); textarea.dispatchEvent(new Event('input', { bubbles: true })); });
      } else {
        const input = wrapper.querySelector('input:not([type="hidden"])');
        await setInput(input, value);
        if (field.type === 'multi-combobox') await act(async () => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
      }
    }
  }
}

test('cancel discards clinical drafts, restores the list, and leaves saved records unchanged', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  await click(button('Activate'));
  assert.equal(document.querySelector('.ht-appointment-scroll'), null);
  assert.equal(document.querySelectorAll('.ht-health-add-button').length, 0);
  assert.equal([...document.querySelectorAll('summary')].some(s => s.textContent.includes('Earlier clinical history')), false);
  await setInput(document.querySelector('.ht-health-form input'), '120/80');
  assert.equal(posted.length, 0);
  await click(button('Cancel changes'));
  assert.equal(posted.length, 0);
  assert.ok(document.querySelector('.ht-appointment-scroll'));
  await click(button('Activate'));
  assert.equal(document.querySelector('.ht-health-form input').value, '');
});

test('finish recording requires all clinical sections, saves atomically, and displays completed', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  await click(button('Activate'));
  assert.equal(button('Finish recording').disabled, true);
  await fillRequiredClinicalFields();
  assert.equal(button('Finish recording').disabled, false);
  const bloodPressure = document.querySelector('.ht-health-form input');
  await setInput(bloodPressure, '');
  assert.equal(button('Finish recording').disabled, true);
  await setInput(bloodPressure, '120/80');
  assert.equal(button('Finish recording').disabled, false);
  const notes = [...document.querySelectorAll('.ht-clinical-sections details')].find(d => d.querySelector('summary').textContent.includes('Midwife Notes'));
  await act(async () => {
    const input = notes.querySelector('textarea');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'New clinical note');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const footer = document.querySelector('.ht-recording-actions');
  assert.ok(button('Cancel changes', footer));
  assert.ok(button('Finish recording', footer));
  assert.equal(document.querySelector('.ht-recording-form').lastElementChild, footer);
  await act(async () => document.querySelector('.ht-recording-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(posted.length, 1);
  assert.equal(posted[0].url, '/patients/P1/appointments/A1/records');
  assert.equal(Object.keys(posted[0].body.records).length, 5);
  assert.equal(document.querySelector('.ht-appointment-scroll select'), null);
  assert.match(document.querySelector('.ht-appointment-scroll').textContent, /completed/i);
  assert.equal(posted[0].body.records['midwife-notes'].notes, 'New clinical note');
  assert.ok(document.querySelector('.ht-appointment-scroll'));
  assert.equal(document.querySelector('.ht-recording-actions'), null);
});

test('incomplete sections prevent finishing and keep the draft for correction', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  await click(button('Activate'));
  await setInput(document.querySelector('.ht-health-form input'), '120/80');
  await act(async () => document.querySelector('.ht-recording-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(posted.length, 0);
  assert.match(document.querySelector('[role="alert"]').textContent, /Vital Signs: Temperature/);
  assert.equal(document.querySelector('.ht-health-form input').value, '120/80');
});

test('overdue confirmed appointments get a red date marker and Late suffix', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  assert.match(document.querySelector('.ht-appointment-scroll .ht-appointment-date-late').textContent, / - Late$/);
  const select = document.querySelector('.ht-appointment-scroll select');
  await act(async () => { select.value = 'cancelled'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  assert.equal(document.querySelector('.ht-appointment-scroll .ht-appointment-date-late'), null);
});


test('failed finish preserves the recording draft for retry', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  await click(button('Activate'));
  assert.equal(button('Finish recording').disabled, true);
  await fillRequiredClinicalFields();
  assert.equal(button('Finish recording').disabled, false);
  const notes = [...document.querySelectorAll('.ht-clinical-sections details')].find(d => d.querySelector('summary').textContent.includes('Midwife Notes'));
  await act(async () => {
    const input = notes.querySelector('textarea');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'Preserve this draft');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  rejectRecording = true;
  await act(async () => document.querySelector('.ht-recording-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.match(document.querySelector('[role="alert"]').textContent, /Your draft is still here/);
  assert.equal(notes.querySelector('textarea').value, 'Preserve this draft');
  assert.equal(document.querySelector('.ht-appointment-scroll'), null);
  assert.equal(button('Finish recording').disabled, false);
  rejectRecording = false;
  await act(async () => document.querySelector('.ht-recording-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.ok(document.querySelector('.ht-appointment-scroll'));
  assert.equal(posted.length, 2);
});


test('PDF exports retain styled topics with page breaks only between top-level sections', async () => {
  await mount();
  await click(button('Export PDF'));
  for (const label of document.querySelectorAll('.ht-export-options label')) {
    const wanted = ['Overview', 'Today report', 'Weekly report', 'Appointment details', 'Notable events'].includes(label.textContent.trim());
    const checkbox = label.querySelector('input');
    if (checkbox.checked !== wanted) await click(checkbox);
  }
  const originalPrint = window.print;
  window.print = () => {};
  await click(button('Print / Save PDF', document.querySelector('dialog')));
  const printed = document.querySelector('.ht-export-document');
  assert.ok(printed.querySelector('.ht-export-heading'));
  const topics = [...printed.querySelectorAll(':scope > .ht-export-section')];
  assert.deepEqual(topics.map(t => t.dataset.reportSection), ['overview', 'daily', 'weekly', 'details', 'events']);
  assert.equal(printed.querySelectorAll('.ht-export-section .ht-export-section').length, 0);
  assert.equal(printed.querySelectorAll('.ht-export-section-title').length, 5);
  assert.ok(printed.querySelector('.ht-export-summary'));
  assert.ok(printed.querySelector('.ht-report-list'));
  const css = await readFile(path.join(frontend, 'src/utils/index.css'), 'utf8');
  assert.match(css, /\.ht-export-document > \.ht-export-section \+ \.ht-export-section\s*\{[^}]*break-before:\s*page/);
  assert.match(css, /print-color-adjust:\s*exact/);
  assert.match(css, /\.ht-export-document th\s*\{[^}]*background:\s*#e1eee5/);
  if (process.env.HEALTHTRACK_PRINT_FIXTURE) {
    const sample = printed.cloneNode(true);
    // Stress pagination with a long detail table and a following topic.
    const tbody = sample.querySelector('[data-report-section="details"] tbody');
    const row = tbody.firstElementChild.cloneNode(true);
    for (let i = 1; i < 45; i++) tbody.append(row.cloneNode(true));
    await writeFile(process.env.HEALTHTRACK_PRINT_FIXTURE, sample.outerHTML);
  }
  await act(async () => window.dispatchEvent(new Event('afterprint')));
  assert.equal(document.querySelector('.ht-export-document'), null);
  assert.equal(document.body.classList.contains('ht-exporting'), false);
  window.print = originalPrint;
});

test('patient export buttons use the same red export style as dashboard', async () => {
  await mount('/admin?page=patients');
  assert.ok(button('Export PDF').classList.contains('ht-export-pdf-button'));
  const css = await readFile(path.join(frontend, 'src/utils/index.css'), 'utf8');
  assert.match(css, /\.ht-export-pdf-button\s*\{[^}]*background:\s*var\(--color-danger/);
});


test('patient PDF uses the same styled, separately paginated sections', async () => {
  await mount('/admin?page=patients');
  await click(button('Export PDF'));
  const vital = [...document.querySelectorAll('.ht-export-options label')].find(label => label.textContent.trim() === 'Vital Signs');
  await click(vital.querySelector('input'));
  const originalPrint = window.print; window.print = () => {};
  await click(button('Print / Save PDF', document.querySelector('dialog')));
  const printed = document.querySelector('.ht-export-document');
  assert.deepEqual([...printed.querySelectorAll(':scope > .ht-export-section')].map(s => s.dataset.reportSection), ['profile', 'appointments', 'vital-signs']);
  assert.ok(printed.querySelector('dl'));
  assert.ok(printed.querySelector('table thead'));
  assert.ok(printed.querySelector('.ht-export-record'));
  await act(async () => window.dispatchEvent(new Event('afterprint')));
  window.print = originalPrint;
});


test('period summaries change with the selected tab and PDF uses the same metrics', async () => {
  await mount();
  const metric = label => [...document.querySelectorAll('.ht-dashboard-screen .ht-report-metric')].find(m => m.querySelector('span').textContent === label);
  assert.equal(metric('Scheduled in period').querySelector('strong').textContent, '15');
  assert.equal(metric('Completed visits').querySelector('strong').textContent, '9');
  assert.equal(metric('Patients served').querySelector('strong').textContent, '1');
  assert.match(visibleText(), /Completed with linked records/);
  assert.match(visibleText(), /Current follow-up patients/);
  await click(button('Today'));
  assert.equal(metric('Scheduled in period').querySelector('strong').textContent, '4');
  assert.equal(metric('Completed visits').querySelector('strong').textContent, '2');
  assert.equal(metric('Overdue confirmed').querySelector('strong').textContent, '1');
  await click(button('Export PDF'));
  const originalPrint = window.print; window.print = () => {};
  await click(button('Print / Save PDF', document.querySelector('dialog')));
  const daily = document.querySelector('[data-report-section="daily"]');
  const completed = [...daily.querySelectorAll('.ht-report-metric')].find(m => m.querySelector('span').textContent === 'Completed visits');
  assert.equal(completed.querySelector('strong').textContent, '2');
  assert.match(daily.textContent, /50% of scheduled appointments/);
  assert.doesNotMatch(daily.textContent, /Volume comparison|Follow-up counts reflect latest/);
  await act(async () => window.dispatchEvent(new Event('afterprint')));
  window.print = originalPrint;
});


test('empty report summaries show zero activity without invalid percentages or invented leaders', async () => {
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(ReportInsights, { data: { filters: { from: '2000-01-01', to: '2000-01-01' }, summary: { appointments: 0, completed: 0, previous_appointments: 0, previous_from: '1999-12-31', previous_to: '1999-12-31' }, reasons: [], conditions: [], trend: [] } })));
  assert.match(visibleText(), /No appointments in this period/);
  assert.match(visibleText(), /No appointment activity/);
  assert.doesNotMatch(visibleText(), /NaN|Infinity|undefined/);
  const metric = [...document.querySelectorAll('.ht-report-metric')].find(m => m.querySelector('span').textContent === 'Cancellation rate');
  assert.equal(metric.querySelector('strong').textContent, '—');
});


for (const url of ['/admin', '/admin?page=appointments', '/admin?page=patients&patientId=P1&appointmentId=A1']) {
  test(`completed cannot be selected manually at ${url}`, async () => {
    await mount(url);
    assert.equal(document.querySelector('select option[value="completed"]'), null);
  });
}

test('an empty recording cannot finish even through direct form submission', async () => {
  await mount('/admin?page=patients&patientId=P1&appointmentId=A1');
  await click(button('Activate'));
  assert.equal(button('Finish recording').disabled, true);
  await act(async () => document.querySelector('.ht-recording-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(posted.length, 0);
  assert.match(document.querySelector('[role="alert"]').textContent, /required/);
  assert.equal(document.querySelector('.ht-appointment-scroll'), null);
});


test('detail exports have independent period dropdowns and filter each section by its own choice', async () => {
  const year = new Date().getFullYear();
  const earlier = { ...appointment, appointment_id: 'HISTORICAL', scheduled_at: `${year}-01-02T10:00:00`, reason: 'Historical consultation', notes: 'Earlier event for yearly report' };
  await mount('/admin', [earlier]);
  await click(button('Export PDF'));
  const details = document.querySelector('select[aria-label="Appointment details period"]');
  const followups = document.querySelector('select[aria-label="Patients needing follow-up period"]');
  const events = document.querySelector('select[aria-label="Notable events period"]');
  assert.deepEqual([...details.options].map(o => o.textContent), ['Today', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']);
  assert.equal(document.querySelectorAll('.ht-export-option-row select').length, 3);
  assert.doesNotMatch(document.querySelector('dialog').textContent, /selected period/i);
  await act(async () => { details.value = 'daily'; details.dispatchEvent(new Event('change', { bubbles: true })); });
  assert.equal(followups.value, 'monthly');
  assert.equal(events.value, 'monthly');
  await act(async () => { followups.value = 'weekly'; followups.dispatchEvent(new Event('change', { bubbles: true })); events.value = 'yearly'; events.dispatchEvent(new Event('change', { bubbles: true })); });
  for (const label of document.querySelectorAll('.ht-export-options label')) {
    const wanted = ['Appointment details', 'Patients needing follow-up', 'Notable events'].includes(label.textContent.trim());
    const checkbox = label.querySelector('input'); if (checkbox.checked !== wanted) await click(checkbox);
  }
  const originalPrint = window.print; window.print = () => {};
  await click(button('Print / Save PDF', document.querySelector('dialog')));
  const printed = document.querySelector('.ht-export-document');
  const detailReport = printed.querySelector('[data-report-section="details"]');
  const followupReport = printed.querySelector('[data-report-section="followups"]');
  const eventReport = printed.querySelector('[data-report-section="events"]');
  assert.match(detailReport.querySelector('h2').textContent, /Appointment details — Today/);
  assert.match(followupReport.querySelector('h2').textContent, /Patients needing follow-up — Weekly/);
  assert.match(eventReport.querySelector('h2').textContent, /Notable events — Yearly/);
  assert.doesNotMatch(detailReport.textContent, /Historical consultation/);
  assert.match(eventReport.textContent, /Earlier event for yearly report/);
  const today = new Date().toLocaleDateString('en-CA');
  assert.ok(detailReport.textContent.includes(`${today} to ${today}`));
  assert.ok(eventReport.textContent.includes(`${year}-01-01 to ${today}`));
  await act(async () => window.dispatchEvent(new Event('afterprint')));
  window.print = originalPrint;
});
