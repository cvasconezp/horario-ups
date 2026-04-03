import { Hono } from "hono";
import prisma from "../db";

const public_routes = new Hono();

public_routes.get("/carreras", async (c) => {
  try {
    const carreras = await prisma.carrera.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
    });
    return c.json(carreras);
  } catch (error) {
    return c.json({ error: "Failed to fetch carreras" }, 500);
  }
});

public_routes.get("/periodos", async (c) => {
  try {
    const carreraId = c.req.query("carreraId");
    if (!carreraId) {
      return c.json({ error: "carreraId query parameter is required" }, 400);
    }

    const periodos = await prisma.periodo.findMany({
      where: {
        carreraId: parseInt(carreraId),
        activo: true,
      },
      orderBy: { numero: "asc" },
    });
    return c.json(periodos);
  } catch (error) {
    return c.json({ error: "Failed to fetch periodos" }, 500);
  }
});

public_routes.get("/niveles", async (c) => {
  try {
    const carreraId = c.req.query("carreraId");
    if (!carreraId) {
      return c.json({ error: "carreraId query parameter is required" }, 400);
    }

    const niveles = await prisma.nivel.findMany({
      where: {
        carreraId: parseInt(carreraId),
      },
      orderBy: { numero: "asc" },
    });
    return c.json(niveles);
  } catch (error) {
    return c.json({ error: "Failed to fetch niveles" }, 500);
  }
});

public_routes.get("/centros", async (c) => {
  try {
    const centros = await prisma.centro.findMany({
      orderBy: { nombre: "asc" },
    });
    return c.json(centros);
  } catch (error) {
    return c.json({ error: "Failed to fetch centros" }, 500);
  }
});

public_routes.get("/horario/:periodoId/:nivelId/:centroId", async (c) => {
  try {
    const { periodoId, nivelId, centroId } = c.req.param();

    const materias = await prisma.materia.findMany({
      where: {
        periodoId: parseInt(periodoId),
        nivelId: parseInt(nivelId),
      },
      include: {
        asignaciones: {
          where: {
            centroId: parseInt(centroId),
          },
          include: {
            docente: true,
            centro: true,
          },
        },
        presenciales: {
          where: {
            centroId: parseInt(centroId),
          },
          include: {
            docente: true,
          },
        },
      },
    });

    return c.json(materias);
  } catch (error) {
    return c.json({ error: "Failed to fetch schedule" }, 500);
  }
});

public_routes.get("/sesiones-online/:periodoId/:nivelId", async (c) => {
  try {
    const { periodoId, nivelId } = c.req.param();

    const sesiones = await prisma.sesionOnline.findMany({
      where: {
        materia: {
          periodoId: parseInt(periodoId),
          nivelId: parseInt(nivelId),
        },
      },
      include: {
        materia: true,
      },
      orderBy: { fecha: "asc" },
    });

    return c.json(sesiones);
  } catch (error) {
    return c.json({ error: "Failed to fetch online sessions" }, 500);
  }
});

public_routes.get("/presenciales/:periodoId/:nivelId/:centroId", async (c) => {
  try {
    const { periodoId, nivelId, centroId } = c.req.param();

    const sesiones = await prisma.sesionPresencial.findMany({
      where: {
        centroId: parseInt(centroId),
        materia: {
          periodoId: parseInt(periodoId),
          nivelId: parseInt(nivelId),
        },
      },
      include: {
        materia: true,
        docente: true,
      },
      orderBy: { fecha: "asc" },
    });

    return c.json(sesiones);
  } catch (error) {
    return c.json({ error: "Failed to fetch presencial sessions" }, 500);
  }
});

public_routes.get("/calendario/:periodoId", async (c) => {
  try {
    const { periodoId } = c.req.param();

    const eventos = await prisma.calendarioEvento.findMany({
      where: {
        periodoId: parseInt(periodoId),
      },
      orderBy: { fecha: "asc" },
    });

    return c.json(eventos);
  } catch (error) {
    return c.json({ error: "Failed to fetch calendar events" }, 500);
  }
});

public_routes.get("/docente/:docenteId/horario/:periodoId", async (c) => {
  try {
    const { docenteId, periodoId } = c.req.param();

    const asignaciones = await prisma.asignacion.findMany({
      where: {
        docenteId: parseInt(docenteId),
        materia: {
          periodoId: parseInt(periodoId),
        },
      },
      include: {
        materia: true,
        docente: true,
        centro: true,
      },
    });

    const presenciales = await prisma.sesionPresencial.findMany({
      where: {
        docenteId: parseInt(docenteId),
        materia: {
          periodoId: parseInt(periodoId),
        },
      },
      include: {
        materia: true,
        centro: true,
      },
      orderBy: { fecha: "asc" },
    });

    return c.json({
      asignaciones,
      presenciales,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch teacher schedule" }, 500);
  }
});

export default public_routes;
