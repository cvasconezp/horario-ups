import { Hono } from "hono";
import * as bcrypt from "bcryptjs";
import prisma from "../db.js";
import { generateToken, JWTPayload } from "../middleware/auth.js";

const auth_routes = new Hono();

interface LoginRequest {
  email: string;
  password: string;
}

auth_routes.post("/login", async (c) => {
  try {
    const body = await c.req.json() as LoginRequest;

    if (!body.email || !body.password) {
      return c.json(
        { error: "Email and password are required" },
        400
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: body.email },
      include: { docente: true },
    });

    if (!usuario) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const passwordValid = await bcrypt.compare(body.password, usuario.passwordHash);
    if (!passwordValid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const payload: JWTPayload = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      docenteId: usuario.docenteId || undefined,
    };

    const token = generateToken(payload);

    return c.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        docenteId: usuario.docenteId,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to login" }, 500);
  }
});

auth_routes.get("/me", async (c) => {
  try {
    const user = (c.get as any)("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { docente: true },
    });

    if (!usuario) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      docenteId: usuario.docenteId,
      docente: usuario.docente,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

export default auth_routes;
