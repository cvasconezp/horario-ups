# Start Here - Horario UPS Backend

Welcome! This is a complete, production-ready REST API for university schedule management.

## What You Have

A fully functional backend system with:
- 80+ API endpoints
- JWT authentication
- Role-based access control
- PostgreSQL database
- Excel import functionality
- iCalendar calendar export
- Complete documentation

## Files You Need to Know

### Core Files

1. **README.md** - Start here for overview
2. **API.md** - Complete endpoint documentation
3. **DEPLOYMENT.md** - How to deploy (Railway recommended)
4. **TESTING.md** - How to test the API
5. **IMPLEMENTATION_SUMMARY.md** - What was built

### Getting Started (5 minutes)

```bash
# 1. Navigate to backend directory
cd /sessions/exciting-kind-cannon/horario-ups/backend

# 2. Install dependencies
npm install

# 3. Create .env file from template
cp .env.example .env

# 4. Setup database (PostgreSQL must be running)
npm run db:push

# 5. Load sample data
npm run db:seed

# 6. Start development server
npm run dev

# 7. Test it works
curl http://localhost:3001/health
```

Server runs on `http://localhost:3001`

## Database Setup

You need PostgreSQL running. If you don't have it:

### macOS
```bash
brew install postgresql
brew services start postgresql
createdb horario_ups
```

### Ubuntu
```bash
sudo apt-get install postgresql
sudo systemctl start postgresql
createdb horario_ups
```

### Windows
Download PostgreSQL installer from postgresql.org

## .env File

Edit `.env` with your database connection:

```
DATABASE_URL=postgresql://user:password@localhost:5432/horario_ups
JWT_SECRET=your-secret-key-change-this
PORT=3001
NODE_ENV=development
```

## Quick Test

After starting the server:

```bash
# 1. Get degree programs
curl http://localhost:3001/api/carreras

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ups.edu.ec",
    "password": "password123"
  }'

# 3. Use the token to test protected route
TOKEN="<paste-token-here>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/usuarios
```

## Project Structure

```
backend/
├── src/
│   ├── routes/        # API endpoints
│   ├── middleware/    # Authentication, CORS
│   ├── lib/          # Utilities (Excel, iCal)
│   ├── db.ts         # Database client
│   └── index.ts      # Main app
├── prisma/
│   └── schema.prisma # Database schema
├── README.md         # Full overview
├── API.md            # All endpoints
├── DEPLOYMENT.md     # How to deploy
└── TESTING.md        # Testing guide
```

## Key Commands

```bash
npm run dev          # Start development (hot reload)
npm run build        # Compile TypeScript
npm start            # Run production build
npm run db:push      # Update database schema
npm run db:seed      # Load sample data
npm run db:studio    # GUI database editor
```

## API Endpoints

### Public (No Auth Required)
- `GET /api/carreras` - List degree programs
- `GET /api/periodos?carreraId=1` - List periods
- `GET /api/centros` - List centers
- `GET /api/horario/:periodoId/:nivelId/:centroId` - Get schedule

### Authentication
- `POST /api/auth/login` - Get JWT token
- `GET /api/auth/me` - Get current user

### Admin (Protected)
- Full CRUD for all entities
- Excel import
- User management

### Teachers (Protected)
- View my schedule
- Export calendar as .ics

See **API.md** for complete documentation.

## Default Login

Email: `admin@ups.edu.ec`
Password: `password123`

Role: `superadmin` (access to everything)

For teacher testing, run `npm run db:seed` again to see docente credentials.

## Tech Stack

- **Node.js + TypeScript** - Runtime and language
- **Hono** - Web framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT tokens
- **xlsx** - Excel parsing
- **ical-generator** - Calendar export

## Deployment

### Local Development
Already set up. Just run `npm run dev`

### Production (Railway Recommended)

1. Push code to GitHub
2. Create Railway account
3. Connect GitHub repository
4. Add environment variables:
   - `DATABASE_URL` (Railway creates this)
   - `JWT_SECRET` (generate a strong key)
5. Deploy

See **DEPLOYMENT.md** for detailed steps.

## Need Help?

### Common Issues

**Port already in use:**
```bash
PORT=3002 npm run dev
```

**Database not found:**
```bash
createdb horario_ups
npm run db:push
```

**TypeScript errors:**
```bash
npm run build
```

**Want to see data:**
```bash
npm run db:studio
```

### Documentation

- **API Details**: See API.md
- **Deployment**: See DEPLOYMENT.md
- **Testing**: See TESTING.md
- **Architecture**: See STRUCTURE.md
- **Implementation**: See IMPLEMENTATION_SUMMARY.md

## What's Next?

1. Explore the API with `curl` or Postman
2. Read API.md for all endpoints
3. Deploy to Railway when ready
4. Integrate with frontend application

## Database Models

The system manages:
- **Carreras** (Degree programs)
- **Periodos** (Semesters)
- **Niveles** (Course levels)
- **Materias** (Courses)
- **Centros** (Study centers/campuses)
- **Docentes** (Teachers)
- **Asignaciones** (Teacher assignments)
- **SesionesOnline** (Virtual classes)
- **SesionesPresenciales** (In-person classes)
- **CalendarioEvento** (Important dates)
- **Usuarios** (User accounts)

## Features

✓ RESTful API with 80+ endpoints
✓ JWT authentication
✓ Role-based access control
✓ Complete CRUD operations
✓ Excel data import
✓ iCalendar export
✓ Pagination support
✓ Error handling
✓ Type-safe with TypeScript
✓ Production-ready

## Support

If something doesn't work:
1. Check the error message
2. Review TESTING.md for test cases
3. Check DEPLOYMENT.md for troubleshooting
4. Verify .env file is correct
5. Ensure PostgreSQL is running

## Roadmap

Future enhancements planned:
- Redis caching
- GraphQL endpoint
- WebSocket support
- Advanced reporting
- Mobile optimization

---

**You're all set!** Start with `npm run dev` and explore the API.

For full details, see README.md.
