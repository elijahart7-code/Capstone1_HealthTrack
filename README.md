# HealthTrack
HealthTrack: A Web-Based Barangay Patient Information Management System

Patient portal setup uses Express, PostgreSQL/Neon, React, and either Gmail SMTP through Nodemailer or Brevo's HTTPS email API. Staff register the patient first; there is no public sign-up. New accounts stay pending until the patient confirms their email and chooses a password.

Copy the settings in `backend/.env.example` into `backend/.env`, preserving your existing database and JWT settings. Set `GMAIL_USER` to the sending Google account and `GMAIL_APP_PASSWORD` to its Google App Password, rather than its normal password. Google requires 2-Step Verification for App Passwords; see [Google's instructions](https://support.google.com/accounts/answer/185833) and [Nodemailer's Gmail guide](https://nodemailer.com/guides/using-gmail). Keep `.env` private; it is ignored by Git. Space-separated App Passwords are normalized automatically.

Set `FRONTEND_URL` to the browser-accessible HealthTrack origin. Development defaults to `http://localhost:5173`; production requires HTTPS. A localhost link works only on the computer running the app. For other devices, use a reachable deployment URL. Restart the backend after changing environment settings. The existing `npm run dev` command starts both services; `npm start` serves the built frontend and API from the backend.

Render Free blocks outbound SMTP ports 25, 465, and 587, so Gmail SMTP cannot be used there. Use Brevo's HTTPS API instead; it sends over port 443. See [Render's SMTP restriction](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports) and [Brevo's transactional email API](https://developers.brevo.com/docs/send-a-transactional-email).

Create a free Brevo account, add and verify your sender email, and generate an **API key** under **SMTP & API → API keys**. An SMTP key or Google App Password will not work for this integration. Brevo's free plan currently allows 300 sends per day. If you use a Gmail sender, Brevo may replace the sending address with a `brevosend.com` address because Gmail's domain cannot be authenticated by you. See [Brevo sender setup](https://developers.brevo.com/docs/getting-started-with-senders-and-domains), [API key instructions](https://developers.brevo.com/docs/api-key-authentication), [free-plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), and [sender-address replacement](https://help.brevo.com/hc/en-us/articles/16045394674066-Troubleshooting-Domain-authentication).

Set the following on the **backend service** in **Render → Environment**, then save and deploy. Replace the placeholders with real values. Render keeps these settings across GitHub deployments; do not commit the secrets.

```env
NODE_ENV=production
MAIL_PROVIDER=brevo
BREVO_API_KEY=your-brevo-api-key
MAIL_FROM_EMAIL=your-verified-sender@gmail.com
FRONTEND_URL=https://your-healthtrack-frontend.onrender.com
DATABASE_URL=your-neon-postgresql-connection-string
JWT_SECRET=your-existing-production-secret
```

Keep the Neon connection string on Render rather than copying the local database URL. If frontend and backend are separate services, set backend `CORS_ORIGINS` to the frontend's HTTPS origin, set frontend `VITE_API_BASE_URL` to the backend's HTTPS URL followed by `/api`, and configure the frontend static site's rewrite `/*` → `/index.html` so email links open the React confirmation page. If both are served by this Express app, use that service's HTTPS URL for `FRONTEND_URL`; build with `npm run build` and start with `npm start` from the repository root. Do not run the local database or demo seeder on Render. The backend applies the additive verification migration to Neon automatically at startup.

For local Gmail testing, keep `MAIL_PROVIDER=gmail` (the default) and your existing Gmail settings. Brevo delivery requires only `BREVO_API_KEY` and `MAIL_FROM_EMAIL`; Gmail credentials are not sent to Brevo. Email requests time out after 15 seconds and are not automatically retried, to avoid duplicate sends after an ambiguous timeout. Provider acceptance confirms queuing, not inbox delivery; check Brevo's transactional logs and the recipient's spam folder when testing.

The backend applies the verification schema migration automatically at startup. Existing accounts retain access; newly created accounts default to unverified. Demo staff accounts created by `npm run seed --prefix backend` are explicitly verified. The old shared password is no longer assigned to new patient accounts.

- Patient registration's email checkbox sends a **Yes, this is me** confirmation link. If unchecked, the account remains pending and the patient can request a link later.
- `POST /api/auth/initiate` accepts `{ "email": "patient@example.com" }` and sends a setup email only for an unverified, staff-provisioned patient with an active patient record. Unknown, already verified, and recently emailed addresses receive the same generic response. Staff can resend from the patient record; patients can use **New patient? Set up your account** on the login screen.
- `GET /confirm-account?token=...` displays the password form and makes no account changes. Email scanners opening a link cannot activate an account.
- Staff can correct a pending account's email from **Patient record → Patient Portal Account → Change email**. `PATCH /api/patients/:patientId/portal-account/email` accepts the new `email` and the displayed `current_email`. It rejects verified accounts, archived patients, duplicate addresses, and stale edits. Saving preserves the same patient/account, invalidates the old link immediately, and sends a fresh confirmation to the new address. If delivery fails, the new address stays saved and pending so staff can retry with **Resend setup email**. No email change is available for already verified accounts through this flow.
- `POST /api/auth/complete` accepts `{ "token": "...", "new_password": "..." }`. Tokens use 32 random bytes, expire after 15 minutes, and are stored as SHA-256 hashes. Completion atomically checks expiry, stores a bcrypt password hash, marks the account verified, clears the token, and returns the existing JWT session format. The frontend signs the patient in immediately. Passwords require at least 12 characters and at most 72 UTF-8 bytes (bcrypt's limit).

Requests have IP rate limits and a persisted 60-second resend cooldown. Resending replaces the previous link. Failed delivery clears its token and cooldown, and preserves the patient record with a visible retry message. Email credentials and verification tokens are never returned by the API or logged. The IP limits use memory suitable for this single-process server; use a shared rate-limit store for multiple API instances and configure trusted proxies for your deployment.

If the API is unavailable, check that the PostgreSQL service specified by `DATABASE_URL` is running. Startup deliberately waits for the database. Missing email provider settings do not stop the API, but sending returns a clear error until configured.

Run checks with `npm test --prefix backend`, `npm test --prefix frontend`, and `npm run build --prefix frontend`.

## Separate Patient, Admin, and Health Worker applications

Each portal has its own website, build, API server, and browser session. Admin and Health Worker no longer share a staff app. All three use the same database, with server-side role checks on every protected API. The midwife uses the Admin account, and each health worker uses their own Health Worker account.

Start the local database with `npm run local-db --prefix backend`, then run `npm run dev` from the repository root after installing root, backend, and frontend dependencies. This starts:

| Application | Website | API |
| --- | --- | --- |
| Patient | `http://127.0.0.1:5173/patient/login` | `http://127.0.0.1:5000` |
| Midwife / Admin | `http://127.0.0.1:5174/admin/login` | `http://127.0.0.1:5001` |
| Health Worker | `http://127.0.0.1:5175/health-worker/login` | `http://127.0.0.1:5002` |

Alternatively, start each API with `npm run dev --prefix backend`, `npm run dev:admin --prefix backend`, and `npm run dev:health-worker --prefix backend`, and each website with the corresponding frontend scripts: `npm run dev --prefix frontend`, `npm run dev:admin --prefix frontend`, and `npm run dev:health-worker --prefix frontend`. Local servers bind to loopback. All three portals can stay signed in in ordinary tabs in the same browser; incognito is not needed. Their origins and session storage keys are separate, so logging into or out of one portal does not replace or clear another portal's session. Without a configured `JWT_SECRET`, development APIs generate temporary signing secrets on startup, so restarting an API signs its users out.

Each website shows Page not found for the other two portals' login and dashboard paths. Each API accepts sign-in only for its own role and exposes only that portal's endpoints. Admin and Health Worker APIs separately mount the shared patient-management endpoints, each restricted to its own role. They may resend patient setup emails after authentication; confirmation links must continue to use the public patient's `FRONTEND_URL`.

`npm run build --prefix frontend` produces `frontend/dist` (Patient), `frontend/dist-admin` (Admin), and `frontend/dist-health-worker` (Health Worker). Use `build:patient`, `build:admin`, or `build:health-worker` with `--prefix frontend` to build individually. `npm start` serves only Patient. `npm run start:admin` and `npm run start:health-worker` serve their respective portals (local defaults 5001 and 5002; a hosting provider's PORT takes precedence). All deployments need database settings and a strong production `JWT_SECRET`.

Render Free cannot hide ports at the network layer, so each staff service hides behind its own `STAFF_SITE_KEY` (a long random value, distinct per service; the Patient service needs none and ignores it). Staff browsers enter the key once on the Restricted area screen, which sets the `ht_site` cookie for 12 hours; API clients may send the `x-site-key` header instead. Wrong keys answer 404. Production staff services refuse to start without the key. Local development shares one key in `backend/.env` for both staff portals. Set each `CORS_ORIGINS` to its own frontend origin when deployed separately. Replace the former shared staff deployment with two deployments; the old `staff` mode and commands have been removed. Existing sessions on the former staff site are not reused; sign into each new portal once.

This is local application/API/session separation, not an identity gateway or MFA implementation. A person using this PC can still visit either staff portal's port and see its login form. Before exposing Admin and Health Worker deployments online, place both websites and APIs behind a VPN or identity-aware access gateway restricted to approved people, block direct origin access, and require MFA. The free localhost demonstration does not configure Cloudflare or publish the apps.

For a local PostgreSQL database without Docker, run `npm run local-db --prefix backend` in a separate terminal and keep it running. It creates a persistent cluster on `127.0.0.1:55433`, generates a private database password, and updates `backend/.env`. The earlier environment configuration is preserved in the ignored `backend/.env.before-local-db` file. Restart the API after switching databases. Data and connection settings remain in the ignored `backend/.local-db` directory across restarts. Stop the database with Ctrl+C. This starts a separate empty database; it does not migrate records from another server.

On a fresh local database, `npm run seed --prefix backend` creates demo staff accounts: `admin@healthtrack.test` and `healthworker@healthtrack.test`, both with password `password`. These accounts are for local development only. The backend tests use isolated PostgreSQL instances and stub email delivery, so they do not send email or modify the app database.
