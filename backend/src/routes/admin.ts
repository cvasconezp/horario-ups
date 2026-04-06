import { Hono } from "hono";
import * as bcrypt from "bcryptjs";
import prisma from "../db.js";
import {
  parseExcelFile,
  importCarreras,
  importPeriodos,
  importNiveles,
  importCentros,
  importDocentes,
  importMaterias,
} from "../lib/excel-import.js";
import * as XLSX from "xlsx";

const admin_routes = new Hono();

// Dashboard stats
admin_routes.get("/stats", async (c) => {
  try {
    const [
      totalCarreras,
      totalDocentes,
      totalMaterias,
      totalCentros,
      totalSesionesOnline,
      totalSesionesPresenciales,
    ] = await Promise.all([
      prisma.carrera.count(),
      prisma.docente.count(),
      prisma.materia.count(),
      prisma.centro.count(),
      prisma.sesionOnline.count(),
      prisma.sesionPresencial.count(),
    ]);

    return c.json({
      totalCarreras,
      totalDocentes,
      totalMaterias,
      totalCentros,
      totalSesionesOnline,
      totalSesionesPresenciales,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

const ITEMS_PER_PAGE = 50;

const getPaginationParams = (c: any) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(1000, parseInt(c.req.query("limit") || String(ITEMS_PER_PAGE)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

admin_routes.get("/carreras", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [carreras, total] = await Promise.all([
      prisma.carrera.findMany({
        skip,
        take: limit,
        orderBy: { nombre: "asc" },
      }),
      prisma.carrera.count(),
    ]);
    return c.json({
      data: carreras,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch carreras" }, 500);
  }
});

admin_routes.get("/carreras/:id", async (c) => {
  try {
    const carrera = await prisma.carrera.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        periodos: true,
        niveles: true,
      },
    });
    if (!carrera) {
      return c.json({ error: "Carrera not found" }, 404);
    }
    return c.json(carrera);
  } catch (error) {
    return c.json({ error: "Failed to fetch carrera" }, 500);
  }
});

admin_routes.post("/carreras", async (c) => {
  try {
    const body = await c.req.json();
    const carrera = await prisma.carrera.create({
      data: {
        nombre: body.nombre,
        codigo: body.codigo,
        activa: body.activa ?? true,
      },
    });
    return c.json(carrera, 201);
  } catch (error: any) {
    if (error.code === "P2002") {
      return c.json({ error: "Codigo must be unique" }, 400);
    }
    return c.json({ error: "Failed to create carrera" }, 500);
  }
});

admin_routes.put("/carreras/:id", async (c) => {
  try {
    const body = await c.req.json();
    const carrera = await prisma.carrera.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        nombre: body.nombre,
        codigo: body.codigo,
        activa: body.activa,
      },
    });
    return c.json(carrera);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Carrera not found" }, 404);
    }
    return c.json({ error: "Failed to update carrera" }, 500);
  }
});

admin_routes.delete("/carreras/:id", async (c) => {
  try {
    await prisma.carrera.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Carrera deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Carrera not found" }, 404);
    }
    return c.json({ error: "Failed to delete carrera" }, 500);
  }
});

admin_routes.get("/periodos", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [periodos, total] = await Promise.all([
      prisma.periodo.findMany({
        skip,
        take: limit,
        include: { carrera: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.periodo.count(),
    ]);
    return c.json({
      data: periodos,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch periodos" }, 500);
  }
});

admin_routes.get("/periodos/:id", async (c) => {
  try {
    const periodo = await prisma.periodo.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        carrera: true,
        materias: true,
        calendario: true,
      },
    });
    if (!periodo) {
      return c.json({ error: "Periodo not found" }, 404);
    }
    return c.json(periodo);
  } catch (error) {
    return c.json({ error: "Failed to fetch periodo" }, 500);
  }
});

admin_routes.post("/periodos", async (c) => {
  try {
    const body = await c.req.json();
    const periodo = await prisma.periodo.create({
      data: {
        carreraId: body.carreraId,
        numero: body.numero,
        label: body.label,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        activo: body.activo ?? true,
      },
    });
    return c.json(periodo, 201);
  } catch (error) {
    return c.json({ error: "Failed to create periodo" }, 500);
  }
});

admin_routes.put("/periodos/:id", async (c) => {
  try {
    const body = await c.req.json();
    const periodo = await prisma.periodo.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        carreraId: body.carreraId,
        numero: body.numero,
        label: body.label,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        activo: body.activo,
      },
    });
    return c.json(periodo);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Periodo not found" }, 404);
    }
    return c.json({ error: "Failed to update periodo" }, 500);
  }
});

admin_routes.delete("/periodos/:id", async (c) => {
  try {
    await prisma.periodo.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Periodo deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Periodo not found" }, 404);
    }
    return c.json({ error: "Failed to delete periodo" }, 500);
  }
});

admin_routes.get("/niveles", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [niveles, total] = await Promise.all([
      prisma.nivel.findMany({
        skip,
        take: limit,
        include: { carrera: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.nivel.count(),
    ]);
    return c.json({
      data: niveles,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch niveles" }, 500);
  }
});

admin_routes.get("/niveles/:id", async (c) => {
  try {
    const nivel = await prisma.nivel.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        carrera: true,
        materias: true,
      },
    });
    if (!nivel) {
      return c.json({ error: "Nivel not found" }, 404);
    }
    return c.json(nivel);
  } catch (error) {
    return c.json({ error: "Failed to fetch nivel" }, 500);
  }
});

admin_routes.post("/niveles", async (c) => {
  try {
    const body = await c.req.json();
    const nivel = await prisma.nivel.create({
      data: {
        carreraId: body.carreraId,
        numero: body.numero,
        nombre: body.nombre,
      },
    });
    return c.json(nivel, 201);
  } catch (error) {
    return c.json({ error: "Failed to create nivel" }, 500);
  }
});

admin_routes.put("/niveles/:id", async (c) => {
  try {
    const body = await c.req.json();
    const nivel = await prisma.nivel.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        carreraId: body.carreraId,
        numero: body.numero,
        nombre: body.nombre,
      },
    });
    return c.json(nivel);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Nivel not found" }, 404);
    }
    return c.json({ error: "Failed to update nivel" }, 500);
  }
});

admin_routes.delete("/niveles/:id", async (c) => {
  try {
    await prisma.nivel.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Nivel deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Nivel not found" }, 404);
    }
    return c.json({ error: "Failed to delete nivel" }, 500);
  }
});

