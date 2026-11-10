import test, { after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { MessageChannel as NodeMessageChannel } from "node:worker_threads";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const channels = [];
const originalChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NodeMessageChannel { constructor() { super(); channels.push(this); } };
const dom = new JSDOM('<div id="root"></div>', { url: "http://healthtrack-test.invalid/" });
for (const name of ["window", "document", "HTMLElement", "Node", "Event", "MouseEvent", "localStorage"]) globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
dom.window.matchMedia = () => ({ matches: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const scratch = await mkdtemp(path.join(tmpdir(), "healthtrack-setup-ui-"));
const outfile = path.join(scratch, "ui.mjs");
await build({
  stdin: { contents: `
    export { default as App } from './src/utils/App.jsx';
    export { default as StaffApp } from './src/utils/StaffApp.jsx';
    export { ConfirmAccountPage, RequestAccountSetupPage } from './src/auth/AccountSetupPage.jsx';
    export { Patients as AdminPatients } from './src/users/admin/pages/Patients.jsx';
    export { Patients as WorkerPatients } from './src/users/health_worker/pages/Patients.jsx';
    export { PatientRecord } from './src/shared/patients/PatientRecord.jsx';
    export { api } from './src/lib/axios.js';
    export { createRoot } from 'react-dom/client';
    export { MemoryRouter, Routes, Route } from 'react-router';
    export { createElement as h, act } from 'react';
  `, resolveDir: fileURLToPath(new URL("..", import.meta.url)), loader: "jsx" },
  bundle: true, format: "esm", platform: "browser", jsx: "automatic", outfile,
  define: { "import.meta.env.VITE_API_BASE_URL": '"/api"', "process.env.NODE_ENV": '"development"' },
});
const { App, StaffApp, ConfirmAccountPage, RequestAccountSetupPage, AdminPatients, WorkerPatients, PatientRecord, api, createRoot, MemoryRouter, Routes, Route, h, act } = await import(pathToFileURL(outfile));
let root, posts;
async function mount(url, Page = ConfirmAccountPage) {
  posts = []; localStorage.clear();
  api.get = async () => { throw new Error("The setup page must not request or consume a token on GET"); };
  api.post = async (url, body) => { posts.push({ url, body }); return { data: { token: "session", user: { user_id: "U1", role: "patient", email: "patient@example.com" }, message: "Check your inbox." } }; };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [url] }, h(Routes, null,
    h(Route, { path: "/confirm-account", element: h(Page) }),
    h(Route, { path: "/setup-account", element: h(RequestAccountSetupPage) }),
    h(Route, { path: "/patient", element: h("p", null, "Patient dashboard") })
  ))));
}
async function fill(label, value) {
  const input = [...document.querySelectorAll("label")].find((node) => node.textContent.includes(label)).querySelector("input");
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() { await act(async () => document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; });
after(async () => { for (const channel of channels) { channel.port1.close(); channel.port2.close(); } globalThis.MessageChannel = originalChannel; dom.window.close(); await rm(scratch, { recursive: true, force: true }); });

async function mountLogin(url, Page = App) {
  localStorage.clear(); posts = [];
  api.post = async (url, body) => {
    posts.push({ url, body });
    throw { response: { status: 401, data: { error: "Those credentials don't match an active account." } } };
  };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [url] }, h(Page))));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
}

test("the general login URL opens patient login without a portal selector or staff links", async () => {
  await mountLogin("/login");
  assert.equal(document.querySelector("h1").textContent, "Patient Portal");
  assert.equal(document.querySelector(".ht-select-account"), null);
  assert.equal(document.querySelector('a[href="/admin/login"]'), null);
  assert.equal(document.querySelector('a[href="/health-worker/login"]'), null);
  assert.ok(document.querySelector('input[type="password"]'));
});

