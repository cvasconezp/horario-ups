import IcalGenerator from "ical-generator";

export interface CalendarSession {
  id: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

export function generateICalendar(
  docenteName: string,
  sessions: CalendarSession[]
): string {
  const cal = new (IcalGenerator as any)({
    prodId: "//Horario UPS//Schedule Management System//EN",
    name: `Horario - ${docenteName}`,
    timezone: "America/Guayaquil",
  });

  sessions.forEach((session) => {
    cal.createEvent({
      id: `session-${session.id}@horario-ups.edu.ec`,
      summary: session.title,
      description: session.description || "",
      location: session.location || "",
      start: session.startDate,
      end: session.endDate,
      created: new Date(),
      lastModified: new Date(),
    });
  });

  return cal.toString();
}

export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function createSessionEndTime(
  startTimeStr: string,
  durationMinutes: number
): string {
  const startMinutes = timeStringToMinutes(startTimeStr);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTimeString(endMinutes);
}