admin_routes.get("/centros", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [centros, total] = await Promise.all([
      prisma.centro.findMany({
        skip,
        take: limit,
        orderBy: { nombre: "asc" },
      }),
      prisma.centro.count(),
    ]);
    return c.json({
      data: centros,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch centros" }, 500);
  }
});

admin_routes.get("/centros/:id", async (c) => {
  try {
    const centro = await prisma.centro.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        asignaciones: true,
        presenciales: true,
      },
    });
    if (!centro) {
      return c.json({ error: "Centro not found" }, 404);
    }
    return c.json(centro);
  } catch (error) {
    return c.json({ error: "Failed to fetch centro" }, 500);
  }
});

admin_routes.post("/centros", async (c) => {
  try {
    const body = await c.req.json();
    const centro = await prisma.centro.create({
      data: {
        nombre: body.nombre,
        zona: body.zona,
      },
    });
    return c.json(centro, 201);
  } catch (error: any) {
    if (error.code === "P2002") {
      return c.json({ error: "Centro name must be unique" }, 400);
    }
    return c.json({ error: "Failed to create centro" }, 500);
  }
});

admin_routes.put("/centros/:id", async (c) => {
  try {
    const body = await c.req.json();
    const centro = await prisma.centro.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        nombre: body.nombre,
        zona: body.zona,
      },
    });
    return c.json(centro);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Centro not found" }, 404);
    }
    return c.json({ error: "Failed to update centro" }, 500);
  }
});

admin_routes.delete("/centros/:id", async (c) => {
  try {
    await prisma.centro.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Centro deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Centro not found" }, 404);
    }
    return c.json({ error: "Failed to delete centro" }, 500);
  }
});

admin_routes.get("/docentes", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [docentes, total] = await Promise.all([
      prisma.docente.findMany({
        skip,
        take: limit,
        include: { usuario: true },
        orderBy: { nombre: "asc" },
      }),
      prisma.docente.count(),
    ]);
    return c.json({
      data: docentes,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch docentes" }, 500);
  }
});

admin_routes.get("/docentes/:id", async (c) => {
  try {
    const docente = await prisma.docente.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        asignaciones: {
          include: {
            materia: true,
            centro: true,
          },
        },
        presenciales: true,
        usuario: true,
      },
    });
    if (!docente) {
      return c.json({ error: "Docente not found" }, 404);
    }
    return c.json(docente);
  } catch (error) {
    return c.json({ error: "Failed to fetch docente" }, 500);
  }
});

admin_routes.post("/docentes", async (c) => {
  try {
    const body = await c.req.json();
    const docente = await prisma.docente.create({
      data: {
        nombre: body.nombre,
        email: body.email,
      },
    });
    return c.json(docente, 201);
  } catch (error: any) {
    if (error.code === "P2002") {
      return c.json({ error: "Email must be unique" }, 400);
    }
    return c.json({ error: "Failed to create docente" }, 500);
  }
});

admin_routes.put("/docentes/:id", async (c) => {
  try {
    const body = await c.req.json();
    const docente = await prisma.docente.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        nombre: body.nombre,
        email: body.email,
      },
    });
    return c.json(docente);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Docente not found" }, 404);
    }
    return c.json({ error: "Failed to update docente" }, 500);
  }
});

admin_routes.delete("/docentes/:id", async (c) => {
  try {
    await prisma.docente.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Docente deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Docente not found" }, 404);
    }
    return c.json({ error: "Failed to delete docente" }, 500);
  }
});

admin_routes.get("/materias", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [materias, total] = await Promise.all([
      prisma.materia.findMany({
        skip,
        take: limit,
        include: {
          nivel: { include: { carrera: true } },
          periodo: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.materia.count(),
    ]);
    return c.json({
      data: materias,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch materias" }, 500);
  }
});

admin_routes.get("/materias/:id", async (c) => {
  try {
    const materia = await prisma.materia.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        nivel: true,
        periodo: true,
        asignaciones: {
          include: {
            docente: true,
            centro: true,
          },
        },
        sesionesOnline: true,
        presenciales: true,
      },
    });
    if (!materia) {
      return c.json({ error: "Materia not found" }, 404);
    }
    return c.json(materia);
  } catch (error) {
    return c.json({ error: "Failed to fetch materia" }, 500);
  }
});

admin_routes.post("/materias", async (c) => {
  try {
    const body = await c.req.json();
    const materia = await prisma.materia.create({
      data: {
        nivelId: body.nivelId,
        periodoId: body.periodoId,
        nombre: body.nombre,
        nombreCorto: body.nombreCorto,
        tipo: body.tipo,
        dia: body.dia || null,
        hora: body.hora || null,
        duracion: body.duracion || null,
        bimestreOC: body.bimestreOC ?? 0,
        bimestreRL: body.bimestreRL ?? 0,
        tutoria: body.tutoria || null,
        nota: body.nota || null,
      },
    });
    return c.json(materia, 201);
  } catch (error) {
    return c.json({ error: "Failed to create materia" }, 500);
  }
});

admin_routes.put("/materias/:id", async (c) => {
  try {
    const body = await c.req.json();
    const materia = await prisma.materia.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        nivelId: body.nivelId,
        periodoId: body.periodoId,
        nombre: body.nombre,
        nombreCorto: body.nombreCorto,
        tipo: body.tipo,
        dia: body.dia,
        hora: body.hora,
        duracion: body.duracion,
        bimestreOC: body.bimestreOC,
        bimestreRL: body.bimestreRL,
        tutoria: body.tutoria,
        nota: body.nota,
      },
    });
    return c.json(materia);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Materia not found" }, 404);
    }
    return c.json({ error: "Failed to update materia" }, 500);
  }
});

