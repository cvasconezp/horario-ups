/**
 * Date utilities that handle UTC dates correctly.
 * All dates from the API are stored as UTC midnight (e.g., 2026-04-04T00:00:00.000Z).
 * We must use UTC methods to avoid timezone shifts.
 */

const spanishDays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const spanishMonths = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Parse an API date string to a Date, ensuring we use UTC.
 * Handles both ISO strings ("2026-04-04T00:00:00.000Z") and date-only ("2026-04-04").
 */
export function parseUTCDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  // If it's just a date string (YYYY-MM-DD), append T12:00:00 to avoid timezone shift
  if (dateStr.length === 10) {
    return new Date(dateStr + 'T12:00:00');
  }
  // For ISO strings, create date and use UTC values to build a local-tz-safe date
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
}

/**
 * Format a date in Spanish: "viernes 3 de abril"
 */
export function formatSpanishDate(date: Date): string {
  const dayName = spanishDays[date.getDay()];
  const dayNum = date.getDate();
  const monthName = spanishMonths[date.getMonth()];
  return `${dayName} ${dayNum} de ${monthName}`;
}

/**
 * Format a date with year: "3 de abril de 2026"
 */
export function formatSpanishDateLong(date: Date): string {
  const dayNum = date.getDate();
  const monthName = spanishMonths[date.getMonth()];
  const year = date.getFullYear();
  return `${dayNum} de ${monthName} de ${year}`;
}

/**
 * Get the Monday that starts the week containing the given date.
 */
export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff, 12, 0, 0);
}

/**
 * Get a week key string for grouping.
 */
export function getWeekKey(date: Date): string {
  const weekStart = getWeekStartDate(date);
  const y = weekStart.getFullYear();
  const m = String(weekStart.getMonth() + 1).padStart(2, '0');
  const d = String(weekStart.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export { spanishDays, spanishMonths };
