/**
 * Parser for schedule Excel files (formato visual de horarios).
 * These are Excel files with sheets named like "Riobamba - II Nivel Ajuste"
 * containing presencial session schedules in a human-readable layout.
 */
import * as XLSX from "xlsx";
import prisma from "../db.js";

// Map Spanish month names to numbers (0-indexed)
const MONTHS: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

// Map Roman numerals to numbers
const ROMAN: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};

interface ParsedSession {
  sheetName: string;
  centroName: string;
  nivelNumero: number;
  fecha: Date;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipo: string; // "tutoria" or "examen"
  bimestre: number;
  materiaNombre: string;
  docenteNombre: string;
}

/**
 * Detect if this workbook is a schedule file (vs structured import).
 * Schedule files have sheet names like "Riobamba - II Nivel"
 */
export function isScheduleFile(sheetNames: string[]): boolean {
  // If it has any of the structured sheets, it's a structured import
  const structuredSheets = ["Carreras", "Periodos", "Niveles", "Centros", "Docentes", "Materias"];
  if (structuredSheets.some((s) => sheetNames.includes(s))) return false;
  // If sheet names contain "Nivel", it's a schedule file
  return sheetNames.some((s) => /nivel/i.test(s));
}

/**
 * Parse a date string like "sábado 11 de abril de 2026" or "sábado 30  de mayo de 2026"
 */
function parseSpanishDate(text: string): Date | null {
  if (!text) return null;
  // Normalize spaces
  const clean = text.replace(/\s+/g, " ").trim().toLowerCase();
  // Match patterns: "11 de abril de 2026", "30 de mayo de 2026"
  const match = clean.match(/(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+|del?\s+)?(\d{4})/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = MONTHS[match[2]];
  const year = parseInt(match[3]);
  if (month === undefined || isNaN(day) || isNaN(year)) return null;
  return new Date(year, month, day);
}

/**
 * Parse a time range like "08:30 - 12:00" or "13:00 -16:30" or "  8:30 - 10:30"
 */
function parseTimeRange(text: string): { horaInicio: string; horaFin: string } | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  const match = clean.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  const pad = (t: string) => {
    const [h, m] = t.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  };
  return { horaInicio: pad(match[1]), horaFin: pad(match[2]) };
}

/**
 * Extract centro name and nivel number from sheet name.
 * E.g. "Riobamba - II Nivel Ajuste" → { centro: "Riobamba", nivel: 2 }
 * E.g. "Latacunga - VIII Nivel - Ajuste" → { centro: "Latacunga", nivel: 8 }
 */
function parseSheetName(name: string): { centroName: string; nivelNumero: number } | null {
  // Try to match "Centro - Roman Nivel"
  const match = name.match(/^(.+?)\s*-\s*(I{1,3}V?|V?I{0,3}|VIII|IX|X)\s*N/i);
  if (!match) return null;
  const centroName = match[1].trim();
  const romanStr = match[2].toUpperCase();
  const nivelNumero = ROMAN[romanStr];
  if (!nivelNumero) return null;
  return { centroName, nivelNumero };
}

/**
 * Parse all sheets in the workbook and extract presencial sessions.
 */
