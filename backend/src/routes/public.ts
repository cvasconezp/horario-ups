import { Hono } from "hono";
import prisma from "../db.js";

const public_routes = new Hono();

// Auto-detect active periodo based on current date
public_routes.get("/activo", async (c) => {
  try {
    const now = new Date();

    // Find the active periodo that covers the current date (or the most recent active one)
    let periodo = await prisma.periodo.findFirst({
      where: {
        activo: true,
        fechaInicio: { lte: now },
        fechaFin: { gte: now },
      },
      include: { carrera: true },
      orderBy: { fechaInicio: "desc" },
    });

    // If no periodo covers today, get the nearest upcoming active one
    if (!periodo) {
      periodo = await prisma.periodo.findFirst({
        where: { activo: true },
        include: { carrera: true },
        orderBy: { fechaInicio: "desc" },
      });
    }

    if (!periodo) {
      return c.json({ error: "No hay período activo" }, 404);
    }

    const [niveles, centros] = await Promise.all([
      prisma.nivel.findMany({
        where: { carreraId: periodo.carreraId },
        orderBy: { numero: "asc" },
      }),
      prisma.centro.findMany({
        orderBy: { nombre: "asc" },
      }),
    ]);

    // Build centro→niveles mapping from actual asignaciones
    const asignaciones = await prisma.asignacion.findMany({
      where: {
        materia: { periodoId: periodo.id },
      },
      select: {
        centroId: true,
        materia: { select: { nivelId: true } },
      },
    });

    const centroNiveles: Record<number, number[]> = {};
    asignaciones.forEach((a) => {
      if (!centroNiveles[a.centroId]) centroNiveles[a.centroId] = [];
      if (!centroNiveles[a.centroId].includes(a.materia.nivelId)) {
        centroNiveles[a.centroId].push(a.materia.nivelId);
      }
    });

    return c.json({
      periodo,
      carrera: periodo.carrera,
      niveles,
      centros,
      centroNiveles,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch active period" }, 500);
  }
});

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
    const centroId = c.req.query("centroId");
    const bimestre = c.req.query("bimestre");

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

    // If centroId is provided, apply two filters:
    // 1. Filter by "grupo": each session may belong to a specific grupo
    //    (e.g. "Amazonía Norte") or be general (grupo=null for main 4 centros)
    // 2. Filter by bimestre based on zona:
    //    - Zona Norte: Otavalo (3), Cayambe (2), Amazonía Norte (5), Wasakentsa (6) → use bimestreOC
    //    - Zona Sur: Latacunga (1), Riobamba (4) → use bimestreRL
    //    - Todos los centros (7): no bimestre filter
    if (centroId) {
      const cId = parseInt(centroId);

      // Zona mapping
      const zonaNorteCentros = [2, 3, 5, 6]; // Cayambe, Otavalo, Amazonía Norte, Wasakentsa
      const zonaSurCentros = [1, 4];          // Latacunga, Riobamba
      const isNorte = zonaNorteCentros.includes(cId);
      const isSur = zonaSurCentros.includes(cId);

      // Grupo mapping: which grupo value corresponds to each special centro
      const centroGrupoMap: Record<number, string> = {
        5: "Amazonía Norte",
        // 6: "Wasakentsa", // Add if Wasakentsa has its own grupo sessions
      };

      // Determine current bimestre
      let currentBimestre = bimestre ? parseInt(bimestre) : 0;
      if (!currentBimestre) {
        const periodo = await prisma.periodo.findUnique({
          where: { id: parseInt(periodoId) },
        });
        if (periodo) {
          const now = new Date();
          const inicio = new Date(periodo.fechaInicio);
          const fin = new Date(periodo.fechaFin);
          const mid = new Date(
            inicio.getTime() + (fin.getTime() - inicio.getTime()) / 2
          );
          currentBimestre = now < mid ? 1 : 2;
        } else {
          currentBimestre = 1;
        }
      }

      const expectedGrupo = centroGrupoMap[cId] || null;

      const filtered = sesiones.filter((s) => {
        // Step 1: Filter by grupo
        // If centro has a specific grupo (e.g. Amazonía Norte), show only sessions with that grupo
        // If centro is a main centro (1-4), show only sessions with grupo = null
        // If centro is "Todos los centros" (7), show all sessions
        if (cId === 7) {
          // "Todos los centros" — show Contingencia grupo sessions (nivel 9)
          // or all sessions if no grupo-based filtering needed
        } else if (expectedGrupo) {
          // Special centro: only show sessions matching its grupo
          if (s.grupo !== expectedGrupo) return false;
        } else {
          // Main centro (1-4): only show sessions WITHOUT a specific grupo
          if (s.grupo !== null && s.grupo !== undefined) return false;
        }

        // Step 2: Filter by bimestre based on zona
        if (isNorte || isSur) {
          const mat = s.materia;
          const bim = isNorte
            ? (mat as any).bimestreOC
            : (mat as any).bimestreRL;
          // 0 or null = todo el semestre (show always), otherwise must match current bimestre
          if (bim !== null && bim !== undefined && bim !== 0 && bim !== currentBimestre) {
            return false;
          }
        }

        return true;
      });

      return c.json(filtered);
    }

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
    const nivelId = c.req.query("nivelId");

    if (!periodoId) {
      return c.json({ error: "periodoId is required" }, 400);
    }

    const eventos = await prisma.calendarioEvento.findMany({
      where: {
        periodoId: parseInt(periodoId),
      },
      orderBy: { fecha: "asc" },
    });

    // Filter by nivelId: show events with nivelId=null (global) or matching nivelId
    if (nivelId) {
      const nId = parseInt(nivelId);
      return c.json(eventos.filter((e) => e.nivelId === null || e.nivelId === nId));
    }

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
// Docente search (public, but accessed after docente login)
// ============================================================
public_routes.get("/docentes/buscar", async (c) => {
  try {
    const q = c.req.query("q") || "";
    if (q.length < 2) {
      return c.json([]);
    }

    const docentes = await prisma.docente.findMany({
      where: {
        nombre: { contains: q, mode: "insensitive" },
      },
      orderBy: { nombre: "asc" },
      take: 15,
    });

    return c.json(docentes.map((d: any) => ({ id: d.id, nombre: d.nombre })));
  } catch (error) {
    return c.json({ error: "Failed to search docentes" }, 500);
  }
});

// ============================================================
// Docente schedule (public endpoint, accessed after docente login)
// ============================================================
public_routes.get("/docentes/:docenteId/horario", async (c) => {
  try {
    const { docenteId } = c.req.param();
    const periodoId = c.req.query("periodoId");
    const dId = parseInt(docenteId);

    if (!periodoId) {
      return c.json({ error: "periodoId is required" }, 400);
    }
    const pId = parseInt(periodoId);

    const docente = await prisma.docente.findUnique({ where: { id: dId } });
    if (!docente) {
      return c.json({ error: "Docente not found" }, 404);
    }

    const [asignaciones, presenciales, eventos] = await Promise.all([
      prisma.asignacion.findMany({
        where: {
          docenteId: dId,
          materia: { periodoId: pId },
        },
        include: {
          materia: {
            include: { nivel: true },
          },
          centro: true,
          docente: true,
        },
        orderBy: [
          { centro: { nombre: "asc" } },
          { materia: { nombre: "asc" } },
        ],
      }),
      prisma.sesionPresencial.findMany({
        where: {
          docenteId: dId,
          materia: { periodoId: pId },
        },
        include: {
          materia: { include: { nivel: true } },
          centro: true,
        },
        orderBy: { fecha: "asc" },
      }),
      prisma.calendarioEvento.findMany({
        where: { periodoId: pId },
        orderBy: { fecha: "asc" },
      }),
    ]);

    // Get online sessions for materias this docente teaches
    const materiaIds = [...new Set(asignaciones.map((a: any) => a.materiaId))];
    const sesionesOnline = await prisma.sesionOnline.findMany({
      where: {
        materiaId: { in: materiaIds },
      },
      include: { materia: true },
      orderBy: { fecha: "asc" },
    });

    return c.json({
      docente: { id: docente.id, nombre: docente.nombre },
      asignaciones,
      presenciales,
      sesionesOnline,
      eventos,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch docente schedule" }, 500);
  }
});

// ============================================================
// iCal for docente
// ============================================================
public_routes.get("/ical/docente/:docenteId/:periodoId", async (c) => {
  try {
    const { docenteId, periodoId } = c.req.param();
    const dId = parseInt(docenteId);
    const pId = parseInt(periodoId);

    const [docente, periodo] = await Promise.all([
      prisma.docente.findUnique({ where: { id: dId } }),
      prisma.periodo.findUnique({ where: { id: pId } }),
    ]);

    if (!docente || !periodo) {
      return c.json({ error: "Not found" }, 404);
    }

    // Get all asignaciones for this docente
    const asignaciones = await prisma.asignacion.findMany({
      where: { docenteId: dId, materia: { periodoId: pId } },
      include: { materia: true, centro: true },
    });
    const materiaIds = [...new Set(asignaciones.map((a: any) => a.materiaId))];

    const [sesionesOnline, presenciales] = await Promise.all([
      prisma.sesionOnline.findMany({
        where: { materiaId: { in: materiaIds } },
        include: { materia: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.sesionPresencial.findMany({
        where: { docenteId: dId, materia: { periodoId: pId } },
        include: { materia: true, centro: true },
        orderBy: { fecha: "asc" },
      }),
    ]);

    const calName = `Horario Prof. ${docente.nombre} - ${periodo.label}`;
    const now = formatICalDate(new Date());

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PachaTech//Horario EIB//ES",
      `X-WR-CALNAME:${calName}`,
      "X-WR-TIMEZONE:America/Guayaquil",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE",
      "TZID:America/Guayaquil",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:-0500",
      "TZOFFSETTO:-0500",
      "TZNAME:ECT",
      "END:STANDARD",
      "END:VTIMEZONE",
    ];

    // Build centro map for online sessions
    const materiaCentroMap = new Map<number, string[]>();
    asignaciones.forEach((a: any) => {
      if (!materiaCentroMap.has(a.materiaId)) materiaCentroMap.set(a.materiaId, []);
      materiaCentroMap.get(a.materiaId)!.push(a.centro.nombre);
    });

    for (const s of sesionesOnline) {
      const dtStart = formatICalDateTime(s.fecha, s.hora);
      const dtEnd = formatICalDateTimeAdd90(s.fecha, s.hora);
      const centros = materiaCentroMap.get(s.materiaId)?.join(", ") || "";
      const summary = `${s.materia.nombreCorto} - ${s.tipo === "tutoria" ? "Tutoría" : "Clase"} Online`;
      const description = `Materia: ${s.materia.nombre}\\nUnidad: ${s.unidad}${centros ? "\\nCentros: " + centros : ""}`;

      ics.push(
        "BEGIN:VEVENT",
        `UID:docente-online-${s.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=America/Guayaquil:${dtStart}`,
        `DTEND;TZID=America/Guayaquil:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        "END:VEVENT"
      );
    }

    for (const s of presenciales) {
      const dtStart = formatICalDateTime(s.fecha, s.horaInicio);
      const dtEnd = formatICalDateTime(s.fecha, s.horaFin);
      const tipoLabel = s.tipo === "examen" ? "Examen" : s.tipo === "tutoria" ? "Tutoría Presencial" : "Clase Presencial";
      const summary = `${s.materia.nombreCorto} - ${tipoLabel}`;
      const description = `Materia: ${s.materia.nombre}\\nBimestre: ${s.bimestre}`;

      ics.push(
        "BEGIN:VEVENT",
        `UID:docente-presencial-${s.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=America/Guayaquil:${dtStart}`,
        `DTEND;TZID=America/Guayaquil:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${(s as any).centro?.nombre || ""}`,
        "END:VEVENT"
      );
    }

    ics.push("END:VCALENDAR");
    const body = ics.filter((line) => line !== "").join("\r\n");

    // Track docente subscription (fire-and-forget)
    prisma.icalSuscripcion.upsert({
      where: {
        periodoId_nivelId_centroId_tipo_docenteId: {
          periodoId: pId, nivelId: 0, centroId: 0, tipo: "docente", docenteId: dId,
        },
      },
      update: { count: { increment: 1 }, lastFetch: new Date(), userAgent: c.req.header("user-agent") || null },
      create: { periodoId: pId, nivelId: 0, centroId: 0, tipo: "docente", docenteId: dId, count: 1, userAgent: c.req.header("user-agent") || null },
    }).catch(() => {});

    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="horario-docente-${docenteId}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[iCal Docente Error]", error);
    return c.json({ error: "Failed to generate calendar" }, 500);
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

    const [periodo, nivel, centro, allOnlineSesiones, sesionesPresenciales, allEventos] = await Promise.all([
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

    // --- Filter online sessions by grupo & bimestre (same logic as /sesiones-online) ---
    const zonaNorteCentros = [2, 3, 5, 6];
    const zonaSurCentros = [1, 4];
    const isNorte = zonaNorteCentros.includes(cId);
    const isSur = zonaSurCentros.includes(cId);
    const centroGrupoMap: Record<number, string> = { 5: "Amazonía Norte" };
    const expectedGrupo = centroGrupoMap[cId] || null;

    // For iCal we include BOTH bimestres (no current-bimestre filter)
    const sesionesOnline = allOnlineSesiones.filter((s) => {
      // Filter by grupo
      if (cId === 7) {
        // Todos los centros — no filter
      } else if (expectedGrupo) {
        if (s.grupo !== expectedGrupo) return false;
      } else {
        if (s.grupo !== null && s.grupo !== undefined) return false;
      }
      return true;
    });

    // --- Filter calendario events by nivelId ---
    const eventos = allEventos.filter((e) => e.nivelId === null || e.nivelId === nId);

    const calName = `Horario ${nivel.nombre} - ${centro.nombre} - ${periodo.label}`;
    const now = formatICalDate(new Date());

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PachaTech//Horario EIB//ES",
      `X-WR-CALNAME:${calName}`,
      "X-WR-TIMEZONE:America/Guayaquil",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      // VTIMEZONE for Ecuador (UTC-5, no DST)
      "BEGIN:VTIMEZONE",
      "TZID:America/Guayaquil",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:-0500",
      "TZOFFSETTO:-0500",
      "TZNAME:ECT",
      "END:STANDARD",
      "END:VTIMEZONE",
    ];

    // Online sessions as events (duration: 1h30m)
    for (const s of sesionesOnline) {
      const dtStart = formatICalDateTime(s.fecha, s.hora);
      const dtEnd = formatICalDateTimeAdd90(s.fecha, s.hora); // 1h30m duration
      const summary = `${s.materia.nombreCorto} - ${s.tipo === "tutoria" ? "Tutoría" : "Clase"} Online`;
      const description = `Materia: ${s.materia.nombre}\\nTipo: ${s.tipo}\\nUnidad: ${s.unidad}${s.grupo ? "\\nGrupo: " + s.grupo : ""}`;

      ics.push(
        "BEGIN:VEVENT",
        `UID:online-${s.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=America/Guayaquil:${dtStart}`,
        `DTEND;TZID=America/Guayaquil:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        "END:VEVENT"
      );
    }

    // Presencial sessions as events
    for (const s of sesionesPresenciales) {
      const dtStart = formatICalDateTime(s.fecha, s.horaInicio);
      const dtEnd = formatICalDateTime(s.fecha, s.horaFin);
      // Exámenes are NOT presencial — just label as "Examen"
      const tipoLabel = s.tipo === "examen" ? "Examen" : s.tipo === "tutoria" ? "Tutoría Presencial" : "Clase Presencial";
      const summary = `${s.materia.nombreCorto} - ${tipoLabel}`;
      const description = `Materia: ${s.materia.nombre}\\nTipo: ${tipoLabel}\\nBimestre: ${s.bimestre}${s.docente ? "\\nDocente: " + s.docente.nombre : ""}`;
      const location = s.tipo === "examen" ? "" : centro.nombre;

      ics.push(
        "BEGIN:VEVENT",
        `UID:presencial-${s.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=America/Guayaquil:${dtStart}`,
        `DTEND;TZID=America/Guayaquil:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        location ? `LOCATION:${location}` : "",
        "END:VEVENT"
      );
    }

    // Calendar events — use nota as summary, not tipo+bimestre
    for (const e of eventos) {
      const dtStart = formatICalDate(e.fecha);
      // For all-day events, DTEND should be the NEXT day (exclusive end)
      const endDate = e.fechaFin ? new Date(e.fechaFin) : new Date(e.fecha);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const dtEnd = formatICalDate(endDate);
      // Use nota as summary (e.g. "Entrega actividad 1"), fallback to tipo
      const summary = e.nota || `${e.tipo}${e.bimestre ? " - Bimestre " + e.bimestre : ""}`;

      const eventLines = [
        "BEGIN:VEVENT",
        `UID:evento-${e.id}@horario-ups`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${summary}`,
      ];
      if (e.enlace) eventLines.push(`URL:${e.enlace}`);
      eventLines.push("END:VEVENT");
      ics.push(...eventLines);
    }

    ics.push("END:VCALENDAR");

    // Filter out empty lines
    const body = ics.filter((line) => line !== "").join("\r\n");

    // Track subscription (fire-and-forget, don't block response)
    prisma.icalSuscripcion.upsert({
      where: {
        periodoId_nivelId_centroId_tipo_docenteId: {
          periodoId: pId, nivelId: nId, centroId: cId, tipo: "estudiante", docenteId: 0,
        },
      },
      update: { count: { increment: 1 }, lastFetch: new Date(), userAgent: c.req.header("user-agent") || null },
      create: { periodoId: pId, nivelId: nId, centroId: cId, tipo: "estudiante", docenteId: 0, count: 1, userAgent: c.req.header("user-agent") || null },
    }).catch(() => {}); // silently ignore if table doesn't exist yet

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

// Helper: format Date + time string + 1h30m for online session end time
function formatICalDateTimeAdd90(d: Date, timeStr: string): string {
  const date = new Date(d);
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0]);
  let minutes = (parseInt(parts[1]) || 0) + 90; // add 90 minutes
  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const h = String(hours).padStart(2, "0");
  const mi = String(minutes).padStart(2, "0");
  return `${y}${mo}${day}T${h}${mi}00`;
}

export default public_routes;
