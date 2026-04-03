import { Hono } from "hono";
import prisma from "../db.js";

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

public_routes.get("/horarios/:periodoId/:nivelId/:centroId", async (c) => {
  try {
    const { periodoId, nivelId, centroId } = c.req.param();

    const [periodo, nivel, centro, materias] = await Promise.all([
      prisma.periodo.findUnique({ where: { id: parseInt(periodoId) } }),
      prisma.nivel.findUnique({ where: { id: parseInt(nivelId) } }),
      prisma.centro.findUnique({ where: { id: parseInt(centroId) } }),
      prisma.materia.findMany({
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
      }),
    ]);

    if (!periodo || !nivel || !centro) {
      return c.json({ error: "Periodo, nivel, or centro not found" }, 404);
    }

    // Transform materias to include docente and enlaceVirtual from asignaciones
    const materiasConDocente = materias.map((m) => {
      const asignacion = m.asignaciones[0];
      return {
        ...m,
        docente: asignacion?.docente || null,
        enlaceVirtual: asignacion?.enlaceVirtual || null,
      };
    });

    return c.json({
      periodo,
      nivel,
      centro,
      materias: materiasConDocente,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch schedule" }, 500);
  }
});

public_routes.get("/sesiones-online", async (c) => {
  try {
    const periodoId = c.req.query("periodoId");
    const nivelId = c.req.query("nivelId");

    if (!periodoId || !nivelId) {
      return c.json({ error: "periodoId and nivelId are required" }, 400);
    }

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

public_routes.get("/sesiones-presenciales", async (c) => {
  try {
    const periodoId = c.req.query("periodoId");
    const nivelId = c.req.query("nivelId");
    const centroId = c.req.query("centroId");

    if (!periodoId || !nivelId || !centroId) {
      return c.json({ error: "periodoId, nivelId, and centroId are required" }, 400);
    }

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

public_routes.get("/calendario", async (c) => {
  try {
    const periodoId = c.req.query("periodoId");

    if (!periodoId) {
      return c.json({ error: "periodoId is required" }, 400);
    }

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

// ============================================================
// iCal endpoint for calendar subscription
// ============================================================
public_routes.get("/ical/:periodoId/:nivelId/:centroId", async (c) => {
  try {
    const { periodoId, nivelId, centroId } = c.req.param();
    const pId = parseInt(periodoId);
    const nId = parseInt(nivelId);
    const cId = parseInt(centroId);

    const [periodo, nivel, centro, sesionesOnline, sesionesPresenciales, eventos] = await Promise.all([
      prisma.periodo.findUnique({ where: { id: pId } }),
      prisma.nivel.findUnique({ where: { id: nId } }),
      prisma.centro.findUnique({ where: { id: cId } }),
      prisma.sesionOnline.findMany({
        where: { materia: { periodoId: pId, nivelId: nId } },
        include: { materia: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.sesionPresencial.findMany({
        where: { centroId: cId, materia: { periodoId: pId, nivelId: nId } },
        include: { materia: true, docente: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.calendarioEvento.findMany({
        where: { periodoId: pId },
        orderBy: { fecha: "asc" },
      }),
    ]);

    if (!periodo || !nivel || !centro) {
      return c.json({ error: "Not found" }, 404);
    }

    const calName = `Horario ${nivel.nombre} - ${centro.nombre} - ${periodo.label}`;
    const now = formatICalDate(new Date());

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UPS//Horario EIB//ES",
      `X-WR-CALNAME:${calName}`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    // Online sessions as events
    for (const s of sesionesOnline) {
      const dtStart = formatICalDateTime(s.fecha, s.hora);
      const dtEnd = formatICalDateTime(s.fecha, s.hora, 2); // 2 hour duration
      const summary = `${s.materia.nombreCorto} - ${s.tipo === "tutoria" ? "Tutoría" : "Clase"} Online`;
      const description = `Materia: ${s.materia.nombre}\\nTipo: ${s.tipo}\\nUnidad: ${s.unidad}${s.grupo ? "\\nGrupo: " + s.grupo : ""}`;

      ics.push(
        "BEGIN:VEVENT",
        `UID:online-${s.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        "END:VEVENT"
      );
    }

    // Presencial sessions as events
    for (const s of sesionesPresenciales) {
      const dtStart = formatICalDateTime(s.fecha, s.horaInicio);
      const dtEnd = formatICalDateTime(s.fecha, s.horaFin);
      const tipoLabel = s.tipo === "examen" ? "Examen" : "Clase Presencial";
      const summary = `${s.materia.nombreCorto} - ${tipoLabel}`;
      const description = `Materia: ${s.materia.nombre}\\nTipo: ${tipoLabel}\\nBimestre: ${s.bimestre}${s.docente ? "\\nDocente: " + s.docente.nombre : ""}`;
      const location = centro.nombre;

      ics.push(
        "BEGIN:VEVENT",
        `UID:presencial-${s.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        "END:VEVENT"
      );
    }

    // Calendar events
    for (const e of eventos) {
      const dtStart = formatICalDate(e.fecha);
      const dtEnd = e.fechaFin ? formatICalDate(e.fechaFin) : dtStart;
      const summary = `${e.tipo}${e.bimestre ? " - Bimestre " + e.bimestre : ""}`;
      const description = e.nota ? e.nota.replace(/\n/g, "\\n") : "";

      ics.push(
        "BEGIN:VEVENT",
        `UID:evento-${e.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${summary}`,
        description ? `DESCRIPTION:${description}` : "",
        "END:VEVENT"
      );
    }

    ics.push("END:VCALENDAR");

    // Filter out empty lines
    const body = ics.filter((line) => line !== "").join("\r\n");

    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="horario-${periodoId}-${nivelId}-${centroId}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[iCal Error]", error);
    return c.json({ error: "Failed to generate calendar" }, 500);
  }
});

// Helper: format Date as iCal date (YYYYMMDD)
function formatICalDate(d: Date): string {
  const date = new Date(d);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// Helper: format Date + time string as iCal datetime (YYYYMMDDTHHMMSS)
function formatICalDateTime(d: Date, timeStr: string, addHours: number = 0): string {
  const date = new Date(d);
  // timeStr format: "HH:MM" or "HH:MM:SS"
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0]) + addHours;
  const minutes = parseInt(parts[1]) || 0;
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const h = String(hours).padStart(2, "0");
  const mi = String(minutes).padStart(2, "0");
  return `${y}${mo}${day}T${h}${mi}00`;
}

export default public_routes;
