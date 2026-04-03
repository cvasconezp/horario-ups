export interface Carrera {
  id: number;
  nombre: string;
  codigo: string;
  activa: boolean;
}

export interface Periodo {
  id: number;
  carreraId: number;
  numero: number;
  label: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface Centro {
  id: number;
  nombre: string;
  zona: string; // OC, RL, AN, WK
}

export interface Nivel {
  id: number;
  carreraId: number;
  numero: number;
  nombre: string;
}

export interface Docente {
  id: number;
  nombre: string;
  email: string | null;
}

export interface Materia {
  id: number;
  nivelId: number;
  periodoId: number;
  nombre: string;
  nombreCorto: string;
  tipo: string;
  dia: string | null;
  hora: string | null;
  duracion: number | null;
  bimestreOC: number;
  bimestreRL: number;
  tutoria: string | null;
  nota: string | null;
}

export interface Asignacion {
  id: number;
  materiaId: number;
  centroId: number;
  docenteId: number;
  enlaceVirtual: string | null;
  materia?: Materia;
  centro?: Centro;
  docente?: Docente;
}

export interface SesionOnline {
  id: number;
  materiaId: number;
  fecha: string;
  hora: string;
  tipo: string;
  unidad: number;
  grupo: string | null;
  materia?: Materia;
}

export interface SesionPresencial {
  id: number;
  materiaId: number;
  centroId: number;
  docenteId: number | null;
  fecha: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipo: string;
  bimestre: number;
  materia?: Materia;
  centro?: Centro;
  docente?: Docente;
}

export interface CalendarioEvento {
  id: number;
  periodoId: number;
  tipo: string;
  fecha: string;
  fechaFin: string | null;
  bimestre: number | null;
  nota: string | null;
}

export interface HorarioResponse {
  nivel: Nivel;
  centro: Centro;
  periodo: Periodo;
  materias: (Materia & {
    docente: Docente;
    enlaceVirtual: string | null;
  })[];
}

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}
