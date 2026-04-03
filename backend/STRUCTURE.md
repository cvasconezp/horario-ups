# Project Structure Overview

## Directory Layout

```
backend/
├── src/                          # TypeScript source code
│   ├── index.ts                 # Application entry point & route mounting
│   ├── db.ts                    # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts              # JWT verification & role-based middleware
│   ├── routes/
│   │   ├── public.ts            # GET endpoints for schedule data (no auth)
│   │   ├── auth.ts              # Login & user endpoints
│   │   ├── admin.ts             # CRUD for all entities (admin only)
│   │   └── docente.ts           # Teacher-specific endpoints (docente role)
│   └── lib/
│       ├── ical.ts              # iCalendar (.ics) generation utilities
│       └── excel-import.ts       # Excel file parsing & data import
│
├── prisma/
│   └── schema.prisma            # Database schema with all models
│
├── dist/                        # Compiled JavaScript (created by build)
│
├── node_modules/                # Dependencies (not in repo)
│
├── Configuration Files
│   ├── package.json             # NPM dependencies & scripts
│   ├── package-lock.json        # Locked dependency versions
│   ├── tsconfig.json            # TypeScript compiler options
│   ├── .env.example             # Environment variable template
│   ├── .gitignore               # Git ignore rules
│
└── Documentation
    ├── README.md                # Project overview & quick start
    ├── API.md                   # Complete API endpoint documentation
    ├── DEPLOYMENT.md            # Deployment guide & production checklist
    ├── TESTING.md               # Testing guide & test cases
    └── STRUCTURE.md             # This file

└── Database & Scripts
    ├── seed.ts                  # Database seeding with sample data
```

## Key Files Explained

### Source Code Files

#### `/src/index.ts`
- Main application entry point
- Sets up Hono server instance
- Mounts all route handlers
- Configures middleware (CORS, error handling)
- Implements graceful shutdown

#### `/src/db.ts`
- Prisma client singleton
- Prevents multiple client instances
- Handles development vs production setup
- Provides single connection pool

#### `/src/middleware/auth.ts`
- JWT token verification middleware
- Role-based access control (RBAC)
- Token generation & validation
- Exports auth middleware and role checkers

#### `/src/routes/public.ts` (180 lines)
- 9 public GET endpoints
- No authentication required
- Returns schedule data for student/public use
- Endpoints for carreras, periodos, niveles, centros, horarios

#### `/src/routes/auth.ts` (90 lines)
- 2 authentication endpoints
- POST /login - returns JWT token
- GET /me - returns current user
- Uses bcrypt for password validation

#### `/src/routes/admin.ts` (1050 lines, largest file)
- Complete CRUD for 10+ entities
- 80+ endpoints total
- All require authentication + admin role
- Full entity management system
- Excel import endpoint
- Pagination with limit/offset

#### `/src/routes/docente.ts` (200 lines)
- 4 teacher-specific endpoints
- Protected with docente role
- Schedule access endpoints
- iCalendar export functionality

#### `/src/lib/ical.ts` (50 lines)
- Generates .ics calendar files
- Handles event creation
- Time calculations and formatting
- Returns standard iCalendar format

#### `/src/lib/excel-import.ts` (350 lines)
- Parses XLSX files using xlsx library
- 6 import functions for each entity type
- Handles data validation
- Returns detailed import results with error tracking

### Database Schema

#### `/prisma/schema.prisma` (170 lines)
Models defined:
- **Carrera** - Degree programs
- **Periodo** - Academic periods/semesters
- **Nivel** - Course levels
- **Materia** - Courses/subjects
- **Centro** - Study centers/campuses
- **Docente** - Teachers
- **Usuario** - User accounts
- **Asignacion** - Teacher→Course→Center assignments
- **SesionOnline** - Virtual class sessions
- **SesionPresencial** - In-person sessions
- **CalendarioEvento** - Important dates/events

Features:
- Cascade delete relationships
- Unique constraints
- Automatic timestamps (createdAt, updatedAt)
- Foreign key relationships
- Proper indexing

### Configuration

#### `package.json`
Scripts:
- `npm run dev` - Start dev server with hot reload (tsx watch)
- `npm run build` - Compile TypeScript
- `npm start` - Run production build
- `npm run db:push` - Apply schema to database
- `npm run db:seed` - Load sample data
- `npm run db:studio` - Open Prisma Studio GUI

Dependencies (13):
- hono@4.12.10 - Web framework
- @hono/node-server@1.19.12 - Node.js runtime
- @prisma/client@5.22.0 - ORM
- prisma@5.22.0 - Migrations/CLI
- bcryptjs@3.0.3 - Password hashing
- jsonwebtoken@9.0.3 - JWT handling
- xlsx@0.18.5 - Excel parsing
- ical-generator@10.1.0 - Calendar generation