// Quick partial update for materia (dia, hora — applies to ALL sessions)
admin_routes.patch("/materias/:id", async (c) => {
  try {
    const body = await c.req.json();
    const data: Record<string, any> = {};
    if (body.dia !== undefined) data.dia = body.dia;
    if (body.hora !== undefined) data.hora = body.hora;
    if (body.duracion !== undefined) data.duracion = body.duracion;
    if (body.nota !== undefined) data.nota = body.nota;

    const materia = await prisma.materia.update({
      where: { id: parseInt(c.req.param("id")) },
      data,
      include: { nivel: true },
    });

    // Also update hora on ALL future SesionOnline for this materia if hora changed
    if (body.hora !== undefined) {
      const now = new Date();
      await prisma.sesionOnline.updateMany({
        where: {
          materiaId: parseInt(c.req.param("id")),
          fecha: { gte: now },
        },
        data: { hora: body.hora },
      });
    }

    // Also update dates on ALL future SesionOnline for this materia if dia changed
    if (body.dia !== undefined && body.dia !== null) {
      const dayMap: Record<string, number> = {
        'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 0
      };
      const targetDay = dayMap[body.dia];
      if (targetDay !== undefined) {
        const now = new Date();
        const futureSessions = await prisma.sesionOnline.findMany({
          where: {
            materiaId: parseInt(c.req.param("id")),
            fecha: { gte: now },
          },
          orderBy: { fecha: 'asc' },
        });
        for (const s of futureSessions) {
          const currentDay = s.fecha.getUTCDay();
          if (currentDay !== targetDay) {
            let diff = targetDay - currentDay;
            if (diff < -3) diff += 7;   // e.g. current=Fri(5), target=Mon(1) → diff=-4+7=3
            if (diff > 3) diff -= 7;    // e.g. current=Mon(1), target=Fri(5) → diff=4-7=-3
            const newDate = new Date(s.fecha);
            newDate.setUTCDate(newDate.getUTCDate() + diff);
            await prisma.sesionOnline.update({
              where: { id: s.id },
              data: { fecha: newDate },
            });
          }
        }
      }
    }

    return c.json(materia);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Materia not found" }, 404);
    }
    return c.json({ error: "Failed to update materia" }, 500);
  }
});

// Update a single SesionOnline (applies to ONE session only)
admin_routes.patch("/sesiones-online/:id", async (c) => {
  try {
    const body = await c.req.json();
    const data: Record<string, any> = {};
    if (body.fecha !== undefined) data.fecha = new Date(body.fecha);
    if (body.hora !== undefined) data.hora = body.hora;

    const sesion = await prisma.sesionOnline.update({
      where: { id: parseInt(c.req.param("id")) },
      data,
      include: { materia: true },
    });
    return c.json(sesion);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "SesionOnline not found" }, 404);
    }
    return c.json({ error: "Failed to update sesion" }, 500);
  }
});

// Get upcoming sessions for a materia (for the "edit which session" picker)
admin_routes.get("/materias/:id/sesiones-upcoming", async (c) => {
  try {
    const now = new Date();
    const sesiones = await prisma.sesionOnline.findMany({
      where: {
        materiaId: parseInt(c.req.param("id")),
        fecha: { gte: now },
      },
      orderBy: { fecha: "asc" },
      take: 10,
    });
    return c.json(sesiones);
  } catch (error) {
    return c.json({ error: "Failed to fetch upcoming sessions" }, 500);
  }
});

// Quick partial update for asignacion enlace virtual + contrasena
admin_routes.patch("/asignaciones/:id", async (c) => {
  try {
    const body = await c.req.json();
    const data: Record<string, any> = {};
    if (body.enlaceVirtual !== undefined) data.enlaceVirtual = body.enlaceVirtual;
    if (body.contrasena !== undefined) data.contrasena = body.contrasena;
    if (body.diaOverride !== undefined) data.diaOverride = body.diaOverride;
    if (body.horaOverride !== undefined) data.horaOverride = body.horaOverride;

    const asignacion = await prisma.asignacion.update({
      where: { id: parseInt(c.req.param("id")) },
      data,
      include: { materia: { include: { nivel: true } }, docente: true, centro: true },
    });
    return c.json(asignacion);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Asignacion not found" }, 404);
    }
    return c.json({ error: "Failed to update asignacion" }, 500);
  }
});

admin_routes.delete("/materias/:id", async (c) => {
  try {
    await prisma.materia.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Materia deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Materia not found" }, 404);
    }
    return c.json({ error: "Failed to delete materia" }, 500);
  }
});

// Full asignaciones list (no pagination) for admin unified table
admin_routes.get("/asignaciones-all", async (c) => {
  try {
    const asignaciones = await prisma.asignacion.findMany({
      include: {
        materia: {
          include: { nivel: true },
        },
        docente: true,
        centro: true,
      },
      orderBy: [
        { materia: { nivel: { numero: "asc" } } },
        { centro: { nombre: "asc" } },
        { materia: { dia: "asc" } },
      ],
    });

    return c.json(asignaciones);
  } catch (error) {
    return c.json({ error: "Failed to fetch all asignaciones" }, 500);
  }
});

admin_routes.get("/asignaciones", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [asignaciones, total] = await Promise.all([
      prisma.asignacion.findMany({
        skip,
        take: limit,
        include: {
          materia: true,
          docente: true,
          centro: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.asignacion.count(),
    ]);
    return c.json({
      data: asignaciones,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch asignaciones" }, 500);
  }
});

admin_routes.get("/asignaciones/:id", async (c) => {
  try {
    const asignacion = await prisma.asignacion.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        materia: true,
        docente: true,
        centro: true,
      },
    });
    if (!asignacion) {
      return c.json({ error: "Asignacion not found" }, 404);
    }
    return c.json(asignacion);
  } catch (error) {
    return c.json({ error: "Failed to fetch asignacion" }, 500);
  }
});

admin_routes.post("/asignaciones", async (c) => {
  try {
    const body = await c.req.json();
    const asignacion = await prisma.asignacion.create({
      data: {
        materiaId: body.materiaId,
        centroId: body.centroId,
        docenteId: body.docenteId,
        enlaceVirtual: body.enlaceVirtual || null,
        contrasena: body.contrasena || null,
      },
    });
    return c.json(asignacion, 201);
  } catch (error) {
    return c.json({ error: "Failed to create asignacion" }, 500);
  }
});

admin_routes.put("/asignaciones/:id", async (c) => {
  try {
    const body = await c.req.json();
    const asignacion = await prisma.asignacion.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        materiaId: body.materiaId,
        centroId: body.centroId,
        docenteId: body.docenteId,
        enlaceVirtual: body.enlaceVirtual,
        contrasena: body.contrasena,
      },
    });
    return c.json(asignacion);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Asignacion not found" }, 404);
    }
    return c.json({ error: "Failed to update asignacion" }, 500);
  }
});

admin_routes.delete("/asignaciones/:id", async (c) => {
  try {
    await prisma.asignacion.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Asignacion deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Asignacion not found" }, 404);
    }
    return c.json({ error: "Failed to delete asignacion" }, 500);
  }
});

