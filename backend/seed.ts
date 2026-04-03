import prisma from './src/db';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Iniciando seed con datos reales del Período 68...');

  // Clean existing data in order
  await prisma.sesionPresencial.deleteMany();
  await prisma.sesionOnline.deleteMany();
  await prisma.asignacion.deleteMany();
  await prisma.calendarioEvento.deleteMany();
  await prisma.materia.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.docente.deleteMany();
  await prisma.nivel.deleteMany();
  await prisma.periodo.deleteMany();
  await prisma.centro.deleteMany();
  await prisma.carrera.deleteMany();

  // ═══════════════════════════════════════
  //  1. CARRERA
  // ═══════════════════════════════════════
  const carrera = await prisma.carrera.create({
    data: { nombre: 'Educación Intercultural Bilingüe', codigo: 'EIB', activa: true },
  });

  // ═══════════════════════════════════════
  //  2. PERÍODO 68
  // ═══════════════════════════════════════
  const periodo = await prisma.periodo.create({
    data: {
      carreraId: carrera.id,
      numero: 68,
      label: 'Marzo – Agosto 2026',
      fechaInicio: new Date('2026-04-06'),
      fechaFin: new Date('2026-08-15'),
      activo: true,
    },
  });

  // ═══════════════════════════════════════
  //  3. CENTROS
  // ═══════════════════════════════════════
  const centrosData = [
    { nombre: 'Latacunga', zona: 'RL' },
    { nombre: 'Cayambe', zona: 'OC' },
    { nombre: 'Otavalo', zona: 'OC' },
    { nombre: 'Riobamba', zona: 'RL' },
    { nombre: 'Amazonía Norte', zona: 'OC' },
    { nombre: 'Wasakentsa', zona: 'OC' },
    { nombre: 'Todos los centros', zona: 'OC' },
  ];

  const centros: Record<string, any> = {};
  for (const c of centrosData) {
    centros[c.nombre] = await prisma.centro.create({ data: c });
  }

  // ═══════════════════════════════════════
  //  4. NIVELES
  // ═══════════════════════════════════════
  const nivelesData = [
    { carreraId: carrera.id, numero: 2, nombre: 'Segundo Nivel' },
    { carreraId: carrera.id, numero: 4, nombre: 'Cuarto Nivel' },
    { carreraId: carrera.id, numero: 6, nombre: 'Sexto Nivel' },
    { carreraId: carrera.id, numero: 8, nombre: 'Octavo Nivel' },
    { carreraId: carrera.id, numero: 9, nombre: 'Plan de Contingencia (Malla Rediseño)' },
  ];

  const niveles: Record<number, any> = {};
  for (const n of nivelesData) {
    niveles[n.numero] = await prisma.nivel.create({ data: n });
  }

  // ═══════════════════════════════════════
  //  5. DOCENTES
  // ═══════════════════════════════════════
  const docentesNombres = [
    'Pascale Laso', 'Silvania Salazar', 'Jéniffer Carrillo', 'Víctor Oquendo',
    'Hernán Hermosa', 'Guillermo Guato', 'Mario Chicaiza', 'Leonela Cucurela',
    'Dunia Ojeda', 'Ramiro Rubio', 'Gladys Castro', 'Aurora Iza',
    'Patricia Raygoza', 'Azucena Bastidas', 'Diana Guitarra', 'Soledad Guzmán',
    'Héctor Cárdenas', 'Alejandra González', 'Jessica Villamar', 'Teresa Vaca',
    'Catalina Álvarez', 'Fernando Garcés', 'Luis Montaluisa', 'Diana Avila',
    'Departamento de Idiomas',
  ];

  const docentes: Record<string, any> = {};
  for (const nombre of docentesNombres) {
    docentes[nombre] = await prisma.docente.create({ data: { nombre } });
  }
  // Aliases for name variations in different Excel files
  docentes['Catalina Alvarez'] = docentes['Catalina Álvarez'];
  docentes['Jeniffer Carrillo'] = docentes['Jéniffer Carrillo'];
  docentes['Victor Oquendo'] = docentes['Víctor Oquendo'];
  docentes['Soledad Guzmán (tutor local)'] = docentes['Soledad Guzmán'];

  // ═══════════════════════════════════════
  //  6. MATERIAS + ASIGNACIONES
  // ═══════════════════════════════════════
  async function crearMateria(data: {
    nivelNum: number; nombre: string; corto: string; tipo: string;
    dia: string | null; hora: string | null; duracion: number | null;
    bimestreOC: number; bimestreRL: number;
    tutoria?: string | null; nota?: string | null;
    docentesPorCentro: Record<string, string>;
  }) {
    const materia = await prisma.materia.create({
      data: {
        nivelId: niveles[data.nivelNum].id, periodoId: periodo.id,
        nombre: data.nombre, nombreCorto: data.corto, tipo: data.tipo,
        dia: data.dia, hora: data.hora, duracion: data.duracion,
        bimestreOC: data.bimestreOC, bimestreRL: data.bimestreRL,
        tutoria: data.tutoria || null, nota: data.nota || null,
      },
    });
    for (const [centroNombre, docenteNombre] of Object.entries(data.docentesPorCentro)) {
      if (centros[centroNombre] && docentes[docenteNombre]) {
        await prisma.asignacion.create({
          data: { materiaId: materia.id, centroId: centros[centroNombre].id, docenteId: docentes[docenteNombre].id },
        });
      }
    }
    return materia;
  }

  // ── SEGUNDO NIVEL ──
  const n2m1 = await crearMateria({ nivelNum: 2, nombre: 'Práctica Preprofesional: Acercamiento a los Contextos y Sujetos de la Educación', corto: 'Práctica Preprofesional', tipo: 'clase-tutoria', dia: 'Lunes', hora: '17:00', duracion: 90, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Pascale Laso', Cayambe: 'Silvania Salazar', Otavalo: 'Jéniffer Carrillo', Riobamba: 'Víctor Oquendo' } });
  const n2m2 = await crearMateria({ nivelNum: 2, nombre: 'Comunicación Oral y Escrita II: Castellano', corto: 'Comunicación Oral y Escrita II', tipo: 'clase-tutoria', dia: 'Lunes', hora: '18:30', duracion: 90, bimestreOC: 2, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Hernán Hermosa', Cayambe: 'Hernán Hermosa', Otavalo: 'Hernán Hermosa', Riobamba: 'Hernán Hermosa' } });
  const n2m3 = await crearMateria({ nivelNum: 2, nombre: 'Metodología de la Investigación Educativa I: Aproximación y Descripción de la Realidad Educativa', corto: 'Metodología Investigación I', tipo: 'clase-tutoria', dia: 'Martes', hora: '17:00', duracion: 90, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Jéniffer Carrillo', Cayambe: 'Jéniffer Carrillo', Otavalo: 'Guillermo Guato', Riobamba: 'Guillermo Guato' } });
  const n2m4 = await crearMateria({ nivelNum: 2, nombre: 'Cátedra Integradora: Aproximación a los Contextos y Sujetos de la Educación', corto: 'Cátedra Integradora', tipo: 'por-confirmar', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Pascale Laso', Cayambe: 'Silvania Salazar', Otavalo: 'Jéniffer Carrillo', Riobamba: 'Víctor Oquendo' } });
  const n2m5 = await crearMateria({ nivelNum: 2, nombre: 'Historia de los Pueblos y Nacionalidades Indígenas', corto: 'Historia de los Pueblos', tipo: 'por-confirmar', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Mario Chicaiza', Cayambe: 'Leonela Cucurela', Otavalo: 'Leonela Cucurela', Riobamba: 'Mario Chicaiza' } });
  const n2m6 = await crearMateria({ nivelNum: 2, nombre: 'Ética', corto: 'Ética', tipo: 'por-confirmar', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Dunia Ojeda', Cayambe: 'Ramiro Rubio', Otavalo: 'Ramiro Rubio', Riobamba: 'Dunia Ojeda' } });
  const n2m7 = await crearMateria({ nivelNum: 2, nombre: 'Inglés A1', corto: 'Inglés A1', tipo: 'semestral', dia: 'Miércoles y Viernes', hora: '18:30–20:30', duracion: 120, bimestreOC: 0, bimestreRL: 0, tutoria: 'Miércoles 16:00–17:00', nota: 'Inicio: 22 de abril de 2026', docentesPorCentro: { Latacunga: 'Departamento de Idiomas', Cayambe: 'Departamento de Idiomas', Otavalo: 'Departamento de Idiomas', Riobamba: 'Departamento de Idiomas' } });

  // ── CUARTO NIVEL ──
  const n4m1 = await crearMateria({ nivelNum: 4, nombre: 'Matemática y su Didáctica con Enfoque Intercultural', corto: 'Matemática y Didáctica', tipo: 'clase-tutoria', dia: 'Lunes', hora: '17:00', duracion: 90, bimestreOC: 2, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Héctor Cárdenas', Cayambe: 'Héctor Cárdenas', Otavalo: 'Héctor Cárdenas', Riobamba: 'Héctor Cárdenas' } });
  const n4m2 = await crearMateria({ nivelNum: 4, nombre: 'Cátedra Integradora: Modelos Pedagógicos y Curriculares', corto: 'Cátedra Integradora', tipo: 'clase-tutoria', dia: 'Martes', hora: '17:00', duracion: 90, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Gladys Castro', Cayambe: 'Aurora Iza', Otavalo: 'Patricia Raygoza', Riobamba: 'Patricia Raygoza' } });
  const n4m3 = await crearMateria({ nivelNum: 4, nombre: 'Práctica Preprofesional: Modelos Pedagógicos y Curriculares', corto: 'Práctica Preprofesional', tipo: 'clase-tutoria', dia: 'Martes', hora: '18:30', duracion: 90, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Gladys Castro', Cayambe: 'Aurora Iza', Otavalo: 'Azucena Bastidas', Riobamba: 'Silvania Salazar' } });
  const n4m4 = await crearMateria({ nivelNum: 4, nombre: 'Currículo y Planificación Educativa para EIB', corto: 'Currículo y Planificación', tipo: 'por-confirmar', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Diana Guitarra', Cayambe: 'Diana Guitarra', Otavalo: 'Patricia Raygoza', Riobamba: 'Patricia Raygoza' } });
  const n4m5 = await crearMateria({ nivelNum: 4, nombre: 'Pensamiento Social de la Iglesia', corto: 'Pensamiento Social', tipo: 'por-confirmar', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Dunia Ojeda', Cayambe: 'Dunia Ojeda', Otavalo: 'Dunia Ojeda', Riobamba: 'Dunia Ojeda' } });
  const n4m6 = await crearMateria({ nivelNum: 4, nombre: 'Lengua Indígena I', corto: 'Lengua Indígena I', tipo: 'semestral', dia: 'Jueves', hora: '17:00', duracion: 90, bimestreOC: 0, bimestreRL: 0, nota: 'Inducción obligatoria: sábado 4 de abril, 8:30–12:30', docentesPorCentro: { Latacunga: 'Diana Guitarra', Cayambe: 'Diana Guitarra', Otavalo: 'Soledad Guzmán', Riobamba: 'Soledad Guzmán' } });
  const n4m7 = await crearMateria({ nivelNum: 4, nombre: 'Inglés B1', corto: 'Inglés B1', tipo: 'semestral', dia: 'Miércoles y Viernes', hora: '18:30–20:30', duracion: 120, bimestreOC: 0, bimestreRL: 0, tutoria: 'Miércoles 16:00–17:00', nota: 'Inicio: 22 de abril de 2026', docentesPorCentro: { Latacunga: 'Departamento de Idiomas', Cayambe: 'Departamento de Idiomas', Otavalo: 'Departamento de Idiomas', Riobamba: 'Departamento de Idiomas' } });

  // ── SEXTO NIVEL ──
  const n6m1 = await crearMateria({ nivelNum: 6, nombre: 'Metodología de la Investigación Educativa II: Formulación de Proyectos de Investigación', corto: 'Metodología Investigación II', tipo: 'clase-tutoria', dia: 'Lunes', hora: '17:00', duracion: 90, bimestreOC: 1, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Alejandra González', Cayambe: 'Alejandra González', Otavalo: 'Guillermo Guato', Riobamba: 'Guillermo Guato' } });
  const n6m2 = await crearMateria({ nivelNum: 6, nombre: 'Práctica Servicio Comunitario', corto: 'Práctica Servicio Comunitario', tipo: 'semestral', dia: 'Lunes', hora: '18:30', duracion: 90, bimestreOC: 0, bimestreRL: 0, docentesPorCentro: { Latacunga: 'Pascale Laso', Cayambe: 'Aurora Iza', Otavalo: 'Pascale Laso', Riobamba: 'Aurora Iza' } });
  const n6m3 = await crearMateria({ nivelNum: 6, nombre: 'Ciencias Naturales y su Didáctica con Enfoque Intercultural', corto: 'Ciencias Naturales y Didáctica', tipo: 'clase-tutoria', dia: 'Martes', hora: '17:00', duracion: 90, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Víctor Oquendo', Cayambe: 'Teresa Vaca', Otavalo: 'Teresa Vaca', Riobamba: 'Víctor Oquendo' } });
  const n6m4 = await crearMateria({ nivelNum: 6, nombre: 'Cátedra Integradora: Ambientes, Estrategias y Recursos Innovadores e Inclusivos', corto: 'Cátedra Integradora', tipo: 'clase-tutoria', dia: 'Martes', hora: '18:30', duracion: 90, bimestreOC: 2, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Alejandra González', Cayambe: 'Jessica Villamar', Otavalo: 'Alejandra González', Riobamba: 'Jessica Villamar' } });
  const n6m5 = await crearMateria({ nivelNum: 6, nombre: 'Bilingüismo y Revitalización Lingüística', corto: 'Bilingüismo', tipo: 'por-confirmar', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Catalina Álvarez', Cayambe: 'Catalina Álvarez', Otavalo: 'Soledad Guzmán', Riobamba: 'Catalina Álvarez' } });
  const n6m6 = await crearMateria({ nivelNum: 6, nombre: 'Lengua Indígena III', corto: 'Lengua Indígena III', tipo: 'semestral', dia: 'Jueves', hora: '18:30', duracion: 90, bimestreOC: 0, bimestreRL: 0, docentesPorCentro: { Latacunga: 'Soledad Guzmán', Cayambe: 'Diana Guitarra', Otavalo: 'Fernando Garcés', Riobamba: 'Aurora Iza' } });

  // ── OCTAVO NIVEL ──
  const n8m1 = await crearMateria({ nivelNum: 8, nombre: 'Política y Legislación Educativa', corto: 'Política y Legislación', tipo: 'clase-tutoria', dia: 'Lunes', hora: '17:00', duracion: 90, bimestreOC: 1, bimestreRL: 2, docentesPorCentro: { Latacunga: 'Jéniffer Carrillo', Cayambe: 'Catalina Álvarez', Otavalo: 'Leonela Cucurela', Riobamba: 'Jéniffer Carrillo', 'Amazonía Norte': 'Catalina Álvarez', Wasakentsa: 'Catalina Álvarez' } });
  const n8m2 = await crearMateria({ nivelNum: 8, nombre: 'Integración Curricular: Propuesta de Intervención Educativa y Sistematización de la Práctica', corto: 'Integración Curricular', tipo: 'semestral', dia: 'Lunes', hora: '18:30', duracion: 90, bimestreOC: 0, bimestreRL: 0, docentesPorCentro: { Latacunga: 'Patricia Raygoza', Cayambe: 'Patricia Raygoza', Otavalo: 'Guillermo Guato', Riobamba: 'Guillermo Guato', 'Amazonía Norte': 'Pascale Laso', Wasakentsa: 'Pascale Laso' } });
  const n8m3 = await crearMateria({ nivelNum: 8, nombre: 'Profesión e Identidad Docente', corto: 'Profesión e Identidad', tipo: 'clase-tutoria', dia: 'Martes', hora: '17:00', duracion: 90, bimestreOC: 2, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Azucena Bastidas', Cayambe: 'Diana Avila', Otavalo: 'Azucena Bastidas', Riobamba: 'Azucena Bastidas', 'Amazonía Norte': 'Diana Avila', Wasakentsa: 'Diana Avila' } });
  const n8m4 = await crearMateria({ nivelNum: 8, nombre: 'Metodología de la Investigación Educativa IV: Sistematización de la Información y Redacción del Informe', corto: 'Metodología Investigación IV', tipo: 'clase-tutoria', dia: 'Martes', hora: '18:30', duracion: 90, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { Latacunga: 'Jéniffer Carrillo', Cayambe: 'Mario Chicaiza', Otavalo: 'Leonela Cucurela', Riobamba: 'Leonela Cucurela', 'Amazonía Norte': 'Mario Chicaiza', Wasakentsa: 'Mario Chicaiza' } });
  const n8m5 = await crearMateria({ nivelNum: 8, nombre: 'Lengua Indígena V', corto: 'Lengua Indígena V', tipo: 'semestral', dia: 'Jueves', hora: '17:00', duracion: 90, bimestreOC: 0, bimestreRL: 0, docentesPorCentro: { Latacunga: 'Aurora Iza', Cayambe: 'Luis Montaluisa', Otavalo: 'Fernando Garcés', Riobamba: 'Luis Montaluisa', 'Amazonía Norte': 'Luis Montaluisa', Wasakentsa: 'Soledad Guzmán' } });

  // ── NIVEL 9 (Plan de Contingencia) ──
  await crearMateria({ nivelNum: 9, nombre: 'Trabajo de Titulación II', corto: 'Trabajo de Titulación II', tipo: 'semestral', dia: 'Lunes', hora: '18:30', duracion: 90, bimestreOC: 0, bimestreRL: 0, nota: 'Sigue el horario de Integración Curricular (Ajuste)', docentesPorCentro: { 'Todos los centros': 'Patricia Raygoza' } });
  await crearMateria({ nivelNum: 9, nombre: 'Cátedra Integradora IX: Evaluación y Sistematización de la Práctica Educativa con Enfoque Intercultural', corto: 'Cátedra Integradora IX', tipo: 'clase-tutoria', dia: null, hora: null, duracion: null, bimestreOC: 1, bimestreRL: 1, docentesPorCentro: { 'Todos los centros': 'Jessica Villamar' } });
  await crearMateria({ nivelNum: 9, nombre: 'Ciencia, Tecnología y Sociedad', corto: 'Ciencia, Tecnología y Sociedad', tipo: 'clase-tutoria', dia: null, hora: null, duracion: null, bimestreOC: 2, bimestreRL: 2, docentesPorCentro: { 'Todos los centros': 'Guillermo Guato' } });
  await crearMateria({ nivelNum: 9, nombre: 'Práctica IX: Propuesta de Intervención Educativa', corto: 'Práctica IX', tipo: 'semestral', dia: null, hora: null, duracion: null, bimestreOC: 0, bimestreRL: 0, docentesPorCentro: { 'Todos los centros': 'Jessica Villamar' } });

  console.log('✅ Materias y asignaciones creadas');

  // ═══════════════════════════════════════
  //  7. SESIONES EN LÍNEA
  // ═══════════════════════════════════════
  type SesionData = { f: string; h: string; t: string; u: number };
  async function crearSesiones(materiaId: number, sesiones: SesionData[], grupo?: string) {
    for (const s of sesiones) {
      await prisma.sesionOnline.create({
        data: { materiaId, fecha: new Date(s.f), hora: s.h, tipo: s.t, unidad: s.u, grupo: grupo || null },
      });
    }
  }

  // Nivel 2
  await crearSesiones(n2m1.id, [
    { f: '2026-04-04', h: '17:00', t: 'clase', u: 3 }, { f: '2026-04-06', h: '17:00', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '17:00', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '17:00', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-25', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n2m2.id, [
    { f: '2026-04-04', h: '18:30', t: 'clase', u: 3 }, { f: '2026-04-06', h: '18:30', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '18:30', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '18:30', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '18:30', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-25', h: '18:30', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n2m3.id, [
    { f: '2026-04-07', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-14', h: '17:00', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '17:00', t: 'clase', u: 2 }, { f: '2026-04-28', h: '17:00', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-12', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-26', h: '17:00', t: 'tutoria', u: 4 },
  ]);

  // Nivel 4
  await crearSesiones(n4m1.id, [
    { f: '2026-04-04', h: '17:00', t: 'clase', u: 3 }, { f: '2026-04-06', h: '17:00', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '17:00', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '17:00', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-25', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n4m2.id, [
    { f: '2026-04-07', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-14', h: '17:00', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '17:00', t: 'clase', u: 2 }, { f: '2026-04-28', h: '17:00', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-12', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-26', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n4m3.id, [
    { f: '2026-04-07', h: '18:30', t: 'clase', u: 1 }, { f: '2026-04-14', h: '18:30', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '18:30', t: 'clase', u: 2 }, { f: '2026-04-28', h: '18:30', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '18:30', t: 'clase', u: 3 }, { f: '2026-05-12', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-26', h: '18:30', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n4m6.id, [
    { f: '2026-04-09', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-23', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-05-07', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-21', h: '17:00', t: 'clase', u: 4 },
  ]);

  // Nivel 6
  await crearSesiones(n6m1.id, [
    { f: '2026-04-04', h: '17:00', t: 'clase', u: 3 }, { f: '2026-04-06', h: '17:00', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '17:00', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '17:00', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-25', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n6m2.id, [
    { f: '2026-04-04', h: '18:30', t: 'clase', u: 3 }, { f: '2026-04-06', h: '18:30', t: 'clase', u: 1 },
    { f: '2026-04-20', h: '18:30', t: 'clase', u: 2 }, { f: '2026-05-18', h: '18:30', t: 'clase', u: 4 },
  ]);
  await crearSesiones(n6m3.id, [
    { f: '2026-04-07', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-14', h: '17:00', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '17:00', t: 'clase', u: 2 }, { f: '2026-04-28', h: '17:00', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-12', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-26', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n6m4.id, [
    { f: '2026-04-07', h: '18:30', t: 'clase', u: 1 }, { f: '2026-04-14', h: '18:30', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '18:30', t: 'clase', u: 2 }, { f: '2026-04-28', h: '18:30', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '18:30', t: 'clase', u: 3 }, { f: '2026-05-12', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-26', h: '18:30', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n6m6.id, [
    { f: '2026-04-09', h: '18:30', t: 'clase', u: 1 }, { f: '2026-04-23', h: '18:30', t: 'clase', u: 2 },
    { f: '2026-05-07', h: '18:30', t: 'clase', u: 3 }, { f: '2026-05-21', h: '18:30', t: 'clase', u: 4 },
  ]);

  // Nivel 8 - Sierra
  await crearSesiones(n8m1.id, [
    { f: '2026-04-04', h: '17:00', t: 'clase', u: 3 }, { f: '2026-04-06', h: '17:00', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '17:00', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '17:00', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-25', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n8m2.id, [
    { f: '2026-04-04', h: '18:30', t: 'clase', u: 3 }, { f: '2026-04-06', h: '18:30', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '18:30', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '18:30', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '18:30', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-25', h: '18:30', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n8m3.id, [
    { f: '2026-04-07', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-14', h: '17:00', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '17:00', t: 'clase', u: 2 }, { f: '2026-04-28', h: '17:00', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-12', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-26', h: '17:00', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n8m4.id, [
    { f: '2026-04-07', h: '18:30', t: 'clase', u: 1 }, { f: '2026-04-14', h: '18:30', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '18:30', t: 'clase', u: 2 }, { f: '2026-04-28', h: '18:30', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '18:30', t: 'clase', u: 3 }, { f: '2026-05-12', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-26', h: '18:30', t: 'tutoria', u: 4 },
  ]);
  await crearSesiones(n8m5.id, [
    { f: '2026-04-09', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-23', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-05-07', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-21', h: '17:00', t: 'clase', u: 4 },
  ]);

  // Nivel 8 - Amazonía
  await crearSesiones(n8m1.id, [
    { f: '2026-04-04', h: '17:00', t: 'clase', u: 3 }, { f: '2026-04-06', h: '17:00', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '17:00', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '17:00', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '17:00', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-25', h: '17:00', t: 'tutoria', u: 4 },
  ], 'amazonia');
  await crearSesiones(n8m2.id, [
    { f: '2026-04-04', h: '18:30', t: 'clase', u: 3 }, { f: '2026-04-06', h: '18:30', t: 'clase', u: 1 },
    { f: '2026-04-13', h: '18:30', t: 'tutoria', u: 1 }, { f: '2026-04-20', h: '18:30', t: 'clase', u: 2 },
    { f: '2026-04-27', h: '18:30', t: 'tutoria', u: 2 }, { f: '2026-05-11', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-18', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-25', h: '18:30', t: 'tutoria', u: 4 },
  ], 'amazonia');
  await crearSesiones(n8m3.id, [
    { f: '2026-04-07', h: '17:00', t: 'clase', u: 1 }, { f: '2026-04-14', h: '17:00', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '17:00', t: 'clase', u: 2 }, { f: '2026-04-28', h: '17:00', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '17:00', t: 'clase', u: 3 }, { f: '2026-05-12', h: '17:00', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '17:00', t: 'clase', u: 4 }, { f: '2026-05-26', h: '17:00', t: 'tutoria', u: 4 },
  ], 'amazonia');
  await crearSesiones(n8m4.id, [
    { f: '2026-04-07', h: '18:30', t: 'clase', u: 1 }, { f: '2026-04-14', h: '18:30', t: 'tutoria', u: 1 },
    { f: '2026-04-21', h: '18:30', t: 'clase', u: 2 }, { f: '2026-04-28', h: '18:30', t: 'tutoria', u: 2 },
    { f: '2026-05-05', h: '18:30', t: 'clase', u: 3 }, { f: '2026-05-12', h: '18:30', t: 'tutoria', u: 3 },
    { f: '2026-05-19', h: '18:30', t: 'clase', u: 4 }, { f: '2026-05-26', h: '18:30', t: 'tutoria', u: 4 },
  ], 'amazonia');
  await crearSesiones(n8m5.id, [
    { f: '2026-04-09', h: '18:30', t: 'clase', u: 1 }, { f: '2026-04-23', h: '18:30', t: 'clase', u: 2 },
    { f: '2026-05-07', h: '18:30', t: 'clase', u: 3 }, { f: '2026-05-21', h: '18:30', t: 'clase', u: 4 },
  ], 'amazonia');

  console.log('✅ Sesiones online creadas');

  // ═══════════════════════════════════════
  //  8. PRESENCIALES (muestra Cayambe, Latacunga, Otavalo, Riobamba - Nivel 2)
  // ═══════════════════════════════════════
  type PresData = { mId: number; centro: string; doc: string; fecha: string; dia: string; hi: string; hf: string; tipo: string; bim: number };
  async function crearPres(items: PresData[]) {
    for (const p of items) {
      const c = centros[p.centro]; const d = docentes[p.doc];
      if (!c || !d) continue;
      await prisma.sesionPresencial.create({
        data: { materiaId: p.mId, centroId: c.id, docenteId: d.id, fecha: new Date(p.fecha), diaSemana: p.dia, horaInicio: p.hi, horaFin: p.hf, tipo: p.tipo, bimestre: p.bim },
      });
    }
  }

  await crearPres([
    // Cayambe Bim1
    { mId: n2m3.id, centro: 'Cayambe', doc: 'Jéniffer Carrillo', fecha: '2026-04-18', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 1 },
    { mId: n2m1.id, centro: 'Cayambe', doc: 'Silvania Salazar', fecha: '2026-04-18', dia: 'Sábado', hi: '13:30', hf: '17:30', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Cayambe', doc: 'Jéniffer Carrillo', fecha: '2026-05-16', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 1 },
    { mId: n2m1.id, centro: 'Cayambe', doc: 'Silvania Salazar', fecha: '2026-05-17', dia: 'Domingo', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Cayambe', doc: 'Jéniffer Carrillo', fecha: '2026-05-30', dia: 'Sábado', hi: '08:30', hf: '10:30', tipo: 'examen', bim: 1 },
    { mId: n2m1.id, centro: 'Cayambe', doc: 'Silvania Salazar', fecha: '2026-05-30', dia: 'Sábado', hi: '10:30', hf: '12:30', tipo: 'examen', bim: 1 },
    // Cayambe Bim2
    { mId: n2m5.id, centro: 'Cayambe', doc: 'Leonela Cucurela', fecha: '2026-06-13', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 2 },
    { mId: n2m2.id, centro: 'Cayambe', doc: 'Hernán Hermosa', fecha: '2026-06-13', dia: 'Sábado', hi: '13:30', hf: '17:30', tipo: 'clase', bim: 2 },
    { mId: n2m4.id, centro: 'Cayambe', doc: 'Silvania Salazar', fecha: '2026-06-14', dia: 'Domingo', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 2 },
    { mId: n2m5.id, centro: 'Cayambe', doc: 'Leonela Cucurela', fecha: '2026-07-11', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 2 },
    { mId: n2m2.id, centro: 'Cayambe', doc: 'Hernán Hermosa', fecha: '2026-07-11', dia: 'Sábado', hi: '13:30', hf: '17:30', tipo: 'clase', bim: 2 },
    { mId: n2m6.id, centro: 'Cayambe', doc: 'Ramiro Rubio', fecha: '2026-07-25', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 2 },
    // Latacunga Bim1
    { mId: n2m1.id, centro: 'Latacunga', doc: 'Pascale Laso', fecha: '2026-04-11', dia: 'Sábado', hi: '08:30', hf: '12:00', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Latacunga', doc: 'Jéniffer Carrillo', fecha: '2026-04-11', dia: 'Sábado', hi: '13:00', hf: '16:30', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Latacunga', doc: 'Jéniffer Carrillo', fecha: '2026-04-25', dia: 'Sábado', hi: '08:30', hf: '12:00', tipo: 'clase', bim: 1 },
    { mId: n2m2.id, centro: 'Latacunga', doc: 'Hernán Hermosa', fecha: '2026-04-25', dia: 'Sábado', hi: '13:00', hf: '16:30', tipo: 'clase', bim: 1 },
    { mId: n2m2.id, centro: 'Latacunga', doc: 'Hernán Hermosa', fecha: '2026-05-16', dia: 'Sábado', hi: '08:30', hf: '12:00', tipo: 'clase', bim: 1 },
    { mId: n2m1.id, centro: 'Latacunga', doc: 'Pascale Laso', fecha: '2026-05-16', dia: 'Sábado', hi: '13:00', hf: '16:30', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Latacunga', doc: 'Jéniffer Carrillo', fecha: '2026-05-30', dia: 'Sábado', hi: '08:30', hf: '10:00', tipo: 'examen', bim: 1 },
    { mId: n2m2.id, centro: 'Latacunga', doc: 'Hernán Hermosa', fecha: '2026-05-30', dia: 'Sábado', hi: '10:30', hf: '12:30', tipo: 'examen', bim: 1 },
    // Otavalo Bim1
    { mId: n2m3.id, centro: 'Otavalo', doc: 'Guillermo Guato', fecha: '2026-04-18', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 1 },
    { mId: n2m1.id, centro: 'Otavalo', doc: 'Jéniffer Carrillo', fecha: '2026-04-18', dia: 'Sábado', hi: '13:30', hf: '17:30', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Otavalo', doc: 'Guillermo Guato', fecha: '2026-05-16', dia: 'Sábado', hi: '08:30', hf: '12:30', tipo: 'clase', bim: 1 },
    { mId: n2m3.id, centro: 'Otavalo', doc: 'Guillermo Guato', fecha: '2026-05-30', dia: 'Sábado', hi: '08:30', hf: '10:30', tipo: 'examen', bim: 1 },
    { mId: n2m1.id, centro: 'Otavalo', doc: 'Jéniffer Carrillo', fecha: '2026-05-30', dia: 'Sábado', hi: '10:30', hf: '12:30', tipo: 'examen', bim: 1 },
    // Riobamba Bim1
    { mId: n2m3.id, centro: 'Riobamba', doc: 'Guillermo Guato', fecha: '2026-04-11', dia: 'Sábado', hi: '08:30', hf: '12:00', tipo: 'clase', bim: 1 },
    { mId: n2m2.id, centro: 'Riobamba', doc: 'Hernán Hermosa', fecha: '2026-04-11', dia: 'Sábado', hi: '13:00', hf: '16:30', tipo: 'clase', bim: 1 },
    { mId: n2m1.id, centro: 'Riobamba', doc: 'Víctor Oquendo', fecha: '2026-04-12', dia: 'Domingo', hi: '08:30', hf: '12:00', tipo: 'clase', bim: 1 },
  ]);

  console.log('✅ Sesiones presenciales creadas');

  // ═══════════════════════════════════════
  //  9. CALENDARIO ACADÉMICO
  // ═══════════════════════════════════════
  const eventos = [
    { tipo: 'induccion', fecha: '2026-04-04', bimestre: null as number | null, nota: 'Inducción Lengua Indígena I - Sábado 8:30-12:30' },
    { tipo: 'inicio_bimestre', fecha: '2026-04-06', bimestre: 1, nota: 'Inicio de clases primer bimestre' },
    { tipo: 'inicio_ingles', fecha: '2026-04-22', bimestre: null as number | null, nota: 'Inicio Inglés A1 y B1' },
    { tipo: 'entrega', fecha: '2026-04-19', bimestre: 1, nota: 'Entrega actividad 1' },
    { tipo: 'entrega', fecha: '2026-05-03', bimestre: 1, nota: 'Entrega actividad 2' },
    { tipo: 'entrega', fecha: '2026-05-17', bimestre: 1, nota: 'Entrega actividad 3' },
    { tipo: 'entrega', fecha: '2026-05-29', bimestre: 1, nota: 'Entrega actividad 4' },
    { tipo: 'examen', fecha: '2026-05-30', bimestre: 1, nota: 'Exámenes finales' },
    { tipo: 'examen', fecha: '2026-05-31', bimestre: 1, nota: 'Exámenes finales' },
    { tipo: 'paso_notas', fecha: '2026-06-01', bimestre: 1, nota: 'Paso de notas del 1 al 6 de junio' },
    { tipo: 'recuperacion', fecha: '2026-06-06', bimestre: 1, nota: 'Exámenes de recuperación' },
    { tipo: 'recuperacion', fecha: '2026-06-07', bimestre: 1, nota: 'Exámenes de recuperación' },
    { tipo: 'inicio_bimestre', fecha: '2026-06-08', bimestre: 2, nota: 'Inicio de clases segundo bimestre' },
    { tipo: 'entrega', fecha: '2026-06-21', bimestre: 2, nota: 'Entrega actividad 1' },
    { tipo: 'entrega', fecha: '2026-07-05', bimestre: 2, nota: 'Entrega actividad 2' },
    { tipo: 'entrega', fecha: '2026-07-19', bimestre: 2, nota: 'Entrega actividad 3' },
    { tipo: 'entrega', fecha: '2026-07-31', bimestre: 2, nota: 'Entrega actividad 4' },
    { tipo: 'examen', fecha: '2026-08-01', bimestre: 2, nota: 'Exámenes finales' },
    { tipo: 'examen', fecha: '2026-08-02', bimestre: 2, nota: 'Exámenes finales' },
    { tipo: 'paso_notas', fecha: '2026-08-03', bimestre: 2, nota: 'Paso de notas del 3 al 8 de agosto' },
    { tipo: 'recuperacion', fecha: '2026-08-08', bimestre: 2, nota: 'Exámenes de recuperación' },
    { tipo: 'recuperacion', fecha: '2026-08-09', bimestre: 2, nota: 'Exámenes de recuperación' },
  ];

  for (const evt of eventos) {
    await prisma.calendarioEvento.create({
      data: { periodoId: periodo.id, tipo: evt.tipo, fecha: new Date(evt.fecha), bimestre: evt.bimestre, nota: evt.nota },
    });
  }
  console.log('✅ Calendario académico creado');

  // ═══════════════════════════════════════
  //  10. USUARIO ADMIN
  // ═══════════════════════════════════════
  const passwordHash = await bcrypt.hash('admin2026', 10);
  await prisma.usuario.create({
    data: { email: 'cvasconezp@gmail.com', passwordHash, nombre: 'Carlos Vásconez', rol: 'superadmin' },
  });
  console.log('✅ Usuario admin: cvasconezp@gmail.com / admin2026');

  console.log('\n🎉 Seed completado con todos los datos del Período 68!');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