for (const [role, url, label, dashboard] of [
  ["patient", "/patient/login", "Patient", "/patient"],
  ["admin", "/admin/login", "Admin", "/admin"],
  ["health_worker", "/health-worker/login", "Health Worker", "/health_worker"],
]) {
  test(`${label} has a direct login page and submits its fixed role`, async () => {
    await mountLogin(url, role === "patient" ? App : StaffApp);
    assert.equal(document.querySelector("h1").textContent, `${label} Portal`);
    assert.equal(document.querySelectorAll(".ht-account-card").length, 0);
    await fill("Email Address", "test@example.com"); await fill("Password", "wrong password"); await submit();
    assert.deepEqual(posts, [{ url: "/auth/login", body: { email: "test@example.com", password: "wrong password", accountType: role } }]);
    assert.match(document.querySelector('[role="alert"]').textContent, /don't match/);
    assert.equal(localStorage.length, 0);
    assert.equal(document.querySelector("h1").textContent, `${label} Portal`);
  });

  test(`unauthenticated ${label} dashboard opens its own login page`, async () => {
    await mountLogin(dashboard, role === "patient" ? App : StaffApp);
    assert.equal(document.querySelector("h1").textContent, `${label} Portal`);
    assert.ok(document.querySelector("form"));
  });
}

for (const url of ["/admin/login", "/health-worker/login", "/admin", "/health_worker"]) {
  test(`the patient website does not expose staff route ${url}`, async () => {
    await mountLogin(url);
    assert.equal(document.querySelector("h1").textContent, "Page not found");
    assert.equal(document.querySelector("form"), null);
    assert.equal(document.querySelector(".ht-header-logout"), null);
  });
}

for (const url of ["/patient/login", "/patient", "/confirm-account?token=sample"]) {
  test(`the staff website does not expose patient route ${url}`, async () => {
    await mountLogin(url, StaffApp);
    assert.equal(document.querySelector("h1").textContent, "Page not found");
    assert.equal(document.querySelector("form"), null);
  });
}

test("opening a confirmation link renders password setup without API requests or session changes", async () => {
  await mount(`/confirm-account?token=${"a".repeat(64)}`);
  assert.match(document.body.textContent, /New Password/);
  assert.deepEqual(posts, []); assert.equal(localStorage.length, 0);
});

test("missing tokens show a resend link instead of a password form", async () => {
  await mount("/confirm-account");
  assert.equal(document.querySelector("form"), null);
  assert.equal(document.querySelector('a[href="/setup-account"]').textContent, "Request a new setup link");
});

test("mismatched passwords stay on the form without submitting", async () => {
  await mount(`/confirm-account?token=${"a".repeat(64)}`);
  await fill("New Password", "a long test passphrase"); await fill("Confirm Password", "another test passphrase"); await submit();
  assert.match(document.querySelector('[role="alert"]').textContent, /do not match/);
  assert.deepEqual(posts, []);
});

test("successful confirmation posts the token and password then opens the patient dashboard", async () => {
  const token = "a".repeat(64); await mount(`/confirm-account?token=${token}`);
  await fill("New Password", "a long test passphrase"); await fill("Confirm Password", "a long test passphrase"); await submit();
  assert.deepEqual(posts, [{ url: "/auth/complete", body: { token, new_password: "a long test passphrase" } }]);
  assert.match(document.body.textContent, /Patient dashboard/);
  assert.equal(localStorage.getItem("healthtrack_token"), "session");
});

test("expired links keep the error visible and offer resend without saving a session", async () => {
  await mount(`/confirm-account?token=${"a".repeat(64)}`);
  api.post = async () => { throw { response: { status: 400, data: { error: "This setup link is invalid, expired, or has already been used." } } }; };
  await fill("New Password", "a long test passphrase"); await fill("Confirm Password", "a long test passphrase"); await submit();
  assert.match(document.querySelector('[role="alert"]').textContent, /expired/);
  assert.ok(document.querySelector('a[href="/setup-account"]'));
  assert.equal(localStorage.length, 0);
});

test("request screen submits only the email and displays delivery errors", async () => {
  await mount("/setup-account", RequestAccountSetupPage);
  await fill("Email Address", "patient@example.com"); await submit();
  assert.deepEqual(posts, [{ url: "/auth/initiate", body: { email: "patient@example.com" } }]);
  assert.match(document.querySelector('[role="status"]').textContent, /Check your inbox/);
  api.post = async () => { throw { response: { status: 503, data: { error: "We could not send the setup email." } } }; };
  await submit(); assert.match(document.querySelector('[role="alert"]').textContent, /could not send/);
});

for (const [role, Patients] of [["admin", AdminPatients], ["health worker", WorkerPatients]]) {
  test(`${role} patient list distinguishes pending, verified, and missing portal accounts`, async () => {
    const base = { first_name: "Test", last_name: "Patient", sex: "female", birthdate: "2000-01-01", address: "Test address" };
    const patients = [
      { ...base, patient_id: "P1", full_name: "Pending Patient", user_id: "U1", is_verified: false },
      { ...base, patient_id: "P2", full_name: "Verified Patient", user_id: "U2", is_verified: true },
      { ...base, patient_id: "P3", full_name: "Walk-in Patient", user_id: null, is_verified: false },
      { ...base, patient_id: "P4", full_name: "Unknown Status Patient", user_id: "U4" },
    ];
    root = createRoot(document.getElementById("root"));
    await act(async () => root.render(h(MemoryRouter, null, h(Patients, { patients, loadData: async () => {}, showArchived: false, onArchivedChange() {} }))));
    for (const [name, label, tone] of [["Pending Patient", "Pending email confirmation", "pending"], ["Verified Patient", "Active", "active"], ["Walk-in Patient", "Inactive", "inactive"], ["Unknown Status Patient", "Pending email confirmation", "pending"]]) {
      const row = [...document.querySelectorAll("tbody tr")].find(row => row.textContent.includes(name));
      const badge = row.querySelector(".ht-status-badge");
      assert.equal(badge.textContent, label);
      assert.ok(badge.classList.contains(`ht-status-badge-${tone}`));
    }
  });
}

async function mountPendingPatient(role = "health_worker", verified = false) {
  posts = [];
  const patient = { patient_id: "P1", user_id: "U1", first_name: "Email", last_name: "Test", sex: "female", birthdate: "2000-01-01", email: "wrong@example.com", is_verified: verified };
  api.get = async url => ({ data: url.endsWith("/appointments") ? { appointments: [] } : { patient } });
  api.patch = async (url, body) => {
    posts.push({ url, body });
    return { data: { patient: { ...patient, email: body.email }, verification: { status: "sent", message: "Confirmation email sent to the corrected address." } } };
  };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h(MemoryRouter, null, h(PatientRecord, { patientId: "P1", role }))));
}
async function clickButton(label) {
  const button = [...document.querySelectorAll("button")].find(button => button.textContent.trim() === label);
  assert.ok(button, `Expected ${label} button`);
  await act(async () => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

for (const role of ["admin", "health_worker"]) {
  test(`${role} can correct a pending email and keeps the account pending until confirmation`, async () => {
    await mountPendingPatient(role); await clickButton("Change email");
    await fill("New email address", "corrected@example.com"); await submit();
    assert.deepEqual(posts, [{ url: "/patients/P1/portal-account/email", body: { email: "corrected@example.com", current_email: "wrong@example.com" } }]);
    assert.match(document.body.textContent, /corrected@example.com/);
    assert.match(document.body.textContent, /Pending email confirmation/);
    assert.match(document.querySelector('[role="status"]').textContent, /Confirmation email sent/);
    assert.equal(document.querySelector("form"), null);
  });
}

test("a rejected email correction keeps the form and draft for retry", async () => {
  await mountPendingPatient(); await clickButton("Change email");
  api.patch = async () => { throw { response: { status: 422, data: { error: "That email address is already in use." } } }; };
  await fill("New email address", "duplicate@example.com"); await submit();
  assert.match(document.querySelector('[role="alert"]').textContent, /already in use/);
  assert.equal(document.querySelector('input[type="email"]').value, "duplicate@example.com");
  assert.match(document.body.textContent, /wrong@example.com/);
});

test("delivery failure displays the saved new email and a resend option", async () => {
  await mountPendingPatient(); await clickButton("Change email");
  const patch = api.patch;
  api.patch = async (...args) => {
    const response = await patch(...args);
    response.data.verification = { status: "failed", message: "Email updated, but the confirmation email could not be sent. Use Resend setup email." };
    return response;
  };
  await fill("New email address", "corrected@example.com"); await submit();
  assert.match(document.body.textContent, /corrected@example.com/);
  assert.match(document.querySelector('[role="status"]').textContent, /could not be sent/);
  assert.ok([...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Resend setup email"));
});

test("verified accounts do not offer email correction or setup resend", async () => {
  await mountPendingPatient("admin", true);
  assert.equal([...document.querySelectorAll("button")].some(button => ["Change email", "Resend setup email"].includes(button.textContent.trim())), false);
  assert.match(document.querySelector(".ht-account-status").textContent, /Active/);
});
