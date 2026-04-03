# Horario UPS Backend API Documentation

## Overview

This is a complete REST API for the Universidad Politécnica Salesiana (UPS) schedule management system. Built with Node.js, Hono, TypeScript, and PostgreSQL.

## Base URL

Production: `https://api.horario.ups.edu.ec`
Development: `http://localhost:3001`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Token Format

JWT tokens contain the following claims:
- `id`: User ID
- `email`: User email
- `rol`: User role (superadmin, coordinador, docente)
- `docenteId`: Teacher ID (optional)

## Public Routes

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### GET /api/carreras

List all active degree programs.

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Ingeniería en Sistemas",
    "codigo": "INGSOFT",
    "activa": true,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

### GET /api/periodos?carreraId=1

List all active periods for a degree program.

**Query Parameters:**
- `carreraId` (required): Degree program ID

**Response:**
```json
[
  {
    "id": 1,
    "carreraId": 1,
    "numero": 1,
    "label": "Marzo – Agosto 2026",
    "fechaInicio": "2026-03-01T00:00:00.000Z",
    "fechaFin": "2026-08-31T00:00:00.000Z",
    "activo": true,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

### GET /api/niveles?carreraId=1

List all course levels for a degree program.

**Query Parameters:**
- `carreraId` (required): Degree program ID

**Response:**
```json
[
  {
    "id": 1,
    "carreraId": 1,
    "numero": 1,
    "nombre": "Primer Nivel",
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

### GET /api/centros

List all study centers.

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Quito",
    "zona": "OC",
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

### GET /api/horario/:periodoId/:nivelId/:centroId

Get the complete schedule for a level and center.

**Path Parameters:**
- `periodoId`: Period ID
- `nivelId`: Level ID
- `centroId`: Center ID

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Programación I",
    "nombreCorto": "PROG-I",
    "tipo": "clase-tutoria",
    "dia": "Lunes",
    "hora": "14:00",
    "duracion": 120,
    "asignaciones": [
      {
        "id": 1,
        "materiaId": 1,
        "centroId": 1,
        "docenteId": 1,
        "enlaceVirtual": "https://meet.google.com/abc-def-ghi",
        "docente": { "id": 1, "nombre": "Dr. Juan García", "email": "docente@ups.edu.ec" },
        "centro": { "id": 1, "nombre": "Quito", "zona": "OC" }
      }
    ],
    "presenciales": [...]
  }
]
```

### GET /api/sesiones-online/:periodoId/:nivelId

Get online sessions for a level.

**Path Parameters:**
- `periodoId`: Period ID
- `nivelId`: Level ID

**Response:**
```json
[
  {
    "id": 1,
    "materiaId": 1,
    "fecha": "2026-03-15T00:00:00.000Z",
    "hora": "14:00",
    "tipo": "clase",
    "unidad": 1,
    "grupo": null,
    "materia": { "id": 1, "nombre": "Programación I" }
  }
]
```

### GET /api/presenciales/:periodoId/:nivelId/:centroId

Get in-person sessions for a level and center.

**Path Parameters:**
- `periodoId`: Period ID
- `nivelId`: Level ID
- `centroId`: Center ID

**Response:**
```json
[
  {
    "id": 1,
    "materiaId": 1,
    "centroId": 1,
    "docenteId": 1,
    "fecha": "2026-03-22T00:00:00.000Z",
    "diaSemana": "Domingo",
    "horaInicio": "14:00",
    "horaFin": "16:00",
    "tipo": "clase",
    "bimestre": 1,
    "materia": { "id": 1, "nombre": "Programación I" },
    "docente": { "id": 1, "nombre": "Dr. Juan García" }
  }
]
```

### GET /api/calendario/:periodoId

Get calendar events for a period.

**Path Parameters:**
- `periodoId`: Period ID

**Response:**
```json
[
  {
    "id": 1,
    "periodoId": 1,
    "tipo": "inicio_bimestre",
    "fecha": "2026-03-01T00:00:00.000Z",
    "fechaFin": null,
    "bimestre": 1,
    "nota": "Inicio del primer bimestre"
  }
]
```

### GET /api/docente/:docenteId/horario/:periodoId

Get a teacher's complete schedule.

**Path Parameters:**
- `docenteId`: Teacher ID
- `periodoId`: Period ID

**Response:**
```json
{
  "asignaciones": [...],
  "presenciales": [...]
}
```

## Authentication Routes

### POST /api/auth/login

Login with email and password to get JWT token.

**Request Body:**
```json
{
  "email": "admin@ups.edu.ec",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@ups.edu.ec",
    "nombre": "Admin User",
    "rol": "superadmin",
    "docenteId": null
  }
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

