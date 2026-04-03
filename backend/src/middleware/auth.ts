import { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";

export interface JWTPayload {
  id: number;
  email: string;
  rol: string;
  docenteId?: number | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function authMiddleware(c: Context, next: Next): Promise<Response | undefined> {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    (c.set as any)("user", decoded);
    await next();
    return undefined;
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const user = (c.get as any)("user") as JWTPayload | undefined;
    if (!user || !roles.includes(user.rol)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
    return undefined;
  };
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