admin_routes.get("/sesiones-online", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [sesiones, total] = await Promise.all([
      prisma.sesionOnline.findMany({
        skip,
        take: limit,
        include: { materia: true },
        orderBy: { fecha: "desc" },
      }),
      prisma.sesionOnline.count(),
    ]);
    return c.json({
      data: sesiones,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch online sessions" }, 500);
  }
});

admin_routes.get("/sesiones-online/:id", async (c) => {
  try {
    const sesion = await prisma.sesionOnline.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: { materia: true },
    });
    if (!sesion) {
      return c.json({ error: "Sesion online not found" }, 404);
    }
    return c.json(sesion);
  } catch (error) {
    return c.json({ error: "Failed to fetch online session" }, 500);
  }
});

admin_routes.post("/sesiones-online", async (c) => {
  try {
    const body = await c.req.json();
    const sesion = await prisma.sesionOnline.create({
      data: {
        materiaId: body.materiaId,
        fecha: new Date(body.fecha),
        hora: body.hora,
        tipo: body.tipo,
        unidad: body.unidad,
        grupo: body.grupo || null,
      },
    });
    return c.json(sesion, 201);
  } catch (error) {
    return c.json({ error: "Failed to create online session" }, 500);
  }
});

admin_routes.put("/sesiones-online/:id", async (c) => {
  try {
    const body = await c.req.json();
    const sesion = await prisma.sesionOnline.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        materiaId: body.materiaId,
        fecha: new Date(body.fecha),
        hora: body.hora,
        tipo: body.tipo,
        unidad: body.unidad,
        grupo: body.grupo,
      },
    });
    return c.json(sesion);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Sesion online not found" }, 404);
    }
    return c.json({ error: "Failed to update online session" }, 500);
  }
});

admin_routes.delete("/sesiones-online/:id", async (c) => {
  try {
    await prisma.sesionOnline.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Sesion online deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Sesion online not found" }, 404);
    }
    return c.json({ error: "Failed to delete online session" }, 500);
  }
});

admin_routes.get("/sesiones-presenciales", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [sesiones, total] = await Promise.all([
      prisma.sesionPresencial.findMany({
        skip,
        take: limit,
        include: {
          materia: true,
          docente: true,
          centro: true,
        },
        orderBy: { fecha: "desc" },
      }),
      prisma.sesionPresencial.count(),
    ]);
    return c.json({
      data: sesiones,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch presencial sessions" }, 500);
  }
});

admin_routes.get("/sesiones-presenciales/:id", async (c) => {
  try {
    const sesion = await prisma.sesionPresencial.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: {
        materia: true,
        docente: true,
        centro: true,
      },
    });
    if (!sesion) {
      return c.json({ error: "Sesion presencial not found" }, 404);
    }
    return c.json(sesion);
  } catch (error) {
    return c.json({ error: "Failed to fetch presencial session" }, 500);
  }
});

admin_routes.post("/sesiones-presenciales", async (c) => {
  try {
    const body = await c.req.json();
    const sesion = await prisma.sesionPresencial.create({
      data: {
        materiaId: body.materiaId,
        centroId: body.centroId,
        docenteId: body.docenteId || null,
        fecha: new Date(body.fecha),
        diaSemana: body.diaSemana,
        horaInicio: body.horaInicio,
        horaFin: body.horaFin,
        tipo: body.tipo,
        bimestre: body.bimestre,
      },
    });
    return c.json(sesion, 201);
  } catch (error) {
    return c.json({ error: "Failed to create presencial session" }, 500);
  }
});

admin_routes.put("/sesiones-presenciales/:id", async (c) => {
  try {
    const body = await c.req.json();
    const sesion = await prisma.sesionPresencial.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        materiaId: body.materiaId,
        centroId: body.centroId,
        docenteId: body.docenteId,
        fecha: new Date(body.fecha),
        diaSemana: body.diaSemana,
        horaInicio: body.horaInicio,
        horaFin: body.horaFin,
        tipo: body.tipo,
        bimestre: body.bimestre,
      },
    });
    return c.json(sesion);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Sesion presencial not found" }, 404);
    }
    return c.json({ error: "Failed to update presencial session" }, 500);
  }
});

admin_routes.delete("/sesiones-presenciales/:id", async (c) => {
  try {
    await prisma.sesionPresencial.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Sesion presencial deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Sesion presencial not found" }, 404);
    }
    return c.json({ error: "Failed to delete presencial session" }, 500);
  }
});

admin_routes.get("/calendario", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [eventos, total] = await Promise.all([
      prisma.calendarioEvento.findMany({
        skip,
        take: limit,
        include: { periodo: true },
        orderBy: { fecha: "asc" },
      }),
      prisma.calendarioEvento.count(),
    ]);
    return c.json({
      data: eventos,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch calendar events" }, 500);
  }
});

admin_routes.get("/calendario/:id", async (c) => {
  try {
    const evento = await prisma.calendarioEvento.findUnique({
      where: { id: parseInt(c.req.param("id")) },
      include: { periodo: true },
    });
    if (!evento) {
      return c.json({ error: "Calendario evento not found" }, 404);
    }
    return c.json(evento);
  } catch (error) {
    return c.json({ error: "Failed to fetch calendar event" }, 500);
  }
});

admin_routes.post("/calendario", async (c) => {
  try {
    const body = await c.req.json();
    const evento = await prisma.calendarioEvento.create({
      data: {
        periodoId: body.periodoId,
        tipo: body.tipo,
        fecha: new Date(body.fecha),
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        bimestre: body.bimestre || null,
        nota: body.nota || null,
        enlace: body.enlace || null,
      },
    });
    return c.json(evento, 201);
  } catch (error) {
    return c.json({ error: "Failed to create calendar event" }, 500);
  }
});

admin_routes.put("/calendario/:id", async (c) => {
  try {
    const body = await c.req.json();
    const evento = await prisma.calendarioEvento.update({
      where: { id: parseInt(c.req.param("id")) },
      data: {
        periodoId: body.periodoId,
        tipo: body.tipo,
        fecha: new Date(body.fecha),
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        bimestre: body.bimestre,
        nota: body.nota,
        enlace: body.enlace || null,
      },
    });
    return c.json(evento);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Calendario evento not found" }, 404);
    }
    return c.json({ error: "Failed to update calendar event" }, 500);
  }
});

