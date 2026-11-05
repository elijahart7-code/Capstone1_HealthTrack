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
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const scratch = await mkdtemp(path.join(tmpdir(), "healthtrack-setup-ui-"));
const outfile = path.join(scratch, "ui.mjs");
await build({
  stdin: { contents: `
    export { ConfirmAccountPage, RequestAccountSetupPage } from './src/auth/AccountSetupPage.jsx';
    export { api } from './src/lib/axios.js';
    export { createRoot } from 'react-dom/client';
    export { MemoryRouter, Routes, Route } from 'react-router';
    export { createElement as h, act } from 'react';
  `, resolveDir: fileURLToPath(new URL("..", import.meta.url)), loader: "jsx" },
  bundle: true, format: "esm", platform: "browser", jsx: "automatic", outfile,
  define: { "import.meta.env.VITE_API_BASE_URL": '"/api"', "process.env.NODE_ENV": '"development"' },
});
const { ConfirmAccountPage, RequestAccountSetupPage, api, createRoot, MemoryRouter, Routes, Route, h, act } = await import(pathToFileURL(outfile));
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
