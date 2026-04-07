# Horario UPS

Sistema de gestión de horarios académicos para el programa de **Educación Intercultural Bilingüe (EIB)** de la Universidad Politécnica Salesiana.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | Node.js + [Hono](https://hono.dev/) 4 + TypeScript |
| **Base de datos** | PostgreSQL 15+ con [Prisma](https://www.prisma.io/) ORM |
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 3 |
| **Auth** | JWT (7 días) + bcryptjs |
| **Deploy** | Railway (backend + DB) · Vercel (frontend) |

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)           │  BACKEND (Railway)            │
│  React 19 + Vite + Tailwind  │  Hono 4 + Prisma + JWT       │
│                               │                               │
│  ┌────────────┐  REST ───────►  ┌────────────┐               │
│  │ Estudiante │               │  │ /api/*     │               │
│  └────────────┘               │  └─────┬──────┘               │
│  ┌────────────┐  JWT+REST ──►  ┌──────┴───────────┐          │
│  │ Admin      │               │  │   PostgreSQL     │          │
│  └────────────┘               │  │   (Railway)      │          │
│  ┌────────────┐  JWT+REST ──►  └──────────────────┘          │
│  │ Docente    │               │                               │
│  └────────────┘               │                               │
└──────────────────────────────────────────────────────────────┘
```

## Estructura del Proyecto

```
horario-ups/
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Entry point (Hono server)
│   │   ├── db.ts                    # Prisma client singleton
│   │   ├── middleware/auth.ts       # JWT middleware
│   │   ├── lib/
│   │   │   ├── ical.ts             # Generación de iCalendar
│   │   │   └── excel-import.ts     # Parsing de Excel
│   │   └── routes/
│   │       ├── auth.ts             # Login y /me
│   │       ├── public.ts           # Endpoints públicos
│   │       ├── admin.ts            # CRUD administrativo
│   │       └── docente.ts          # Vista del docente
│   ├── prisma/schema.prisma        # Modelo de datos
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Routing principal
│   │   ├── pages/
│   │   │   ├── Home.tsx             # Selector periodo/nivel/centro
│   │   │   ├── ScheduleView.tsx     # Calendario del estudiante
│   │   │   ├── Login.tsx
│   │   │   ├── admin/               # 15 páginas de administración
│   │   │   └── docente/MiHorario.tsx
│   │   ├── components/
│   │   │   ├── schedule/            # WeeklySchedule, OnlineSessions, etc.
│   │   │   └── admin/               # DataTable, FormModal, ExcelImport
│   │   ├── context/AuthContext.tsx
│   │   ├── utils/                   # dates.ts, tracking.ts
│   │   └── api/client.ts           # Axios + JWT interceptor
│   ├── vercel.json                  # SPA rewrites
│   └── package.json
└── README.md
```

## Modelo de Datos

13 modelos en PostgreSQL gestionados con Prisma:

| Modelo | Descripción |
|--------|------------|
| **Carrera** | Carreras universitarias |
| **Periodo** | Semestres académicos |
| **Nivel** | Ciclos/niveles de la carrera |
| **Centro** | Sedes geográficas (Latacunga, Riobamba, Otavalo, Cayambe, Amazonía Norte, Wasakentsa) |
| **Docente** | Profesores del programa |
| **Materia** | Asignaturas con día/hora base y duración |
| **Asignacion** | Vincula Docente + Materia + Centro (con `diaOverride`/`horaOverride` por centro) |
| **SesionOnline** | Clases y tutorías virtuales programadas |
| **SesionPresencial** | Tutorías y exámenes presenciales |
| **CalendarioEvento** | Eventos académicos (entregas, feriados, exámenes) |
| **IcalSuscripcion** | Tracking de suscripciones iCalendar |
| **PageView** | Analíticas de visitas |
| **Usuario** | Usuarios del sistema con roles (superadmin, coordinador, docente) |

### Relaciones clave

- `Carrera → Periodo[]` y `Carrera → Nivel[]`
- `Nivel + Periodo → Materia[]`
- `Asignacion` = `Materia × Centro × Docente` (unique por materia+centro)
- `SesionOnline.grupo` filtra sesiones por centro específico
- `Asignacion.diaOverride/horaOverride` personaliza horarios por centro

## API Endpoints

### Públicos (`/api`)

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/activo` | Periodo activo con niveles y centros |
| GET | `/horarios/:periodoId/:nivelId/:centroId` | Horario del estudiante |
| GET | `/sesiones-online` | Sesiones virtuales filtradas |
| GET | `/sesiones-presenciales` | Sesiones presenciales |
| GET | `/calendario` | Eventos del calendario académico |
| GET | `/ical/:periodoId/:nivelId/:centroId` | Exportar a iCalendar (.ics) |
| GET | `/ical/docente/:docenteId/:periodoId` | iCal del docente |
| POST | `/track` | Registrar page view |

### Admin (`/api/admin`) — JWT requerido

CRUD completo para: carreras, periodos, niveles, centros, docentes, materias, asignaciones, sesiones online, sesiones presenciales, y calendario.

Endpoints adicionales: `/stats`, `/conflicts`, `/import-excel`, `/export-excel`, `/whatsapp-export`, `/ical-stats`, `/analytics`, `/usuarios`.

### Docente (`/api/docente`) — JWT requerido

`/mi-horario/:periodoId`, `/mis-sesiones/:periodoId`, `/mis-presenciales/:periodoId`, `/calendario/:periodoId/ical`

## Funcionalidades Principales

- **Vista del estudiante**: Calendario semanal con sesiones online, presenciales y eventos académicos
- **Panel de administración**: CRUD completo con importación Excel y exportación
- **Override por centro**: Personalizar día/hora de una materia para un centro sin afectar otros
- **Zonas y bimestres**: Zona Norte (bimestreOC) y Zona Sur (bimestreRL) con calendarios independientes
- **iCalendar**: Suscripción .ics compatible con Apple Calendar, Google Calendar, Outlook
- **Analíticas**: Visitantes únicos, vistas por nivel/centro, distribución por dispositivo (timezone Ecuador)
- **Exportación WhatsApp**: Horarios formateados para compartir por mensajería
- **Detección de conflictos**: Identifica docentes con sesiones simultáneas

## Desarrollo Local

### Requisitos

- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
# Clonar
git clone https://github.com/cvasconezp/horario-ups.git
cd horario-ups

# Backend
cd backend
npm install
cp .env.example .env
# Editar .env: DATABASE_URL y JWT_SECRET
npx prisma db push
npm run dev              # → http://localhost:3001

# Frontend (otra terminal)
cd frontend
npm install
cp .env.example .env
# Editar .env: VITE_API_URL=http://localhost:3001
npm run dev              # → http://localhost:5173
```

### Variables de Entorno

**Backend** (`.env`):

| Variable | Requerida | Descripción |
|----------|-----------|------------|
| `DATABASE_URL` | Sí | URL de PostgreSQL |
| `JWT_SECRET` | Sí | Clave para firmar JWT (min 32 chars) |
| `PORT` | No | Puerto del servidor (default: 3001) |

**Frontend** (`.env`):

| Variable | Requerida | Descripción |
|----------|-----------|------------|
| `VITE_API_URL` | Sí | URL base del backend |

## Despliegue

### Backend → Railway

- Build: `prisma generate && tsc`
- Start: `node dist/index.js`
- **Nota**: `prisma db push` NO puede ejecutarse en build (la DB interna solo es accesible en runtime)

### Frontend → Vercel

- Build: `tsc -b && vite build`
- Output: `dist/`
- `vercel.json` configura rewrites para SPA routing

Ambos servicios hacen auto-deploy al pushear a `main`.

## Licencia

Proyecto privado — Universidad Politécnica Salesiana / PachaTech.