admin_routes.delete("/calendario/:id", async (c) => {
  try {
    await prisma.calendarioEvento.delete({
      where: { id: parseInt(c.req.param("id")) },
    });
    return c.json({ message: "Calendario evento deleted" }, 200);
  } catch (error: any) {
    if (error.code === "P2025") {
      return c.json({ error: "Calendario evento not found" }, 404);
    }
    return c.json({ error: "Failed to delete calendar event" }, 500);
  }
});

admin_routes.post("/usuarios", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.email || !body.password) {
      return c.json(
        { error: "Email and password are required" },
        400
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email: body.email,
        nombre: body.nombre,
        rol: body.rol || "coordinador",
        passwordHash,
        docenteId: body.docenteId || null,
      },
    });

    return c.json(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      201
    );
  } catch (error: any) {
    if (error.code === "P2002") {
      return c.json({ error: "Email must be unique" }, 400);
    }
    return c.json({ error: "Failed to create usuario" }, 500);
  }
});

admin_routes.get("/usuarios", async (c) => {
  try {
    const { skip, limit } = getPaginationParams(c);
    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          docenteId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.usuario.count(),
    ]);
    return c.json({
      data: usuarios,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch usuarios" }, 500);
  }
});

admin_routes.post("/import-excel", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseExcelFile(Buffer.from(buffer));

    const results = {
      carreras: await importCarreras(parsed.carreras),
      periodos: await importPeriodos(parsed.periodos),
      niveles: await importNiveles(parsed.niveles),
      centros: await importCentros(parsed.centros),
      docentes: await importDocentes(parsed.docentes),
      materias: await importMaterias(parsed.materias),
    };

    return c.json(results);
  } catch (error) {
    return c.json({ error: `Failed to import Excel file: ${String(error)}` }, 500);
  }
});

// Conflict detection endpoint
admin_routes.get("/conflicts", async (c) => {
  try {
    const conflicts: Array<{
      type: string;
      docenteId: number;
      docenteNombre: string;
      conflicts: Array<{
        id: number;
        materiaId: number;
        materiaNombre: string;
        centroId: number;
        centroNombre: string;
        nivelId: number;
        nivelNumero: number;
        dia?: string;
        hora?: string;
        fechaPresencial?: string;
        horaInicio?: string;
        horaFin?: string;
      }>;
    }> = [];

    // Get all asignaciones with materia and nivel details
    const asignaciones = await prisma.asignacion.findMany({
      include: {
        materia: { include: { nivel: true } },
        docente: true,
        centro: true,
      },
    });

    // Group by docente, dia, and hora to find conflicts
    // A conflict is when the SAME docente teaches DIFFERENT materias at the same time.
    // Same materia at different centros is NOT a conflict (virtual class, same session).
    const groupedByDocenteTimeSlot = new Map<
      string,
      typeof asignaciones
    >();

    for (const asig of asignaciones) {
      const a = asig as any;
      const effectiveDia = a.diaOverride || a.materia.dia;
      const effectiveHora = a.horaOverride || a.materia.hora;
      if (!effectiveDia || !effectiveHora) continue;

      const key = `${asig.docenteId}_${effectiveDia}_${effectiveHora}`;
      if (!groupedByDocenteTimeSlot.has(key)) {
        groupedByDocenteTimeSlot.set(key, []);
      }
      groupedByDocenteTimeSlot.get(key)!.push(asig);
    }

    for (const [key, group] of groupedByDocenteTimeSlot.entries()) {
      if (group.length > 1) {
        // Only flag as conflict if there are DIFFERENT materias at the same time
        // Same materia at different centros = same virtual class = NOT a conflict
        const uniqueMaterias = new Set(group.map((g) => g.materiaId));
        if (uniqueMaterias.size > 1) {
          // There are genuinely different materias at the same time slot
          const existing = conflicts.find(
            (c) =>
              c.type === "asignacion" &&
              c.docenteId === group[0].docenteId
          );

          // Deduplicate: only include one entry per unique materia
          const seenMaterias = new Set<number>();
          const deduped = group.filter((g) => {
            if (seenMaterias.has(g.materiaId)) return false;
            seenMaterias.add(g.materiaId);
            return true;
          });

          if (existing) {
            existing.conflicts.push(
              ...deduped.map((g) => ({
                id: g.id,
                materiaId: g.materiaId,
                materiaNombre: g.materia.nombre,
                centroId: g.centroId,
                centroNombre: g.centro.nombre,
                nivelId: g.materia.nivelId,
                nivelNumero: g.materia.nivel.numero,
                dia: (g as any).diaOverride || g.materia.dia || undefined,
                hora: (g as any).horaOverride || g.materia.hora || undefined,
              }))
            );
          } else {
            conflicts.push({
              type: "asignacion",
              docenteId: group[0].docenteId,
              docenteNombre: group[0].docente.nombre,
              conflicts: deduped.map((g) => ({
                id: g.id,
                materiaId: g.materiaId,
                materiaNombre: g.materia.nombre,
                centroId: g.centroId,
                centroNombre: g.centro.nombre,
                nivelId: g.materia.nivelId,
                nivelNumero: g.materia.nivel.numero,
                dia: (g as any).diaOverride || g.materia.dia || undefined,
                hora: (g as any).horaOverride || g.materia.hora || undefined,
              })),
            });
          }
        }
      }
    }

    // Check SesionPresencial conflicts (exclude exams — they are virtual)
    const sesionesPresenciales = await prisma.sesionPresencial.findMany({
      where: {
        tipo: { not: 'examen' },
      },
      include: {
        docente: true,
        centro: true,
        materia: true,
      },
    });

    const groupedByDocenteFecha = new Map<
      string,
      typeof sesionesPresenciales
    >();

    for (const sesion of sesionesPresenciales) {
      if (!sesion.docenteId) continue;

      const fechaStr = sesion.fecha.toISOString().split("T")[0];
      const key = `${sesion.docenteId}_${fechaStr}`;

      if (!groupedByDocenteFecha.has(key)) {
        groupedByDocenteFecha.set(key, []);
      }
      groupedByDocenteFecha.get(key)!.push(sesion);
    }

    // Check for overlapping time ranges at DIFFERENT centros
    // Same docente at same centro on same day is normal (multiple sessions)
    // Same docente at DIFFERENT centros on same day with overlapping times = conflict
    for (const [key, group] of groupedByDocenteFecha.entries()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const sesion1 = group[i];
            const sesion2 = group[j];

            // Only flag if different centros
            if (sesion1.centroId === sesion2.centroId) continue;

            // Parse times (assuming format "HH:MM")
            const [h1, m1] = sesion1.horaInicio.split(":").map(Number);
            const [h2, m2] = sesion1.horaFin.split(":").map(Number);
            const [h3, m3] = sesion2.horaInicio.split(":").map(Number);
            const [h4, m4] = sesion2.horaFin.split(":").map(Number);

            const time1Start = h1 * 60 + m1;
            const time1End = h2 * 60 + m2;
            const time2Start = h3 * 60 + m3;
            const time2End = h4 * 60 + m4;

            // Check if times overlap
            if (!(time1End <= time2Start || time2End <= time1Start)) {
              const existing = conflicts.find(
                (c) =>
                  c.type === "presencial" &&
                  c.docenteId === sesion1.docenteId
              );

              const conflictData = {
                id: sesion1.id,
                materiaId: sesion1.materiaId,
                materiaNombre: sesion1.materia.nombre,
                centroId: sesion1.centroId,
                centroNombre: sesion1.centro.nombre,
                nivelId: sesion1.materia.nivelId,
                nivelNumero: 0,
                fechaPresencial: sesion1.fecha
                  .toISOString()
                  .split("T")[0],
                horaInicio: sesion1.horaInicio,
                horaFin: sesion1.horaFin,
              };

              const conflictData2 = {
                id: sesion2.id,
                materiaId: sesion2.materiaId,
                materiaNombre: sesion2.materia.nombre,
                centroId: sesion2.centroId,
                centroNombre: sesion2.centro.nombre,
                nivelId: sesion2.materia.nivelId,
                nivelNumero: 0,
                fechaPresencial: sesion2.fecha
                  .toISOString()
                  .split("T")[0],
                horaInicio: sesion2.horaInicio,
                horaFin: sesion2.horaFin,
              };

              if (existing) {
                if (
                  !existing.conflicts.find(
                    (c) => c.id === sesion1.id
                  )
                ) {
                  existing.conflicts.push(conflictData);
                }
                if (
                  !existing.conflicts.find(
                    (c) => c.id === sesion2.id
                  )
                ) {
                  existing.conflicts.push(conflictData2);
                }
              } else {
                conflicts.push({
                  type: "presencial",
                  docenteId: sesion1.docenteId!,
                  docenteNombre: sesion1.docente!.nombre,
                  conflicts: [conflictData, conflictData2],
                });
              }
            }
          }
        }
      }
    }

    return c.json({
      conflictCount: conflicts.length,
      conflicts,
    });
  } catch (error) {
    return c.json({ error: "Failed to detect conflicts" }, 500);
  }
});

