import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import vm from "node:vm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { PGlite } from "@electric-sql/pglite";
import { createAccountSetupService, isValidEmail, normalizeEmail, passwordError } from "../src/services/accountSetup.service.js";
import { createLoginOtpService } from "../src/services/loginOtp.service.js";

// Run real PostgreSQL statements in an isolated WASM database, never the
// application's configured database. Only SMTP and JWT issuance are stubbed.
const db = new PGlite();
const sql = (strings, ...params) => sql.query(strings.reduce((query, part, index) => query + part + (index < params.length ? `$${index + 1}` : ""), ""), params);
sql.query = async (query, params = []) => (await db.query(query, params)).rows;
let mail, service, failMail;
let loginMail, loginService, failLoginMail;
const password = "a memorable patient passphrase";
const hash = (token) => createHash("sha256").update(token).digest("hex");

async function loadSource(relative, names, context) {
  const source = (await readFile(new URL(`../src/${relative}`, import.meta.url), "utf8"))
    .replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
  return vm.runInNewContext(`${source}\n;({ ${names.join(",")} });`, { console, ...context });
}
const sessionForUser = (user) => ({ token: "test-session", user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
function response() { return { code: 200, status(code) { this.code = code; return this; }, set() { return this; }, json(data) { this.data = data; return this; } }; }
async function handlers(env = { LOGIN_OTP_ENABLED: true }) {
  return loadSource("controllers/auth/postRequests.controller.js", ["login", "verifyLoginCode", "resendLoginCode", "initiateAccount", "completeAccount"], { bcrypt, ENV: env, sql, accountSetup: service, loginOtp: loginService, sessionForUser, normalizeEmail, isValidEmail, passwordError });
}
async function provision({ email = "patient@example.com", role = "patient", verified = false, archived = false } = {}) {
  const id = randomBytes(6).toString("hex");
  await sql`INSERT INTO users (user_id, name, email, password, role, is_verified)
    VALUES (${id}, 'Test Patient', ${email}, ${await bcrypt.hash("password", 4)}, ${role}, ${verified})`;
  await sql`INSERT INTO patients (patient_id, user_id, first_name, last_name, sex, birthdate, address, archived_at)
    VALUES (${id}, ${id}, 'Test', 'Patient', 'female', '2000-01-01', 'Test address', ${archived ? new Date() : null})`;
  return id;
}

before(async () => {
  const source = await readFile(new URL("../src/config/db.js", import.meta.url), "utf8");
  for (const [, statement] of source.matchAll(/^    createSQL: `([\s\S]*?)`/gm)) await db.exec(statement);
  // Also exercise the startup verification migration against a pre-existing
  // account and ensure repeated startup does not activate pending accounts.
  await db.exec("ALTER TABLE users DROP COLUMN is_verified");
  await sql`INSERT INTO users (user_id, name, email, password, role) VALUES ('legacy', 'Legacy', 'legacy@example.com', 'legacy-hash', 'admin')`;
  const migration = [...source.matchAll(/await sql`((?:ALTER TABLE users|CREATE UNIQUE INDEX IF NOT EXISTS users_verification_token_idx)[\s\S]*?)`/g)].map((match) => match[1]);
  for (const statement of migration) await db.exec(statement);
  assert.equal((await sql`SELECT is_verified FROM users WHERE user_id = 'legacy'`)[0].is_verified, true);
  await sql`INSERT INTO users (user_id, name, email, password, role) VALUES ('pending', 'Pending', 'pending@example.com', 'random-hash', 'patient')`;
  for (const statement of migration) await db.exec(statement);
  assert.equal((await sql`SELECT is_verified FROM users WHERE user_id = 'pending'`)[0].is_verified, false);
});

beforeEach(async () => {
  await db.exec("TRUNCATE users CASCADE");
  mail = []; failMail = false;
  service = createAccountSetupService({ sql, assertMailConfigured() {}, sendVerificationEmail: async (email, token) => { if (failMail) throw new Error("SMTP unavailable"); mail.push({ email, token }); } });
  loginMail = []; failLoginMail = false;
  loginService = createLoginOtpService({ sql, assertMailConfigured() {}, sendLoginCodeEmail: async (email, code) => { if (failLoginMail) throw new Error("SMTP unavailable"); loginMail.push({ email, code }); } });
});
after(() => db.close());

test("initiation stores only a hash, sets 15-minute expiry, normalizes email, and enforces resend cooldown", async () => {
  await provision();
  assert.equal(await service.initiate(" Patient@Example.com "), true);
  assert.match(mail[0].token, /^[a-f0-9]{64}$/);
  const user = (await sql`SELECT * FROM users`)[0];
  assert.equal(user.verification_token, hash(mail[0].token));
  assert.notEqual(user.verification_token, mail[0].token);
  assert.equal(user.is_verified, false);
  const remaining = new Date(user.token_expires_at).getTime() - Date.now();
  assert.ok(remaining > 14 * 60000 && remaining <= 15 * 60000);
  assert.equal(await service.initiate("patient@example.com"), false);
  assert.equal(mail.length, 1);
});

test("unknown, verified, staff, and archived accounts cannot be enrolled or overwritten", async () => {
  await provision({ email: "verified@example.com", verified: true });
  await provision({ email: "staff@example.com", role: "admin" });
  await provision({ email: "archived@example.com", archived: true });
  for (const email of ["unknown@example.com", "verified@example.com", "staff@example.com", "archived@example.com"]) assert.equal(await service.initiate(email), false);
  assert.equal(mail.length, 0);
  assert.equal((await sql`SELECT COUNT(*)::int AS count FROM users`)[0].count, 3);
  assert.ok((await sql`SELECT verification_token FROM users`).every((user) => user.verification_token === null));
});

test("delivery failure invalidates its token and allows retry", async () => {
  await provision(); failMail = true;
  await assert.rejects(service.initiate("patient@example.com"), /SMTP unavailable/);
  const user = (await sql`SELECT * FROM users`)[0];
  assert.equal(user.verification_token, null); assert.equal(user.token_expires_at, null); assert.equal(user.verification_sent_at, null);
  failMail = false;
  assert.equal(await service.initiate("patient@example.com"), true);
});

test("resend invalidates the old link and expired links cannot finalize", async () => {
  await provision(); await service.initiate("patient@example.com");
  const oldToken = mail[0].token;
  await sql`UPDATE users SET verification_sent_at = NOW() - INTERVAL '61 seconds'`;
  await service.initiate("patient@example.com");
  assert.notEqual(mail[1].token, oldToken);
  assert.equal(await service.complete(oldToken, password), null);
  await sql`UPDATE users SET token_expires_at = NOW() - INTERVAL '1 second'`;
  assert.equal(await service.complete(mail[1].token, password), null);
  assert.equal((await sql`SELECT is_verified FROM users`)[0].is_verified, false);
});

test("concurrent completion succeeds once, hashes the password, clears token, and returns a safe user", async () => {
  await provision(); await service.initiate("patient@example.com");
  const results = await Promise.all([service.complete(mail[0].token, password), service.complete(mail[0].token, password)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(Object.keys(results.find(Boolean)).sort(), ["email", "name", "role", "user_id"]);
  const user = (await sql`SELECT * FROM users`)[0];
  assert.equal(user.is_verified, true); assert.equal(user.verification_token, null); assert.equal(user.token_expires_at, null);
  assert.equal(await bcrypt.compare(password, user.password), true);
  assert.equal(await bcrypt.compare("password", user.password), false);
  assert.equal(await service.complete(mail[0].token, password), null);
});

test("archiving a patient invalidates an outstanding setup link", async () => {
  await provision(); await service.initiate("patient@example.com");
  await sql`UPDATE patients SET archived_at = NOW()`;
  assert.equal(await service.complete(mail[0].token, password), null);
});

test("controllers enforce password limits, reject pending login, and return the session after completion", async () => {
  await provision();
  const { login, verifyLoginCode, completeAccount } = await handlers();
  const pending = response();
  await login({ body: { email: "patient@example.com", password: "password", accountType: "patient" } }, pending);
  assert.equal(pending.code, 401);
  await service.initiate("patient@example.com");
  for (const new_password of ["short", "x".repeat(73), "🔒".repeat(19), null, {}]) {
    const result = response();
    await completeAccount({ body: { token: mail[0].token, new_password } }, result);
    assert.equal(result.code, 422);
  }
  const invalid = response();
  await completeAccount({ body: { token: "bad", new_password: password } }, invalid);
  assert.equal(invalid.code, 400);
  const complete = response();
  await completeAccount({ body: { token: mail[0].token, new_password: password } }, complete);
  assert.equal(complete.code, 200); assert.equal(complete.data.token, "test-session"); assert.equal(complete.data.user.role, "patient");
  const signedIn = response();
  await login({ body: { email: " PATIENT@EXAMPLE.COM ", password, accountType: "patient" } }, signedIn);
  assert.equal(signedIn.code, 200);
  assert.equal(signedIn.data.requires2FA, true);
  assert.equal(signedIn.data.token, undefined);
  assert.match(loginMail[0].code, /^\d{6}$/);
  const verified = response();
  await verifyLoginCode({ body: { email: "patient@example.com", code: loginMail[0].code } }, verified);
  assert.equal(verified.code, 200);
  assert.equal(verified.data.token, "test-session");
  const wrongRole = response();
  await login({ body: { email: "patient@example.com", password, accountType: "admin" } }, wrongRole);
  assert.equal(wrongRole.code, 401);
});

test("each portal accepts only its stored account role and rejects role tampering", async () => {
  const { login } = await handlers();
  const roles = ["patient", "admin", "health_worker"];
  for (const role of roles) {
    const email = `${role}@example.com`;
    await provision({ email, role, verified: true });
    for (const accountType of roles) {
      const result = response();
      await login({ body: { email, password: "password", accountType } }, result);
      assert.equal(result.code, accountType === role ? 200 : 401);
      if (accountType === role) {
        if (role === "patient") {
          assert.equal(result.data.requires2FA, true);
          assert.equal(result.data.token, undefined);
        } else {
          assert.equal(result.data.user.role, role);
        }
      }
      else assert.equal(result.data.token, undefined);
    }
    const invalid = response();
    await login({ body: { email, password: "password", accountType: "superadmin" } }, invalid);
    assert.equal(invalid.code, 422);
    assert.equal(invalid.data.token, undefined);
  }
});

test("patient login issues a hashed 5-minute OTP and verifies it exactly once", async () => {
  await provision({ verified: true });
  const { login, verifyLoginCode } = await handlers();
  const challenge = response();
  await login({ body: { email: "patient@example.com", password: "password", accountType: "patient" } }, challenge);
  assert.equal(challenge.code, 200);
  assert.equal(challenge.data.requires2FA, true);
  assert.match(loginMail[0].code, /^\d{6}$/);
  const stored = (await sql`SELECT * FROM users`)[0];
  assert.equal(stored.login_otp_hash, hash(loginMail[0].code));
  assert.notEqual(stored.login_otp_hash, loginMail[0].code);
  assert.equal(stored.login_otp_attempts, 0);
  const remaining = new Date(stored.login_otp_expires_at).getTime() - Date.now();
  assert.ok(remaining > 4 * 60000 && remaining <= 5 * 60000);
  const ok = response();
  await verifyLoginCode({ body: { email: " Patient@Example.com ", code: loginMail[0].code } }, ok);
  assert.equal(ok.code, 200);
  assert.equal(ok.data.token, "test-session");
  assert.equal(ok.data.user.role, "patient");
  const cleared = (await sql`SELECT * FROM users`)[0];
  assert.equal(cleared.login_otp_hash, null);
  const replay = response();
  await verifyLoginCode({ body: { email: "patient@example.com", code: loginMail[0].code } }, replay);
  assert.equal(replay.code, 401);
});

test("staff login stays single-step and never issues a patient OTP", async () => {
  await provision({ email: "staff@example.com", role: "admin", verified: true });
  const { login } = await handlers();
  const result = response();
  await login({ body: { email: "staff@example.com", password: "password", accountType: "admin" } }, result);
  assert.equal(result.code, 200);
  assert.equal(result.data.token, "test-session");
  assert.equal(result.data.requires2FA, undefined);
  assert.equal(loginMail.length, 0);
  assert.equal((await sql`SELECT login_otp_hash FROM users`)[0].login_otp_hash, null);
});

test("wrong OTP codes count attempts and lock after five", async () => {
  await provision({ verified: true });
  const { login, verifyLoginCode } = await handlers();
  await login({ body: { email: "patient@example.com", password: "password", accountType: "patient" } }, response());
  for (let attempt = 1; attempt <= 4; attempt++) {
    const result = response();
    await verifyLoginCode({ body: { email: "patient@example.com", code: "000000" } }, result);
    assert.equal(result.code, 401);
    assert.match(result.data.error, /left before/);
  }
  const locked = response();
  await verifyLoginCode({ body: { email: "patient@example.com", code: "000000" } }, locked);
  assert.equal(locked.code, 429);
  assert.equal((await sql`SELECT login_otp_hash FROM users`)[0].login_otp_hash, null);
  const afterLock = response();
  await verifyLoginCode({ body: { email: "patient@example.com", code: loginMail[0].code } }, afterLock);
  assert.equal(afterLock.code, 401);
});

test("expired OTP cannot verify and resend respects the 60-second cooldown", async () => {
  await provision({ verified: true });
  const { login, verifyLoginCode, resendLoginCode } = await handlers();
  await login({ body: { email: "patient@example.com", password: "password", accountType: "patient" } }, response());
  const immediate = response();
  await resendLoginCode({ body: { email: "patient@example.com" } }, immediate);
  assert.equal(immediate.code, 429);
  assert.equal(loginMail.length, 1);
  await sql`UPDATE users SET login_otp_sent_at = NOW() - INTERVAL '61 seconds'`;
  const resent = response();
  await resendLoginCode({ body: { email: "patient@example.com" } }, resent);
  assert.equal(resent.code, 202);
  assert.equal(loginMail.length, 2);
  await sql`UPDATE users SET login_otp_expires_at = NOW() - INTERVAL '1 second'`;
  const expired = response();
  await verifyLoginCode({ body: { email: "patient@example.com", code: loginMail[1].code } }, expired);
  assert.equal(expired.code, 400);
  const noPending = response();
  await resendLoginCode({ body: { email: "patient@example.com" } }, noPending);
  assert.equal(noPending.code, 400);
});

test("disabled patient OTP signs in single-step without email", async () => {
  await provision({ verified: true });
  const { login, verifyLoginCode, resendLoginCode } = await handlers({ LOGIN_OTP_ENABLED: false });
  const signedIn = response();
  await login({ body: { email: "patient@example.com", password: "password", accountType: "patient" } }, signedIn);
  assert.equal(signedIn.code, 200);
  assert.equal(signedIn.data.requires2FA, undefined);
  assert.equal(signedIn.data.token, "test-session");
  assert.equal(loginMail.length, 0);
  const denied = response();
  await verifyLoginCode({ body: { email: "patient@example.com", code: "000000" } }, denied);
  assert.equal(denied.code, 404);
  const resendDenied = response();
  await resendLoginCode({ body: { email: "patient@example.com" } }, resendDenied);
  assert.equal(resendDenied.code, 404);
});

test("OTP delivery failure returns 503 without leaving a pending challenge", async () => {
  await provision({ verified: true });
  failLoginMail = true;
  const { login } = await handlers();
  const result = response();
  await login({ body: { email: "patient@example.com", password: "password", accountType: "patient" } }, result);
  assert.equal(result.code, 503);
  const stored = (await sql`SELECT * FROM users`)[0];
  assert.equal(stored.login_otp_hash, null);
  assert.equal(stored.login_otp_sent_at, null);
});

test("real HTTP routes limit setup requests and GET never consumes a token", async () => {
  await provision();
  const routeSource = (await readFile(new URL("../src/routes/auth.route.js", import.meta.url), "utf8")).replace(/^import .*;\r?\n/gm, "").replace("export default router;", "router;");
  const router = vm.runInNewContext(routeSource, { Router, rateLimit, ...(await handlers()) });
  const app = express(); app.use(express.json()); app.use("/api/auth", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const post = (email) => fetch(`${url}/api/auth/initiate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const pending = await post("patient@example.com");
    const unknown = await post("unknown@example.com");
    assert.equal(pending.status, 202); assert.equal(unknown.status, 202);
    assert.deepEqual(await pending.json(), await unknown.json());
    assert.equal(pending.headers.get("cache-control"), "no-store");
    await fetch(`${url}/confirm-account?token=${mail[0].token}`);
    await fetch(`${url}/api/auth/complete?token=${mail[0].token}`);
    assert.equal((await sql`SELECT is_verified FROM users`)[0].is_verified, false);
    for (let index = 0; index < 8; index++) assert.equal((await post("unknown@example.com")).status, 202);
    const limited = await post("unknown@example.com");
    assert.equal(limited.status, 429); assert.ok((await limited.json()).error);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("patient registration creates account and demographics atomically and respects deferred email", async () => {
  const { registerPatient, createPortalAccount } = await loadSource("controllers/patients/postRequests.controller.js", ["registerPatient", "createPortalAccount"], {
    bcrypt, randomBytes, sql, normalizeEmail, isValidEmail,
    generatePatientId: async () => "P1", generateUserId: async () => "U1",
    PatientPolicy: { register: () => true, createAccount: () => true },
    validatePlaceOfBirth: async () => ({ display: "Test place", value: {}, verified: true }),
    deliverAccountSetup: async (email, send = true) => { if (send) await service.initiate(email); return { status: send ? "sent" : "deferred" }; },
  });
  const body = { first_name: "Test", last_name: "Patient", sex: "female", birthdate: "2000-01-01", civil_status: "Single", blood_type: "O+", occupation: "Student", barangay_id_number: "TEST", contact_number: "123", address: "Test", emergency_contact_name: "Contact", emergency_contact_number: "456", portal_email: " Patient@Example.com ", send_setup_email: false };
  await assert.rejects(registerPatient({ user: {}, body: { ...body, birthdate: "not-a-date" } }, response()));
  assert.equal((await sql`SELECT COUNT(*)::int AS count FROM users`)[0].count, 0);
  assert.equal((await sql`SELECT COUNT(*)::int AS count FROM patients`)[0].count, 0);
  const result = response();
  await registerPatient({ user: {}, body }, result);
  assert.equal(result.code, 201); assert.equal(result.data.verification.status, "deferred"); assert.equal(mail.length, 0);
  const user = (await sql`SELECT * FROM users`)[0];
  assert.equal(user.email, "patient@example.com"); assert.equal(user.is_verified, false);
  assert.equal(await bcrypt.compare("password", user.password), false);
  assert.equal(result.data.patient.user_id, user.user_id);
  const duplicate = response(); await registerPatient({ user: {}, body }, duplicate);
  assert.equal(duplicate.code, 422);
  await sql`INSERT INTO patients (patient_id, first_name, last_name, sex, birthdate, address) VALUES ('P2', 'Second', 'Patient', 'male', '2000-01-01', 'Test')`;
  // Use a fresh generated user ID for admin-created portal account.
  const admin = await loadSource("controllers/patients/postRequests.controller.js", ["createPortalAccount"], {
    bcrypt, randomBytes, sql, normalizeEmail, isValidEmail,
    generateUserId: async () => "U2", PatientPolicy: { createAccount: () => true },
    deliverAccountSetup: async (email) => { await service.initiate(email); return { status: "sent" }; },
  });
  const created = response(); await admin.createPortalAccount({ user: {}, params: { patientId: "P2" }, body: { email: "second@example.com" } }, created);
  assert.equal(created.code, 201); assert.equal(created.data.patient.is_verified, false); assert.equal(mail.length, 1);
});

test("protected APIs reject even a validly signed JWT for an unverified account", async () => {
  const userId = await provision();
  const ENV = { JWT_SECRET: "test-only-signing-secret" };
  const { authMiddleware } = await loadSource("middlewares/auth.middleware.js", ["authMiddleware"], { jwt, sql, ENV });
  const req = { headers: { authorization: `Bearer ${jwt.sign({ user_id: userId }, ENV.JWT_SECRET)}` } };
  let allowed = false; const denied = response();
  await authMiddleware(req, denied, () => { allowed = true; });
  assert.equal(denied.code, 401); assert.equal(allowed, false);
  await sql`UPDATE users SET is_verified = TRUE WHERE user_id = ${userId}`;
  await authMiddleware(req, response(), () => { allowed = true; });
  assert.equal(allowed, true);
});

test("patient registry exposes verification state instead of equating a linked account with activation", async () => {
  await provision({ email: "pending@example.com" });
  await provision({ email: "active@example.com", verified: true });
  await provision({ email: "archived@example.com", verified: true, archived: true });
  await sql`INSERT INTO patients (patient_id, first_name, last_name, sex, birthdate, address)
    VALUES ('no-account', 'Walk-in', 'Patient', 'female', '2000-01-01', 'Test address')`;
  const { getAllPatients } = await loadSource("controllers/patients/getRequests.controller.js", ["getAllPatients"], {
    sql, PatientPolicy: { viewAny: () => true }, calculateAge: () => 26,
  });
  const result = response();
  await getAllPatients({ user: { role: "admin" }, query: {} }, result);
  assert.equal(result.code, 200); assert.equal(result.data.patients.length, 3);
  const pending = result.data.patients.find(patient => patient.is_verified === false && patient.user_id);
  const active = result.data.patients.find(patient => patient.is_verified === true);
  const noAccount = result.data.patients.find(patient => patient.patient_id === "no-account");
  assert.ok(pending); assert.ok(active); assert.equal(noAccount.is_verified, false);
  assert.ok(result.data.patients.every(patient => !Object.hasOwn(patient, "password") && !Object.hasOwn(patient, "verification_token")));
  const archived = response();
  await getAllPatients({ user: { role: "admin" }, query: { archived: "true" } }, archived);
  assert.equal(archived.data.patients.length, 1); assert.equal(archived.data.patients[0].is_verified, true);
});

async function emailCorrectionHandler(deliver = async email => {
  const sent = await service.initiate(email);
  return { status: sent ? "sent" : "pending", message: "Confirmation email sent." };
}, database = sql) {
  return (await loadSource("controllers/patients/updateRequests.controller.js", ["updatePendingPortalEmail"], {
    sql: database, normalizeEmail, isValidEmail, deliverAccountSetup: deliver,
    PatientPolicy: { createAccount: user => ["admin", "health_worker"].includes(user.role) },
  })).updatePendingPortalEmail;
}
const emailCorrectionRequest = (id, email = "corrected@example.com", role = "health_worker", current = "patient@example.com") => ({
  user: { user_id: "staff", role }, params: { patientId: id }, body: { email, current_email: current },
});

test("staff can correct a pending email, invalidating the old link and verifying only through the new link", async () => {
  const id = await provision(); await service.initiate("patient@example.com");
  const oldToken = mail[0].token;
  const correct = await emailCorrectionHandler(); const result = response();
  await correct(emailCorrectionRequest(id, " CORRECTED@Example.com "), result);
  assert.equal(result.code, 200); assert.equal(result.data.patient.email, "corrected@example.com");
  assert.equal(result.data.patient.is_verified, false); assert.equal(result.data.verification.status, "sent");
  assert.equal(mail.length, 2); assert.equal(mail[1].email, "corrected@example.com");
  assert.equal(await service.complete(oldToken, password), null);
  assert.equal((await sql`SELECT COUNT(*)::int AS count FROM patients`)[0].count, 1);
  assert.equal((await sql`SELECT COUNT(*)::int AS count FROM users`)[0].count, 1);
  const completed = await service.complete(mail[1].token, password);
  assert.equal(completed.email, "corrected@example.com");
});

test("email correction rejects non-staff, bad addresses, duplicates, stale edits, and verified or archived accounts", async () => {
  const id = await provision();
  const correct = await emailCorrectionHandler();
  await provision({ email: "other@example.com" });
  for (const [req, code] of [
    [emailCorrectionRequest(id, "corrected@example.com", "patient"), 403],
    [emailCorrectionRequest(id, "not-an-email"), 422],
    [emailCorrectionRequest(id, "other@example.com"), 422],
    [emailCorrectionRequest(id, "patient@example.com"), 422],
    [emailCorrectionRequest(id, "corrected@example.com", "admin", "stale@example.com"), 409],
    [emailCorrectionRequest("missing"), 404],
  ]) {
    const result = response(); await correct(req, result); assert.equal(result.code, code);
  }
  await sql`UPDATE users SET is_verified = TRUE WHERE user_id = ${id}`;
  const verified = response(); await correct(emailCorrectionRequest(id), verified); assert.equal(verified.code, 409);
  await sql`UPDATE users SET is_verified = FALSE WHERE user_id = ${id}`;
  await sql`UPDATE patients SET archived_at = NOW() WHERE patient_id = ${id}`;
  const archived = response(); await correct(emailCorrectionRequest(id), archived); assert.equal(archived.code, 404);
  assert.equal(mail.length, 0);
  assert.equal((await sql`SELECT email FROM users WHERE user_id = ${id}`)[0].email, "patient@example.com");
});

test("failed delivery keeps the corrected email pending and leaves the previous link invalid", async () => {
  const id = await provision(); await service.initiate("patient@example.com");
  const oldToken = mail[0].token;
  const correct = await emailCorrectionHandler(async () => ({ status: "failed", message: "Email unavailable." }));
  const result = response(); await correct(emailCorrectionRequest(id, "corrected@example.com", "admin"), result);
  assert.equal(result.code, 200); assert.equal(result.data.verification.status, "failed");
  assert.match(result.data.verification.message, /Email updated/);
  const user = (await sql`SELECT * FROM users WHERE user_id = ${id}`)[0];
  assert.equal(user.email, "corrected@example.com"); assert.equal(user.is_verified, false);
  assert.equal(user.verification_token, null); assert.equal(user.verification_sent_at, null);
  assert.equal(await service.complete(oldToken, password), null);
  assert.equal(await service.initiate("corrected@example.com"), true);
});

test("confirmation winning a race prevents a staff correction from changing an active account", async () => {
  const id = await provision(); await service.initiate("patient@example.com");
  let completed;
  const database = async (strings, ...params) => {
    if (strings.join("").includes("UPDATE users u SET email")) completed = await service.complete(mail[0].token, password);
    return sql(strings, ...params);
  };
  const correct = await emailCorrectionHandler(async () => { throw new Error("Must not send after losing the race"); }, database);
  const result = response(); await correct(emailCorrectionRequest(id), result);
  assert.ok(completed); assert.equal(result.code, 409);
  const user = (await sql`SELECT email, is_verified FROM users WHERE user_id = ${id}`)[0];
  assert.equal(user.email, "patient@example.com"); assert.equal(user.is_verified, true);
});

test("concurrent staff email corrections cannot silently overwrite each other", async () => {
  const id = await provision(); const correct = await emailCorrectionHandler();
  const first = response(), second = response();
  await Promise.all([
    correct(emailCorrectionRequest(id, "first@example.com"), first),
    correct(emailCorrectionRequest(id, "second@example.com", "admin"), second),
  ]);
  assert.deepEqual([first.code, second.code].sort(), [200, 409]);
  assert.equal(mail.length, 1);
  assert.equal((await sql`SELECT email FROM users WHERE user_id = ${id}`)[0].email, mail[0].email);
});

test("SMTP uses encrypted Gmail transport and sends a confirmation link without a password", async () => {
  let transportOptions, message;
  const ENV = { GMAIL_USER: "sender@gmail.com", GMAIL_APP_PASSWORD: "test-app-password", FRONTEND_URL: "https://healthtrack.example", NODE_ENV: "production" };
  const { sendVerificationEmail, assertMailConfigured } = await loadSource("services/mail.service.js", ["sendVerificationEmail", "assertMailConfigured"], {
    ENV, URL,
    nodemailer: { createTransport(options) { transportOptions = options; return { sendMail: async (mail) => { message = mail; return { accepted: [mail.to] }; } }; } },
  });
  const token = randomBytes(32).toString("hex");
  await sendVerificationEmail("patient@example.com", token);
  assert.equal(transportOptions.host, "smtp.gmail.com"); assert.equal(transportOptions.port, 465); assert.equal(transportOptions.secure, true);
  assert.equal(message.from.address, ENV.GMAIL_USER); assert.equal(message.to, "patient@example.com");
  assert.ok(message.text.includes(`https://healthtrack.example/confirm-account?token=${token}`));
  assert.match(message.html, /Yes, this is me/); assert.match(message.html, /15 minutes/);
  assert.ok(!message.html.includes(ENV.GMAIL_APP_PASSWORD));
  ENV.FRONTEND_URL = "http://healthtrack.example";
  assert.throws(assertMailConfigured, /HTTPS/);
  ENV.GMAIL_APP_PASSWORD = "";
  assert.throws(assertMailConfigured, /not configured/);
});

test("Brevo sends verification through HTTPS without opening SMTP", async () => {
  let request;
  const ENV = { MAIL_PROVIDER: "brevo", MAIL_FROM_EMAIL: "verified@example.com", BREVO_API_KEY: "test-api-key", FRONTEND_URL: "https://healthtrack.example", NODE_ENV: "production" };
  const { sendVerificationEmail } = await loadSource("services/mail.service.js", ["sendVerificationEmail"], {
    ENV, URL, AbortSignal,
    nodemailer: { createTransport() { throw new Error("SMTP must not be used on the Brevo path"); } },
    fetch: async (url, options) => { request = { url, ...options }; return { ok: true, json: async () => ({ messageId: "test-message-id" }) }; },
  });
  const token = randomBytes(32).toString("hex");
  await sendVerificationEmail("patient@example.com", token);
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(request.method, "POST"); assert.equal(request.headers["api-key"], ENV.BREVO_API_KEY);
  assert.ok(request.signal);
  const body = JSON.parse(request.body);
  assert.deepEqual(body.sender, { name: "HealthTrack System", email: "verified@example.com" });
  assert.deepEqual(body.to, [{ email: "patient@example.com" }]);
  assert.ok(body.textContent.includes(`https://healthtrack.example/confirm-account?token=${token}`));
  assert.match(body.htmlContent, /Yes, this is me/);
  assert.ok(!request.body.includes(ENV.BREVO_API_KEY));
});

test("Brevo rejects provider failures, malformed acceptance, and timeouts without exposing secrets", async () => {
  const ENV = { MAIL_PROVIDER: "brevo", MAIL_FROM_EMAIL: "verified@example.com", BREVO_API_KEY: "private-test-key", FRONTEND_URL: "https://healthtrack.example", NODE_ENV: "production" };
  const cases = [
    { fetch: async () => ({ ok: false, status: 401 }), code: "BREVO_HTTP_401" },
    { fetch: async () => ({ ok: false, status: 429 }), code: "BREVO_HTTP_429" },
    { fetch: async () => ({ ok: false, status: 500 }), code: "BREVO_HTTP_500" },
    { fetch: async () => ({ ok: true, json: async () => ({}) }), code: "BREVO_INVALID_RESPONSE" },
    { fetch: async () => { throw Object.assign(new Error(ENV.BREVO_API_KEY), { code: 23 }); }, code: "BREVO_REQUEST_FAILED" },
  ];
  for (const scenario of cases) {
    const { sendVerificationEmail } = await loadSource("services/mail.service.js", ["sendVerificationEmail"], { ENV, URL, AbortSignal, nodemailer: {}, fetch: scenario.fetch });
    await assert.rejects(sendVerificationEmail("patient@example.com", "a".repeat(64)), (error) => {
      assert.equal(error.code, scenario.code);
      assert.ok(!error.message.includes(ENV.BREVO_API_KEY));
      return true;
    });
  }
});

test("Brevo requires its own API key and sender, and invalid provider names fail explicitly", async () => {
  const ENV = { MAIL_PROVIDER: "brevo", GMAIL_USER: "sender@gmail.com", GMAIL_APP_PASSWORD: "gmail-only-password", FRONTEND_URL: "https://healthtrack.example", NODE_ENV: "production" };
  const { assertMailConfigured } = await loadSource("services/mail.service.js", ["assertMailConfigured"], { ENV, URL, nodemailer: {} });
  assert.throws(assertMailConfigured, /BREVO_API_KEY/);
  ENV.BREVO_API_KEY = "test-api-key";
  assert.throws(assertMailConfigured, /MAIL_FROM_EMAIL/);
  ENV.MAIL_FROM_EMAIL = "verified@example.com";
  assert.doesNotThrow(assertMailConfigured);
  ENV.MAIL_PROVIDER = "typo";
  assert.throws(assertMailConfigured, /MAIL_PROVIDER/);
});
