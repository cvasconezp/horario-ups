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
  const limit = Math.min(100, parseInt(c.req.query("limit") || String(ITEMS_PER_PAGE)));
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

export default admin_routes;