// WhatsApp export endpoint
admin_routes.get("/whatsapp-export", async (c) => {
  try {
    const nivelId = c.req.query("nivelId")
      ? parseInt(c.req.query("nivelId")!)
      : undefined;
    const centroId = c.req.query("centroId")
      ? parseInt(c.req.query("centroId")!)
      : undefined;

    // Build where clause
    const where: any = {};

    if (nivelId) {
      where.materia = { nivelId };
    }
    if (centroId) {
      where.centroId = centroId;
    }

    const asignaciones = await prisma.asignacion.findMany({
      where,
      include: {
        materia: { include: { nivel: true } },
        docente: true,
        centro: true,
      },
      orderBy: [{ centro: { nombre: "asc" } }, { materia: { dia: "asc" } }],
    });

    // Generate bimestre label helper
    const getBimestreLabel = (
      bimestreOC: number,
      bimestreRL: number
    ): string => {
      if (bimestreOC > 0) return `Bimestre ${bimestreOC}`;
      if (bimestreRL > 0) return `Reclasificación ${bimestreRL}`;
      return "S/B";
    };

    // Format each asignacion for WhatsApp
    const formattedEntries = asignaciones.map((asig) => {
      const bimestreLabel = getBimestreLabel(
        asig.materia.bimestreOC,
        asig.materia.bimestreRL
      );

      return `*${asig.materia.nombreCorto}*
Nivel: ${asig.materia.nivel.numero}° | Centro: ${asig.centro.nombre}
Docente: ${asig.docente.nombre}
Día: ${(asig as any).diaOverride || asig.materia.dia} | Hora: ${(asig as any).horaOverride || asig.materia.hora}
Bloque: ${bimestreLabel}`;
    });

    const text = formattedEntries.join("\n\n─────\n\n");

    return c.json({
      text,
      count: asignaciones.length,
    });
  } catch (error) {
    return c.json({ error: "Failed to export WhatsApp text" }, 500);
  }
});

// ============================================================
// iCal subscription stats
// ============================================================
admin_routes.get("/ical-stats", async (c) => {
  try {
    const suscripciones = await prisma.icalSuscripcion.findMany({
      orderBy: { lastFetch: "desc" },
    });

    // Enrich with names
    const nivelIds = [...new Set(suscripciones.filter(s => s.nivelId > 0).map(s => s.nivelId))];
    const centroIds = [...new Set(suscripciones.filter(s => s.centroId > 0).map(s => s.centroId))];
    const docenteIds = [...new Set(suscripciones.filter(s => s.docenteId && s.docenteId > 0).map(s => s.docenteId!))];

    const [niveles, centros, docentes] = await Promise.all([
      nivelIds.length > 0 ? prisma.nivel.findMany({ where: { id: { in: nivelIds } } }) : [],
      centroIds.length > 0 ? prisma.centro.findMany({ where: { id: { in: centroIds } } }) : [],
      docenteIds.length > 0 ? prisma.docente.findMany({ where: { id: { in: docenteIds } } }) : [],
    ]);

    const nivelMap = Object.fromEntries(niveles.map(n => [n.id, n.nombre]));
    const centroMap = Object.fromEntries(centros.map(c => [c.id, c.nombre]));
    const docenteMap = Object.fromEntries(docentes.map(d => [d.id, d.nombre]));

    const enriched = suscripciones.map(s => ({
      id: s.id,
      tipo: s.tipo,
      nivel: s.nivelId > 0 ? nivelMap[s.nivelId] || `Nivel ${s.nivelId}` : null,
      centro: s.centroId > 0 ? centroMap[s.centroId] || `Centro ${s.centroId}` : null,
      docente: s.docenteId && s.docenteId > 0 ? docenteMap[s.docenteId] || `Docente ${s.docenteId}` : null,
      count: s.count,
      lastFetch: s.lastFetch,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
    }));

    const totalEstudiantes = suscripciones.filter(s => s.tipo === "estudiante").reduce((sum, s) => sum + s.count, 0);
    const totalDocentes = suscripciones.filter(s => s.tipo === "docente").reduce((sum, s) => sum + s.count, 0);
    const uniqueEstudiantes = suscripciones.filter(s => s.tipo === "estudiante").length;
    const uniqueDocentes = suscripciones.filter(s => s.tipo === "docente").length;

    return c.json({
      summary: {
        totalRequests: totalEstudiantes + totalDocentes,
        estudiantes: { unique: uniqueEstudiantes, totalRequests: totalEstudiantes },
        docentes: { unique: uniqueDocentes, totalRequests: totalDocentes },
      },
      suscripciones: enriched,
    });
  } catch (error) {
    console.error("[iCal Stats Error]", error);
    return c.json({ error: "Failed to fetch iCal stats" }, 500);
  }
});