export function parseScheduleFile(buffer: Buffer, targetPeriodo?: number): ParsedSession[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sessions: ParsedSession[] = [];

  for (const sheetName of workbook.SheetNames) {
    const info = parseSheetName(sheetName);
    if (!info) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // If a target periodo is specified, skip sheets that don't match
    if (targetPeriodo) {
      let sheetPeriodo = 0;
      for (const row of rows.slice(0, 6)) {
        const cell = String(row?.[0] || "");
        const match = cell.match(/Periodo\s+(\d+)/i);
        if (match) { sheetPeriodo = parseInt(match[1]); break; }
      }
      if (sheetPeriodo && sheetPeriodo !== targetPeriodo) continue;
    }

    let currentBimestre = 1;
    let isExamen = false;
    let currentDate: Date | null = null;
    let currentDiaSemana = "Sábado";
    // Track second-column date (domingo) for sheets with saturday+sunday layout
    let sundayDate: Date | null = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const cell0 = String(row[0] || "").trim();
      const cell0Lower = cell0.toLowerCase();

      // Detect bimestre
      if (cell0Lower.includes("segundo parcial") || cell0Lower.includes("2do parcial")) {
        currentBimestre = 2;
        isExamen = false;
        continue;
      }
      if (cell0Lower.includes("primer parcial") || cell0Lower.includes("1er parcial")) {
        currentBimestre = 1;
        isExamen = false;
        continue;
      }

      // Detect examen section
      if (cell0Lower.includes("examen")) {
        isExamen = true;
        continue;
      }

      // Detect tutoría section (reset examen flag)
      if (cell0Lower.includes("tutoría") || cell0Lower.includes("tutoria") || cell0Lower.includes("encuentro presencial")) {
        isExamen = false;
        continue;
      }

      // Detect date lines - could be "Fechas: sábado 11 de abril de 2026"
      if (cell0Lower.startsWith("fecha")) {
        const parsed = parseSpanishDate(cell0);
        if (parsed) {
          currentDate = parsed;
          // Determine day of week
          const dayOfWeek = parsed.getDay();
          const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
          currentDiaSemana = dayNames[dayOfWeek];
        }
        // Also check column 4 or 5 for a second date (domingo)
        const cell4 = String(row[4] || "").trim();
        if (cell4.toLowerCase().startsWith("fecha")) {
          sundayDate = parseSpanishDate(cell4);
        } else {
          sundayDate = null;
        }
        continue;
      }

      // Skip header rows (Sábado, Materia, Docente)
      if (cell0Lower === "sábado" || cell0Lower === "sabado" || cell0Lower === "domingo" ||
          cell0Lower.startsWith("sábado") || cell0Lower.startsWith("domingo")) {
        continue;
      }

      // Parse session rows: time range in column 0, materia in column 1, docente in column 2
      const timeRange = parseTimeRange(cell0);
      if (timeRange && currentDate) {
        const materiaNombre = String(row[1] || "").trim();
        const docenteNombre = String(row[2] || "").trim();

        if (materiaNombre) {
          sessions.push({
            sheetName,
            centroName: info.centroName,
            nivelNumero: info.nivelNumero,
            fecha: currentDate,
            diaSemana: currentDiaSemana,
            horaInicio: timeRange.horaInicio,
            horaFin: timeRange.horaFin,
            tipo: isExamen ? "examen" : "tutoria",
            bimestre: currentBimestre,
            materiaNombre,
            docenteNombre,
          });
        }

        // Check columns 4-6 for a parallel Sunday session
        if (row.length > 5) {
          const timeRange2 = parseTimeRange(String(row[4] || ""));
          const materia2 = String(row[5] || "").trim();
          const docente2 = String(row[6] || "").trim();
          const useDate = sundayDate || currentDate;

          if (timeRange2 && materia2) {
            const dayOfWeek = useDate.getDay();
            const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            sessions.push({
              sheetName,
              centroName: info.centroName,
              nivelNumero: info.nivelNumero,
              fecha: useDate,
              diaSemana: dayNames[dayOfWeek],
              horaInicio: timeRange2.horaInicio,
              horaFin: timeRange2.horaFin,
              tipo: isExamen ? "examen" : "tutoria",
              bimestre: currentBimestre,
              materiaNombre: materia2,
              docenteNombre: docente2,
            });
          } else if (!timeRange2 && materia2) {
            // Sometimes the sunday column doesn't repeat the time
            sessions.push({
              sheetName,
              centroName: info.centroName,
              nivelNumero: info.nivelNumero,
              fecha: useDate,
              diaSemana: sundayDate ? (["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][sundayDate.getDay()]) : currentDiaSemana,
              horaInicio: timeRange.horaInicio,
              horaFin: timeRange.horaFin,
              tipo: isExamen ? "examen" : "tutoria",
              bimestre: currentBimestre,
              materiaNombre: materia2,
              docenteNombre: docente2,
            });
          }
        }
      }
    }
  }

  return sessions;
}

/**
 * Import parsed schedule sessions into the database.
 * Matches materias and docentes by name, creates SesionPresencial records.
 */
export async function importScheduleSessions(sessions: ParsedSession[], periodoNumero: number) {
  const results: Array<{ success: boolean; data: any; error: string | null }> = [];

  // Find the active periodo
  const periodo = await prisma.periodo.findFirst({
    where: { numero: periodoNumero, activo: true },
    include: { carrera: true },
  });

  if (!periodo) {
    return [{ success: false, data: null, error: `Periodo ${periodoNumero} not found or not active` }];
  }

  // Cache lookups
  const centroCache = new Map<string, number>();
  const nivelCache = new Map<number, number>();
  const materiaCache = new Map<string, number>();
  const docenteCache = new Map<string, number>();

  const centros = await prisma.centro.findMany();
  centros.forEach((c) => centroCache.set(c.nombre.toLowerCase(), c.id));

  const niveles = await prisma.nivel.findMany({ where: { carreraId: periodo.carreraId } });
  niveles.forEach((n) => nivelCache.set(n.numero, n.id));

  const materias = await prisma.materia.findMany({ where: { periodoId: periodo.id } });
  materias.forEach((m) => materiaCache.set(m.nombre.toLowerCase().trim(), m.id));

  const docentes = await prisma.docente.findMany();
  docentes.forEach((d) => docenteCache.set(d.nombre.toLowerCase().trim(), d.id));

  // Track what we've created to show summary
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const session of sessions) {
    try {
      // Resolve centro
      let centroId: number | undefined;
      for (const [name, id] of centroCache) {
        if (name.includes(session.centroName.toLowerCase()) || session.centroName.toLowerCase().includes(name)) {
          centroId = id;
          break;
        }
      }
      if (!centroId) {
        results.push({ success: false, data: null, error: `Centro "${session.centroName}" not found` });
        errors++;
        continue;
      }

      // Resolve nivel
      const nivelId = nivelCache.get(session.nivelNumero);
      if (!nivelId) {
        results.push({ success: false, data: null, error: `Nivel ${session.nivelNumero} not found` });
        errors++;
        continue;
      }

      // Resolve materia (fuzzy match by name within same periodo)
      let materiaId: number | undefined;
      const sessionMatLower = session.materiaNombre.toLowerCase().trim();
      // Exact match first
      materiaId = materiaCache.get(sessionMatLower);
      // If not found, try partial match
      if (!materiaId) {
        for (const [matName, matId] of materiaCache) {
          if (matName.includes(sessionMatLower) || sessionMatLower.includes(matName)) {
            materiaId = matId;
            break;
          }
        }
      }
      // Still not found? Try matching by significant words
      if (!materiaId) {
        const words = sessionMatLower.split(/\s+/).filter((w) => w.length > 4);
        for (const [matName, matId] of materiaCache) {
          const matchCount = words.filter((w) => matName.includes(w)).length;
          if (matchCount >= 2) {
            materiaId = matId;
            break;
          }
        }
      }

      if (!materiaId) {
        results.push({ success: false, data: null, error: `Materia "${session.materiaNombre}" not found in periodo ${periodoNumero} (sheet: ${session.sheetName})` });
        errors++;
        continue;
      }

      // Resolve docente (optional)
      let docenteId: number | null = null;
      if (session.docenteNombre) {
        const docLower = session.docenteNombre.toLowerCase().trim();
        docenteId = docenteCache.get(docLower) || null;
        if (!docenteId) {
          // Try partial match
          for (const [docName, docId] of docenteCache) {
            if (docName.includes(docLower) || docLower.includes(docName)) {
              docenteId = docId;
              break;
            }
          }
        }
        // If still not found, try matching by last name
        if (!docenteId) {
          const parts = docLower.split(/\s+/);
          const lastName = parts[parts.length - 1];
          if (lastName && lastName.length > 3) {
            for (const [docName, docId] of docenteCache) {
              if (docName.includes(lastName)) {
                docenteId = docId;
                break;
              }
            }
          }
        }
      }

      // Check for duplicate before creating
      const existing = await prisma.sesionPresencial.findFirst({
        where: {
          materiaId,
          centroId,
          fecha: session.fecha,
          horaInicio: session.horaInicio,
        },
      });

      if (existing) {
        // Update if different
        const needsUpdate =
          existing.horaFin !== session.horaFin ||
          existing.tipo !== session.tipo ||
          existing.bimestre !== session.bimestre ||
          (docenteId && existing.docenteId !== docenteId);

        if (needsUpdate) {
          await prisma.sesionPresencial.update({
            where: { id: existing.id },
            data: {
              horaFin: session.horaFin,
              tipo: session.tipo,
              bimestre: session.bimestre,
              ...(docenteId ? { docenteId } : {}),
            },
          });
          created++;
        } else {
          skipped++;
        }
        continue;
      }

      // Create session
      await prisma.sesionPresencial.create({
        data: {
          materiaId,
          centroId,
          docenteId,
          fecha: session.fecha,
          diaSemana: session.diaSemana,
          horaInicio: session.horaInicio,
          horaFin: session.horaFin,
          tipo: session.tipo,
          bimestre: session.bimestre,
        },
      });
      created++;
    } catch (error) {
      results.push({ success: false, data: null, error: `Error: ${String(error)}` });
      errors++;
    }
  }

  results.unshift({
    success: true,
    data: { totalParsed: sessions.length, created, skipped, errors },
    error: null,
  });

  return results;
}