Dev Dependencies (5):
- typescript@6.0.2 - TypeScript compiler
- tsx@4.21.0 - TS execution & watching
- @types/node - Node.js types
- @types/bcryptjs - bcrypt types
- @types/jsonwebtoken - JWT types

#### `tsconfig.json`
- Strict type checking enabled
- ES2020 target
- Module resolution with bundler strategy
- Strict null checks
- All strict mode options enabled

#### `.env.example`
Template for environment configuration:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=development
```

### Documentation Files

#### `README.md` (400 lines)
- Project overview
- Features list
- Quick start guide
- Project structure
- API endpoints summary
- Authentication guide
- Data model explanation
- Security overview
- Development guide
- Troubleshooting
- Performance info
- Roadmap

#### `API.md` (600 lines)
- Complete endpoint reference
- Request/response examples
- Authentication details
- Query parameters
- Error codes
- Pagination info
- Rate limiting notes
- Development setup
- Database management
- Deployment info

#### `DEPLOYMENT.md` (500 lines)
- Production checklist
- Local setup steps
- Railway deployment guide
- Environment variables
- Database migrations
- Monitoring setup
- Scaling instructions
- Security best practices
- Troubleshooting guide
- Backup procedures
- CI/CD pipeline setup

#### `TESTING.md` (400 lines)
- Quick test commands
- Comprehensive test cases
- Load testing instructions
- Database testing
- Error handling tests
- Data consistency tests
- Excel import testing
- Automated testing setup
- Performance checklist
- Security checklist
- Manual testing scripts

## Code Statistics

- **Total Lines**: ~3,500+
- **TypeScript Files**: 9
- **Route Files**: 4
- **Library Files**: 2
- **Configuration Files**: 5
- **Documentation Files**: 5
- **Database Schema**: 170 lines

## Architecture Patterns

### Layered Architecture
```
Routes Layer (public, auth, admin, docente)
    ↓
Middleware Layer (auth, cors, error handling)
    ↓
Business Logic (route handlers)
    ↓
Data Layer (Prisma ORM)
    ↓
Database (PostgreSQL)
```

### Request Flow
```
Client Request
    ↓
CORS Middleware
    ↓
Auth Middleware (if protected)
    ↓
Route Handler
    ↓
Database Query (Prisma)
    ↓
Response
```

### Module Organization
- **Separation of Concerns**: Routes, middleware, utilities separated
- **DRY Principle**: Shared utilities in lib/
- **Singleton Pattern**: Single Prisma client instance
- **Middleware Pattern**: Composable middleware stack
- **Dependency Injection**: Prisma client injected via singleton

## Scalability Considerations

### Current Features
- ✓ Pagination on list endpoints
- ✓ Connection pooling
- ✓ Cascade deletes for data integrity
- ✓ Indexed foreign keys
- ✓ Graceful shutdown handling

### Future Enhancements
- [ ] Redis caching layer
- [ ] GraphQL endpoint
- [ ] WebSocket support
- [ ] Rate limiting middleware
- [ ] Request logging/audit trails
- [ ] Batch processing endpoints
- [ ] Database query optimization
- [ ] API versioning

## Security Implementation

### Authentication
- JWT tokens (7-day expiry)
- bcrypt password hashing (10 rounds)
- Authorization header required

### Access Control
- Role-based (superadmin, coordinador, docente)
- Middleware enforcement
- Per-route protection

### Data Protection
- Cascade delete relationships
- Foreign key constraints
- Input validation
- Prisma prevents SQL injection

## Performance Optimization

### Database
- Indexed foreign keys
- Optimized relationships
- Connection pooling
- Pagination support

### API
- Response compression (Hono built-in)
- Efficient serialization
- Minimal data transfer
- Request validation

### Code
- TypeScript strict mode
- Error boundaries
- Resource cleanup
- Async/await patterns

## Deployment Architecture

### Development
- Local Node.js + PostgreSQL
- Hot reload with tsx
- Prisma Studio for debugging

### Production (Railway)
- Containerized Node.js
- Managed PostgreSQL
- Automatic HTTPS/SSL
- Auto-scaling ready

## Maintenance Points

### Regular Updates
- npm dependency updates
- TypeScript version updates
- Security patches
- Database backups

### Monitoring
- Error logs
- Performance metrics
- Database size
- Connection count

### Documentation
- API endpoint changes
- Database schema changes
- Deployment procedures
- Troubleshooting guides