// ==================== EXPORT EXCEL ====================
admin_routes.post("/export-excel", async (c) => {
  try {
    const body = await c.req.json();
    const columns: string[] = body.columns || [];
    const periodoId: number | undefined = body.periodoId;

    if (!columns.length) {
      return c.json({ error: "No columns selected" }, 400);
    }

    // Fetch all asignaciones with full relations
    const whereClause: any = {};
    if (periodoId) {
      whereClause.materia = { periodoId };
    }

    const asignaciones = await prisma.asignacion.findMany({
      where: whereClause,
      include: {
        materia: {
          include: {
            nivel: {
              include: { carrera: true },
            },
            periodo: true,
            sesionesOnline: true,
          },
        },
        docente: true,
        centro: true,
      },
      orderBy: [
        { docente: { nombre: "asc" } },
        { materia: { nivel: { numero: "asc" } } },
        { centro: { nombre: "asc" } },
      ],
    });

    // Column mapping definitions
    const columnDefs: Record<string, { header: string; getValue: (a: any) => any }> = {
      docenteNombre: {
        header: "Docente",
        getValue: (a) => a.docente?.nombre || "",
      },
      docenteEmail: {
        header: "Correo Docente",
        getValue: (a) => a.docente?.email || "",
      },
      asignatura: {
        header: "Asignatura",
        getValue: (a) => a.materia?.nombre || "",
      },
      asignaturaCorto: {
        header: "Asignatura (Corto)",
        getValue: (a) => a.materia?.nombreCorto || "",
      },
      nivel: {
        header: "Nivel",
        getValue: (a) => a.materia?.nivel?.nombre || "",
      },
      nivelNumero: {
        header: "Nivel #",
        getValue: (a) => a.materia?.nivel?.numero || "",
      },
      carrera: {
        header: "Carrera",
        getValue: (a) => a.materia?.nivel?.carrera?.nombre || "",
      },
      centro: {
        header: "Centro (Grupo)",
        getValue: (a) => a.centro?.nombre || "",
      },
      zona: {
        header: "Zona",
        getValue: (a) => a.centro?.zona || "",
      },
      tipo: {
        header: "Tipo Materia",
        getValue: (a) => a.materia?.tipo || "",
      },
      dia: {
        header: "Día",
        getValue: (a: any) => a.diaOverride || a.materia?.dia || "",
      },
      hora: {
        header: "Hora",
        getValue: (a: any) => a.horaOverride || a.materia?.hora || "",
      },
      duracion: {
        header: "Duración (min)",
        getValue: (a) => a.materia?.duracion || "",
      },
      bimestreOC: {
        header: "Bimestre OC",
        getValue: (a) => a.materia?.bimestreOC ?? "",
      },
      bimestreRL: {
        header: "Bimestre RL",
        getValue: (a) => a.materia?.bimestreRL ?? "",
      },
      periodo: {
        header: "Período",
        getValue: (a) => a.materia?.periodo?.label || "",
      },
      enlaceVirtual: {
        header: "Enlace Virtual",
        getValue: (a) => a.enlaceVirtual || "",
      },
      tutoria: {
        header: "Tutoría",
        getValue: (a) => a.materia?.tutoria || "",
      },
      nota: {
        header: "Nota",
        getValue: (a) => a.materia?.nota || "",
      },
      contrasena: {
        header: "Contraseña",
        getValue: (a) => a.contrasena || "",
      },
    };

    // Build rows
    const selectedDefs = columns
      .filter((col) => columnDefs[col])
      .map((col) => columnDefs[col]);

    const headers = selectedDefs.map((d) => d.header);
    const rows = asignaciones.map((a) => selectedDefs.map((d) => d.getValue(a)));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw data
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-width columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[i] || "").length)
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Asignaciones");

    // Sheet 2: Cross-reference summary (Docente → Asignaturas × Centros)
    if (
      columns.includes("docenteNombre") &&
      (columns.includes("asignatura") || columns.includes("centro"))
    ) {
      const docenteMap = new Map<
        string,
        {
          email: string;
          materias: Map<string, { niveles: Set<string>; centros: Set<string> }>;
        }
      >();

      for (const a of asignaciones) {
        const dName = a.docente?.nombre || "Sin docente";
        const dEmail = a.docente?.email || "";
        const mName = a.materia?.nombre || "";
        const nName = a.materia?.nivel?.nombre || "";
        const cName = a.centro?.nombre || "";

        if (!docenteMap.has(dName)) {
          docenteMap.set(dName, { email: dEmail, materias: new Map() });
        }
        const docEntry = docenteMap.get(dName)!;
        if (!docEntry.materias.has(mName)) {
          docEntry.materias.set(mName, { niveles: new Set(), centros: new Set() });
        }
        const mEntry = docEntry.materias.get(mName)!;
        if (nName) mEntry.niveles.add(nName);
        if (cName) mEntry.centros.add(cName);
      }

      const crossRows: any[][] = [
        ["Docente", "Correo", "Asignatura", "Nivel(es)", "Centro(s) / Grupo(s)"],
      ];

      for (const [docName, docData] of docenteMap) {
        for (const [matName, matData] of docData.materias) {
          crossRows.push([
            docName,
            docData.email,
            matName,
            Array.from(matData.niveles).join(", "),
            Array.from(matData.centros).join(", "),
          ]);
        }
      }

      const wsCross = XLSX.utils.aoa_to_sheet(crossRows);
      const crossWidths = crossRows[0].map((_: any, i: number) => {
        const maxLen = Math.max(
          ...crossRows.map((r) => String(r[i] || "").length)
        );
        return { wch: Math.min(maxLen + 2, 60) };
      });
      wsCross["!cols"] = crossWidths;
      XLSX.utils.book_append_sheet(wb, wsCross, "Cruce Docente-Asignaturas");
    }

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="exportacion_horarios.xlsx"',
      },
    });
  } catch (error) {
    console.error("[Export Excel Error]", error);
    return c.json({ error: "Failed to export Excel" }, 500);
  }
});

