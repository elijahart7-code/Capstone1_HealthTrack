process.env.APP_PORTAL = "staff";
process.env.PORT ||= "5001";
await import("../server.js");
