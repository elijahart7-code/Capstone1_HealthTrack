const portals = { admin: { role: "admin", port: "5001" }, "health-worker": { role: "health_worker", port: "5002" } };
const portal = portals[process.argv[2]];
if (!portal) throw new Error("Choose admin or health-worker.");
process.env.APP_PORTAL = portal.role;
process.env.PORT ||= portal.port;
await import("../server.js");