// ============================================================
// Page view analytics
// ============================================================
admin_routes.get("/analytics", async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const views: any[] = await (prisma as any).pageView.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    // Total views
    const totalViews = views.length;
    // Unique sessions
    const uniqueSessions = new Set(views.filter((v) => v.sessionId).map((v) => v.sessionId)).size;

    // Views by page type
    const byPage: Record<string, number> = {};
    views.forEach((v) => { byPage[v.pagina] = (byPage[v.pagina] || 0) + 1; });

    // Horario views by nivel
    const horarioViews = views.filter((v) => v.pagina === "horario" && v.nivelId);
    const byNivel: Record<number, number> = {};
    horarioViews.forEach((v) => { byNivel[v.nivelId!] = (byNivel[v.nivelId!] || 0) + 1; });

    // Horario views by centro
    const byCentro: Record<number, number> = {};
    horarioViews.forEach((v) => { if (v.centroId) byCentro[v.centroId] = (byCentro[v.centroId] || 0) + 1; });

    // Unique sessions per nivel
    const uniqueByNivel: Record<number, number> = {};
    horarioViews.forEach((v) => {
      if (!v.nivelId) return;
      if (!uniqueByNivel[v.nivelId]) uniqueByNivel[v.nivelId] = 0;
    });
    for (const nivelId of Object.keys(byNivel)) {
      const sessions = new Set(horarioViews.filter((v) => v.nivelId === parseInt(nivelId) && v.sessionId).map((v) => v.sessionId));
      uniqueByNivel[parseInt(nivelId)] = sessions.size;
    }

    // Unique sessions per centro
    const uniqueByCentro: Record<number, number> = {};
    for (const centroId of Object.keys(byCentro)) {
      const sessions = new Set(horarioViews.filter((v) => v.centroId === parseInt(centroId) && v.sessionId).map((v) => v.sessionId));
      uniqueByCentro[parseInt(centroId)] = sessions.size;
    }

    // Views by day (for chart)
    const byDay: Record<string, number> = {};
    const uniqueByDay: Record<string, Set<string>> = {};
    views.forEach((v) => {
      const day = v.createdAt.toISOString().split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
      if (v.sessionId) {
        if (!uniqueByDay[day]) uniqueByDay[day] = new Set();
        uniqueByDay[day].add(v.sessionId);
      }
    });
    const dailyChart = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        views: count,
        visitors: uniqueByDay[date]?.size || 0,
      }));

    // Device detection
    const devices: Record<string, number> = {};
    const uniqueAgents = new Map<string, string>(); // sessionId → userAgent
    views.forEach((v) => {
      if (v.sessionId && v.userAgent && !uniqueAgents.has(v.sessionId)) {
        uniqueAgents.set(v.sessionId, v.userAgent);
      }
    });
    for (const [, ua] of uniqueAgents) {
      let device = "Otro";
      if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS";
      else if (/Android/i.test(ua)) device = "Android";
      else if (/Windows/i.test(ua)) device = "Windows";
      else if (/Macintosh|Mac OS/i.test(ua)) device = "macOS";
      else if (/Linux/i.test(ua)) device = "Linux";
      devices[device] = (devices[device] || 0) + 1;
    }

    // Nivel/centro cross (nivel+centro → unique visitors)
    const crossNivelCentro: Record<string, { nivelId: number; centroId: number; views: number; unique: number }> = {};
    horarioViews.forEach((v) => {
      if (!v.nivelId || !v.centroId) return;
      const key = `${v.nivelId}_${v.centroId}`;
      if (!crossNivelCentro[key]) crossNivelCentro[key] = { nivelId: v.nivelId, centroId: v.centroId, views: 0, unique: 0 };
      crossNivelCentro[key].views++;
    });
    for (const key of Object.keys(crossNivelCentro)) {
      const { nivelId, centroId } = crossNivelCentro[key];
      const sessions = new Set(horarioViews.filter((v) => v.nivelId === nivelId && v.centroId === centroId && v.sessionId).map((v) => v.sessionId));
      crossNivelCentro[key].unique = sessions.size;
    }

    // Enrich with names
    const [niveles, centros] = await Promise.all([
      prisma.nivel.findMany({ select: { id: true, numero: true, nombre: true } }),
      prisma.centro.findMany({ select: { id: true, nombre: true, zona: true } }),
    ]);
    const nivelMap = new Map(niveles.map((n) => [n.id, n]));
    const centroMap = new Map(centros.map((c) => [c.id, c]));

    const nivelStats = Object.entries(byNivel)
      .map(([id, count]) => ({
        nivelId: parseInt(id),
        nombre: nivelMap.get(parseInt(id))?.nombre || `Nivel ${id}`,
        numero: nivelMap.get(parseInt(id))?.numero || 0,
        views: count,
        unique: uniqueByNivel[parseInt(id)] || 0,
      }))
      .sort((a, b) => a.numero - b.numero);

    const centroStats = Object.entries(byCentro)
      .map(([id, count]) => ({
        centroId: parseInt(id),
        nombre: centroMap.get(parseInt(id))?.nombre || `Centro ${id}`,
        zona: centroMap.get(parseInt(id))?.zona || "",
        views: count,
        unique: uniqueByCentro[parseInt(id)] || 0,
      }))
      .sort((a, b) => b.unique - a.unique);

    const crossStats = Object.values(crossNivelCentro)
      .map((x) => ({
        ...x,
        nivelNombre: nivelMap.get(x.nivelId)?.nombre || `Nivel ${x.nivelId}`,
        nivelNumero: nivelMap.get(x.nivelId)?.numero || 0,
        centroNombre: centroMap.get(x.centroId)?.nombre || `Centro ${x.centroId}`,
      }))
      .sort((a, b) => a.nivelNumero - b.nivelNumero || a.centroNombre.localeCompare(b.centroNombre));

    return c.json({
      days,
      totalViews,
      uniqueSessions,
      byPage,
      nivelStats,
      centroStats,
      crossStats,
      dailyChart,
      devices,
    });
  } catch (error) {
    console.error("[Analytics Error]", error);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

export default admin_routes;