### GET /api/auth/me

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "admin@ups.edu.ec",
  "nombre": "Admin User",
  "rol": "superadmin",
  "docenteId": null,
  "docente": null
}
```

**Response (401):**
```json
{
  "error": "Not authenticated"
}
```

## Admin Routes

All admin routes require authentication with `superadmin` or `coordinador` role.

### Carreras (Degree Programs)

#### GET /api/admin/carreras?page=1&limit=50

List all degree programs with pagination.

**Query Parameters:**
- `page`: Page number (default 1)
- `limit`: Items per page (default 50, max 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 50
  }
}
```

#### GET /api/admin/carreras/:id

Get a specific degree program with related data.

#### POST /api/admin/carreras

Create a new degree program.

**Request Body:**
```json
{
  "nombre": "Ingeniería en Sistemas",
  "codigo": "INGSOFT",
  "activa": true
}
```

#### PUT /api/admin/carreras/:id

Update a degree program.

#### DELETE /api/admin/carreras/:id

Delete a degree program.

### Periodos (Academic Periods)

#### GET /api/admin/periodos?page=1&limit=50
#### GET /api/admin/periodos/:id
#### POST /api/admin/periodos
#### PUT /api/admin/periodos/:id
#### DELETE /api/admin/periodos/:id

Same CRUD operations as Carreras.

**POST/PUT Request Body:**
```json
{
  "carreraId": 1,
  "numero": 1,
  "label": "Marzo – Agosto 2026",
  "fechaInicio": "2026-03-01",
  "fechaFin": "2026-08-31",
  "activo": true
}
```

### Niveles (Course Levels)

#### GET /api/admin/niveles?page=1&limit=50
#### GET /api/admin/niveles/:id
#### POST /api/admin/niveles
#### PUT /api/admin/niveles/:id
#### DELETE /api/admin/niveles/:id

**POST/PUT Request Body:**
```json
{
  "carreraId": 1,
  "numero": 2,
  "nombre": "Segundo Nivel"
}
```

### Centros (Study Centers)

#### GET /api/admin/centros?page=1&limit=50
#### GET /api/admin/centros/:id
#### POST /api/admin/centros
#### PUT /api/admin/centros/:id
#### DELETE /api/admin/centros/:id

**POST/PUT Request Body:**
```json
{
  "nombre": "Quito",
  "zona": "OC"
}
```

### Docentes (Teachers)

#### GET /api/admin/docentes?page=1&limit=50
#### GET /api/admin/docentes/:id
#### POST /api/admin/docentes
#### PUT /api/admin/docentes/:id
#### DELETE /api/admin/docentes/:id

**POST/PUT Request Body:**
```json
{
  "nombre": "Dr. Juan García",
  "email": "docente@ups.edu.ec"
}
```

### Materias (Courses)

#### GET /api/admin/materias?page=1&limit=50
#### GET /api/admin/materias/:id
#### POST /api/admin/materias
#### PUT /api/admin/materias/:id
#### DELETE /api/admin/materias/:id

**POST/PUT Request Body:**
```json
{
  "nivelId": 1,
  "periodoId": 1,
  "nombre": "Programación I",
  "nombreCorto": "PROG-I",
  "tipo": "clase-tutoria",
  "dia": "Lunes",
  "hora": "14:00",
  "duracion": 120,
  "bimestreOC": 1,
  "bimestreRL": 0,
  "tutoria": "Miércoles 16:00–17:00",
  "nota": "Teórico-práctica"
}
```

### Asignaciones (Teacher-Course Assignments)

#### GET /api/admin/asignaciones?page=1&limit=50
#### GET /api/admin/asignaciones/:id
#### POST /api/admin/asignaciones
#### PUT /api/admin/asignaciones/:id
#### DELETE /api/admin/asignaciones/:id

**POST/PUT Request Body:**
```json
{
  "materiaId": 1,
  "centroId": 1,
  "docenteId": 1,
  "enlaceVirtual": "https://meet.google.com/abc-def-ghi"
}
```

### Sesiones Online (Online Sessions)

#### GET /api/admin/sesiones-online?page=1&limit=50
#### GET /api/admin/sesiones-online/:id
#### POST /api/admin/sesiones-online
#### PUT /api/admin/sesiones-online/:id
#### DELETE /api/admin/sesiones-online/:id

**POST/PUT Request Body:**
```json
{
  "materiaId": 1,
  "fecha": "2026-03-15",
  "hora": "14:00",
  "tipo": "clase",
  "unidad": 1,
  "grupo": null
}
```

### Sesiones Presenciales (In-Person Sessions)

#### GET /api/admin/sesiones-presenciales?page=1&limit=50
#### GET /api/admin/sesiones-presenciales/:id
#### POST /api/admin/sesiones-presenciales
#### PUT /api/admin/sesiones-presenciales/:id
#### DELETE /api/admin/sesiones-presenciales/:id

**POST/PUT Request Body:**
```json
{
  "materiaId": 1,
  "centroId": 1,
  "docenteId": 1,
  "fecha": "2026-03-22",
  "diaSemana": "Domingo",
  "horaInicio": "14:00",
  "horaFin": "16:00",
  "tipo": "clase",
  "bimestre": 1
}
```

