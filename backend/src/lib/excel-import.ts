import * as XLSX from "xlsx";
import prisma from "../db.js";

export interface CarreraRow {
  nombre: string;
  codigo: string;
  activa?: boolean;
}

export interface PeriodoRow {
  carreraCodigo: string;
  numero: number;
  label: string;
  fechaInicio: string;
  fechaFin: string;
  activo?: boolean;
}

export interface NivelRow {
  carreraCodigo: string;
  numero: number;
  nombre: string;
}

export interface CentroRow {
  nombre: string;
  zona: string;
}

export interface DocenteRow {
  nombre: string;
  email?: string;
}

export interface MateriaRow {
  carreraCodigo: string;
  periodoNumero: number;
  nivelNumero: number;
  nombre: string;
  nombreCorto: string;
  tipo: string;
  dia?: string;
  hora?: string;
  duracion?: number;
  bimestreOC?: number;
  bimestreRL?: number;
  tutoria?: string;
  nota?: string;
}

export function parseExcelFile(buffer: Buffer): {
  carreras: CarreraRow[];
  periodos: PeriodoRow[];
  niveles: NivelRow[];
  centros: CentroRow[];
  docentes: DocenteRow[];
  materias: MateriaRow[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const extractSheet = (sheetName: string, required: boolean = false): any[] => {
    if (!workbook.SheetNames.includes(sheetName)) {
      if (required) {
        throw new Error(`Sheet "${sheetName}" not found in workbook`);
      }
      return [];
    }
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet) as any[];
  };

  return {
    carreras: extractSheet("Carreras", true) as CarreraRow[],
    periodos: extractSheet("Periodos", true) as PeriodoRow[],
    niveles: extractSheet("Niveles", true) as NivelRow[],
    centros: extractSheet("Centros", true) as CentroRow[],
    docentes: extractSheet("Docentes", true) as DocenteRow[],
    materias: extractSheet("Materias", true) as MateriaRow[],
  };
}

export async function importCarreras(rows: CarreraRow[]) {
  const results = [];
  for (const row of rows) {
    try {
      const carrera = await prisma.carrera.upsert({
        where: { codigo: row.codigo },
        update: {
          nombre: row.nombre,
          activa: row.activa ?? true,
        },
        create: {
          nombre: row.nombre,
          codigo: row.codigo,
          activa: row.activa ?? true,
        },
      });
      results.push({
        success: true,
        data: carrera,
        error: null,
      });
    } catch (error) {
      results.push({
        success: false,
        data: null,
        error: `Failed to import carrera ${row.codigo}: ${String(error)}`,
      });
    }
  }
  return results;
}

export async function importPeriodos(rows: PeriodoRow[]) {
  const results = [];
  for (const row of rows) {
    try {
      const carrera = await prisma.carrera.findUnique({
        where: { codigo: row.carreraCodigo },
      });
      if (!carrera) {
        results.push({
          success: false,
          data: null,
          error: `Carrera with codigo ${row.carreraCodigo} not found`,
        });
        continue;
      }

      const periodo = await prisma.periodo.upsert({
        where: {
          carreraId_numero: {
            carreraId: carrera.id,
            numero: row.numero,
          },
        },
        update: {
          label: row.label,
          fechaInicio: new Date(row.fechaInicio),
          fechaFin: new Date(row.fechaFin),
          activo: row.activo ?? true,
        },
        create: {
          carreraId: carrera.id,
          numero: row.numero,
          label: row.label,
          fechaInicio: new Date(row.fechaInicio),
          fechaFin: new Date(row.fechaFin),
          activo: row.activo ?? true,
        },
      });
      results.push({
        success: true,
        data: periodo,
        error: null,
      });
    } catch (error) {
      results.push({
        success: false,
        data: null,
        error: `Failed to import periodo: ${String(error)}`,
      });
    }
  }
  return results;
}

