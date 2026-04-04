import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { execSync } from "child_process";
import prisma from "./db.js";
import { authMiddleware, requireRole } from "./middleware/auth.js";
import public_routes from "./routes/public.js";
import auth_routes from "./routes/auth.js";
import admin_routes from "./routes/admin.js";
import docente_routes from "./routes/docente.js";

const app = new Hono();
const PORT = parseInt(process.env.PORT || "3001");

app.use("*", cors({ origin: "*" }));

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// TEMPORARY: runtime migration endpoint - REMOVE after migration
app.get("/fix-migrate", async (c) => {
  try {
    const output = execSync("npx prisma db push --accept-data-loss", {
      encoding: "utf-8",
      timeout: 30000,
    });
    return c.json({ ok: true, output });
  } catch (err: unknown) {
    const error = err as Error & { stdout?: string; stderr?: string };
    return c.json({ ok: false, error: error.message, stdout: error.stdout, stderr: error.stderr }, 500);
  }
});

app.route("/api", public_routes);

app.route("/api/auth", auth_routes);

app.use("/api/admin/*", authMiddleware);
app.use("/api/admin/*", requireRole("superadmin", "coordinador"));
app.route("/api/admin", admin_routes);

app.use("/api/docente/*", authMiddleware);
app.route("/api/docente", docente_routes);

app.use(async (c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((error: Error, c) => {
  console.error("[Error]", error);
  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    },
    500
  );
});

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(`Server running on http://${info.address}:${info.port}`);
  }
);

const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default server;