### Calendario (Calendar Events)

#### GET /api/admin/calendario?page=1&limit=50
#### GET /api/admin/calendario/:id
#### POST /api/admin/calendario
#### PUT /api/admin/calendario/:id
#### DELETE /api/admin/calendario/:id

**POST/PUT Request Body:**
```json
{
  "periodoId": 1,
  "tipo": "inicio_bimestre",
  "fecha": "2026-03-01",
  "fechaFin": null,
  "bimestre": 1,
  "nota": "Inicio del primer bimestre"
}
```

### Usuarios (Users)

#### GET /api/admin/usuarios?page=1&limit=50

List all users.

#### POST /api/admin/usuarios

Create a new user.

**Request Body:**
```json
{
  "email": "docente@ups.edu.ec",
  "nombre": "Dr. Juan García",
  "rol": "docente",
  "password": "securepassword123",
  "docenteId": 1
}
```

### Data Import

#### POST /api/admin/import-excel

Import data from Excel file. File should contain sheets: Carreras, Periodos, Niveles, Centros, Docentes, Materias.

**Request:**
- Content-Type: multipart/form-data
- File field: "file"

**Response:**
```json
{
  "carreras": [
    {
      "success": true,
      "data": { "id": 1, "nombre": "...", "codigo": "..." },
      "error": null
    }
  ],
  "periodos": [...],
  "niveles": [...],
  "centros": [...],
  "docentes": [...],
  "materias": [...]
}
```

## Teacher Routes

All teacher routes require authentication with `rol=docente`.

### GET /api/docente/mi-horario/:periodoId

Get the authenticated teacher's assigned courses for a period.

**Response:**
```json
[
  {
    "id": 1,
    "materiaId": 1,
    "centroId": 1,
    "docenteId": 1,
    "enlaceVirtual": "https://meet.google.com/abc-def-ghi",
    "materia": { "id": 1, "nombre": "Programación I" },
    "docente": { "id": 1, "nombre": "Dr. Juan García" },
    "centro": { "id": 1, "nombre": "Quito", "zona": "OC" }
  }
]
```

### GET /api/docente/mis-sesiones/:periodoId

Get the authenticated teacher's online sessions for a period.

**Response:**
```json
[
  {
    "id": 1,
    "materiaId": 1,
    "fecha": "2026-03-15T00:00:00.000Z",
    "hora": "14:00",
    "tipo": "clase",
    "unidad": 1,
    "grupo": null,
    "materiaNombre": "Programación I"
  }
]
```

### GET /api/docente/mis-presenciales/:periodoId

Get the authenticated teacher's in-person sessions for a period.

**Response:**
```json
[
  {
    "id": 1,
    "materiaId": 1,
    "centroId": 1,
    "docenteId": 1,
    "fecha": "2026-03-22T00:00:00.000Z",
    "diaSemana": "Domingo",
    "horaInicio": "14:00",
    "horaFin": "16:00",
    "tipo": "clase",
    "bimestre": 1,
    "materia": { "id": 1, "nombre": "Programación I" },
    "centro": { "id": 1, "nombre": "Quito", "zona": "OC" }
  }
]
```

### GET /api/docente/calendario/:periodoId/ical

Export the teacher's calendar as an iCalendar (.ics) file.

**Response:** Standard iCalendar format (text/calendar)

**Download Example:**
```
GET /api/docente/calendario/1/ical HTTP/1.1
Authorization: Bearer <token>

Response Headers:
Content-Type: text/calendar; charset=utf-8
Content-Disposition: attachment; filename="horario-Dr-Juan-Garcia.ics"
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

Currently, no rate limiting is implemented. Production deployment should include:
- IP-based rate limiting
- User-based rate limiting
- Per-endpoint limits

## Pagination

List endpoints support pagination with optional query parameters:
- `page`: Page number (starting from 1)
- `limit`: Items per page (1-100, default 50)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

## Development

### Setup

```bash
npm install
cp .env.example .env
# Update .env with your database URL and JWT secret
```

### Running the Server

```bash
npm run dev
```

### Database Management

```bash
# Create/update database schema
npm run db:push

# Launch Prisma Studio
npm run db:studio

# Seed database with sample data
npm run db:seed
```

### Building for Production

```bash
npm run build
npm start
```

## Security Notes

1. **JWT Secret**: Change `JWT_SECRET` in production environment
2. **CORS**: Currently allows all origins. Restrict in production.
3. **Password Hashing**: Uses bcrypt with 10 salt rounds
4. **Input Validation**: Implement additional validation for production
5. **HTTPS**: Always use HTTPS in production

## Deployment

### Railway

1. Connect GitHub repository
2. Set environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Strong random secret
   - `NODE_ENV`: production

3. Deploy with automatic builds

## Support

For issues or questions, contact the UPS IT Department.