export async function importNiveles(rows: NivelRow[]) {
  const results = [];
  for (const row of rows) {
    try {
      const carrera = await prisma.carrera.findUnique({
        where: { codigo: row.carreraCodigo },
      });
      if (!carrera) {
        results.push({
          success: false,
          data: null,
          error: `Carrera with codigo ${row.carreraCodigo} not found`,
        });
        continue;
      }

      const nivel = await prisma.nivel.upsert({
        where: {
          carreraId_numero: {
            carreraId: carrera.id,
            numero: row.numero,
          },
        },
        update: {
          nombre: row.nombre,
        },
        create: {
          carreraId: carrera.id,
          numero: row.numero,
          nombre: row.nombre,
        },
      });
      results.push({
        success: true,
        data: nivel,
        error: null,
      });
    } catch (error) {
      results.push({
        success: false,
        data: null,
        error: `Failed to import nivel: ${String(error)}`,
      });
    }
  }
  return results;
}

export async function importCentros(rows: CentroRow[]) {
  const results = [];
  for (const row of rows) {
    try {
      const centro = await prisma.centro.upsert({
        where: { nombre: row.nombre },
        update: {
          zona: row.zona,
        },
        create: {
          nombre: row.nombre,
          zona: row.zona,
        },
      });
      results.push({
        success: true,
        data: centro,
        error: null,
      });
    } catch (error) {
      results.push({
        success: false,
        data: null,
        error: `Failed to import centro ${row.nombre}: ${String(error)}`,
      });
    }
  }
  return results;
}

export async function importDocentes(rows: DocenteRow[]) {
  const results = [];
  for (const row of rows) {
    try {
      const docente = await prisma.docente.upsert({
        where: { email: row.email || `${row.nombre.replace(/\s/g, "").toLowerCase()}@ups.edu.ec` },
        update: {
          nombre: row.nombre,
        },
        create: {
          nombre: row.nombre,
          email: row.email,
        },
      });
      results.push({
        success: true,
        data: docente,
        error: null,
      });
    } catch (error) {
      results.push({
        success: false,
        data: null,
        error: `Failed to import docente ${row.nombre}: ${String(error)}`,
      });
    }
  }
  return results;
}

export async function importMaterias(rows: MateriaRow[]) {
  const results = [];
  for (const row of rows) {
    try {
      const carrera = await prisma.carrera.findUnique({
        where: { codigo: row.carreraCodigo },
      });
      if (!carrera) {
        results.push({
          success: false,
          data: null,
          error: `Carrera with codigo ${row.carreraCodigo} not found`,
        });
        continue;
      }

      const periodo = await prisma.periodo.findFirst({
        where: {
          carreraId: carrera.id,
          numero: row.periodoNumero,
        },
      });
      if (!periodo) {
        results.push({
          success: false,
          data: null,
          error: `Periodo not found for carrera ${row.carreraCodigo} numero ${row.periodoNumero}`,
        });
        continue;
      }

      const nivel = await prisma.nivel.findFirst({
        where: {
          carreraId: carrera.id,
          numero: row.nivelNumero,
        },
      });
      if (!nivel) {
        results.push({
          success: false,
          data: null,
          error: `Nivel not found for carrera ${row.carreraCodigo} numero ${row.nivelNumero}`,
        });
        continue;
      }

      const materia = await prisma.materia.create({
        data: {
          nivelId: nivel.id,
          periodoId: periodo.id,
          nombre: row.nombre,
          nombreCorto: row.nombreCorto,
          tipo: row.tipo,
          dia: row.dia || null,
          hora: row.hora || null,
          duracion: row.duracion || null,
          bimestreOC: row.bimestreOC || 0,
          bimestreRL: row.bimestreRL || 0,
          tutoria: row.tutoria || null,
          nota: row.nota || null,
        },
      });
      results.push({
        success: true,
        data: materia,
        error: null,
      });
    } catch (error) {
      results.push({
        success: false,
        data: null,
        error: `Failed to import materia ${row.nombre}: ${String(error)}`,
      });
    }
  }
  return results;
}
