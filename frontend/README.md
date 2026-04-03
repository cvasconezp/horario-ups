# Horario EIB - Sistema de Horarios UPS

Frontend React + Vite + Tailwind CSS para el Sistema de Gestión de Horarios de la Universidad Politécnica Salesiana.

## Características

- **Interfaz Pública**: Estudiantes pueden consultar horarios por carrera, período, nivel y centro
- **Panel Administrativo**: Gestión completa de carreras, períodos, niveles, centros, docentes, materias, sesiones y eventos
- **Panel Docente**: Docentes pueden ver su horario personal y descargar calendario (ICS)
- **Autenticación JWT**: Sistema seguro de login con tokens
- **Responsivo**: Diseño mobile-first para acceso desde cualquier dispositivo
- **Diseño Profesional**: Tema azul con colores específicos para días de la semana

## Requerimientos

- Node.js 18+
- npm 9+ o yarn

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env.development
# Editar .env.development si es necesario cambiar la URL del API
```

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

El sitio estará disponible en `http://localhost:5173`

## Compilación para Producción

```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`

## Rutas Disponibles

### Públicas
- `/` - Inicio (selector de horarios)
- `/horario/:periodoId/:nivelId/:centroId` - Vista de horario detallada
- `/login` - Formulario de login

### Admin (requiere rol "admin")
- `/admin` - Dashboard
- `/admin/carreras` - Gestión de carreras
- `/admin/periodos` - Gestión de períodos
- `/admin/niveles` - Gestión de niveles
- `/admin/centros` - Gestión de centros
- `/admin/docentes` - Gestión de docentes
- `/admin/materias` - Gestión de materias
- `/admin/asignaciones` - Gestión de asignaciones
- `/admin/sesiones-online` - Gestión de sesiones online
- `/admin/presenciales` - Gestión de sesiones presenciales
- `/admin/calendario` - Gestión de eventos académicos
- `/admin/import` - Importación de datos Excel

### Docente (requiere rol "docente")
- `/mi-horario` - Mi horario con opciones de descarga

## Configuración de API

### Variables de Entorno

```env
VITE_API_URL=http://localhost:3001
```

## Credenciales de Demostración

```
Admin:
- Email: admin@ups.edu.ec
- Contraseña: admin123

Docente:
- Email: docente@ups.edu.ec
- Contraseña: docente123
```

## Colores de Horario

- **Lunes**: #4299e1 (Azul)
- **Martes**: #9f7aea (Púrpura)
- **Miércoles**: #ed8936 (Naranja)
- **Jueves**: #48bb78 (Verde)
- **Viernes**: #ed8936 (Naranja)
- **Semestral**: #718096 (Gris)
- **Por Confirmar**: #ecc94b (Amarillo)

## Stack Tecnológico

- **React 18** - UI Framework
- **Vite** - Build tool y dev server
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework CSS
- **React Router v6** - Routing
- **Axios** - Cliente HTTP
- **Lucide React** - Iconografía

## Desarrollo

### Iniciar servidor de desarrollo:
```bash
npm run dev
```

### Compilar para producción:
```bash
npm run build
```

### Previsualizar build:
```bash
npm run preview
```

## Estructura de Carpetas

```
src/
├── api/          - Cliente HTTP con interceptores
├── components/   - Componentes reutilizables
├── context/      - Contexto de autenticación
├── pages/        - Páginas de la aplicación
├── types/        - Interfaces TypeScript
├── App.tsx       - Rutas principales
├── main.tsx      - Punto de entrada
└── index.css     - Estilos globales
```

## Licencia

Propietario - Universidad Politécnica Salesiana
