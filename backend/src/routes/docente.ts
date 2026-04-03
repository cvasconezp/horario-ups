import { Hono } from "hono";
import prisma from "../db";
import { generateICalendar, CalendarSession } from "../lib/ical";
import { JWTPayload } from "../middleware/auth";

const docente_routes = new Hono();

docente_routes.get("/mi-horario/:periodoId", async (c) => {
  try {
    const user = (c.get as any)("user") as JWTPayload | undefined;
    if (!user || !user.docenteId) {
      return c.json({ error: "Not a docente or not authenticated" }, 403);
    }

    const { periodoId } = c.req.param();

    const asignaciones = await prisma.asignacion.findMany({
      where: {
        docenteId: user.docenteId,
        materia: {
          periodoId: parseInt(periodoId),
        },
      },
      include: {
        materia: {
          include: {
            nivel: {
              include: { carrera: true },
            },
          },
        },
        docente: true,
        centro: true,
      },
    });

    return c.json(asignaciones);
  } catch (error) {
    return c.json({ error: "Failed to fetch schedule" }, 500);
  }
});

docente_routes.get("/mis-sesiones/:periodoId", async (c) => {
  try {
    const user = (c.get as any)("user") as JWTPayload | undefined;
    if (!user || !user.docenteId) {
      return c.json({ error: "Not a docente or not authenticated" }, 403);
    }

    const { periodoId } = c.req.param();

    const materias = await prisma.materia.findMany({
      where: {
        periodoId: parseInt(periodoId),
        asignaciones: {
          some: {
            docenteId: user.docenteId,
          },
        },
      },
      include: {
        sesionesOnline: {
          orderBy: { fecha: "asc" },
        },
      },
    });

    const sesiones = materias.flatMap((materia: any) =>
      materia.sesionesOnline.map((sesion: any) => ({
        ...sesion,
        materiaNombre: materia.nombre,
      }))
    );

    return c.json(sesiones);
  } catch (error) {
    return c.json({ error: "Failed to fetch online sessions" }, 500);
  }
});

docente_routes.get("/mis-presenciales/:periodoId", async (c) => {
  try {
    const user = (c.get as any)("user") as JWTPayload | undefined;
    if (!user || !user.docenteId) {
      return c.json({ error: "Not a docente or not authenticated" }, 403);
    }

    const { periodoId } = c.req.param();

    const presenciales = await prisma.sesionPresencial.findMany({
      where: {
        docenteId: user.docenteId,
        materia: {
          periodoId: parseInt(periodoId),
        },
      },
      include: {
        materia: {
          include: {
            nivel: true,
          },
        },
        centro: true,
      },
      orderBy: { fecha: "asc" },
    });

    return c.json(presenciales);
  } catch (error) {
    return c.json({ error: "Failed to fetch presencial sessions" }, 500);
  }
});

docente_routes.get("/calendario/:periodoId/ical", async (c) => {
  try {
    const user = (c.get as any)("user") as JWTPayload | undefined;
    if (!user || !user.docenteId) {
      return c.json({ error: "Not a docente or not authenticated" }, 403);
    }

    const { periodoId } = c.req.param();

    const docente = await prisma.docente.findUnique({
      where: { id: user.docenteId },
    });

    if (!docente) {
      return c.json({ error: "Docente not found" }, 404);
    }

    const presenciales = await prisma.sesionPresencial.findMany({
      where: {
        docenteId: user.docenteId,
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

    const sesionesOnline = await prisma.sesionOnline.findMany({
      where: {
        materia: {
          asignaciones: {
            some: {
              docenteId: user.docenteId,
            },
          },
          periodoId: parseInt(periodoId),
        },
      },
      include: {
        materia: true,
      },
      orderBy: { fecha: "asc" },
    });

    const calendarSessions: CalendarSession[] = [];

    presenciales.forEach((sesion: any) => {
      const [startHour, startMin] = sesion.horaInicio.split(":").map(Number);
      const [endHour, endMin] = sesion.horaFin.split(":").map(Number);

      const startDate = new Date(sesion.fecha);
      startDate.setHours(startHour, startMin);

      const endDate = new Date(sesion.fecha);
      endDate.setHours(endHour, endMin);

      calendarSessions.push({
        id: sesion.id,
        title: `${sesion.materia.nombre} (${sesion.tipo})`,
        description: `Nivel: ${sesion.materia.nombreCorto}`,
        startDate,
        endDate,
        location: sesion.centro.nombre,
      });
    });

    sesionesOnline.forEach((sesion: any) => {
      const [hour, min] = sesion.hora.split(":").map(Number);

      const startDate = new Date(sesion.fecha);
      startDate.setHours(hour, min);

      const endDate = new Date(sesion.fecha);
      endDate.setHours(hour + 1, min);

      calendarSessions.push({
        id: sesion.id,
        title: `${sesion.materia.nombre} (${sesion.tipo}) - Unidad ${sesion.unidad}`,
        description: sesion.grupo ? `Grupo: ${sesion.grupo}` : "",
        startDate,
        endDate,
      });
    });

    const icalContent = generateICalendar(docente.nombre, calendarSessions);

    c.header("Content-Type", "text/calendar; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="horario-${docente.nombre.replace(/\s+/g, "-")}.ics"`);

    return c.text(icalContent);
  } catch (error) {
    return c.json({ error: "Failed to generate calendar" }, 500);
  }
});

export default docente_routes;
