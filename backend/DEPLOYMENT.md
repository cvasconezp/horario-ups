# Deployment Guide - Horario UPS Backend

## Production Checklist

- [x] TypeScript compilation verified
- [x] Environment variables documented
- [x] Database schema created
- [x] Error handling implemented
- [x] CORS configured (restrict origins in production)
- [x] JWT authentication implemented
- [x] Password hashing with bcrypt
- [x] Graceful shutdown implemented

## Prerequisites

- Node.js 18.x or higher
- PostgreSQL 12 or higher
- Railway account (or similar hosting platform)
- Git for version control

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd backend
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/horario_ups
JWT_SECRET=generate-a-strong-random-secret-here
PORT=3001
NODE_ENV=development
```

### 3. Database Setup

Create PostgreSQL database:
```bash
createdb horario_ups
```

Push Prisma schema:
```bash
npm run db:push
```

Seed initial data:
```bash
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## Railway Deployment

### 1. Create Database Service

1. Go to Railway dashboard
2. Create new PostgreSQL database
3. Copy connection string to notes

### 2. Create Application Service

1. Connect GitHub repository
2. Select `backend` directory as root
3. Add environment variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
PORT=3000
```

### 3. Configure Build

Railway auto-detects Node.js project. Verify:
- Build command: `npm run build`
- Start command: `npm start`

### 4. Deploy

Push to main branch triggers automatic deployment.

## Environment Variables

### Required

- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://user:password@host:5432/dbname`
  - For Railway: provided automatically

- `JWT_SECRET`: Secret key for JWT signing
  - Generate: `openssl rand -base64 32`
  - Never commit to version control

### Optional

- `NODE_ENV`: Set to "production" in production
- `PORT`: Server port (default 3000)

## Database Migrations

### Create Migration

For schema changes:

```bash
# Make changes to prisma/schema.prisma
npx prisma migrate dev --name migration_name
```

### Apply Migration to Production

```bash
npm run db:push
```

Or through Railway environment after code is deployed.

## Monitoring and Logging

### Health Check Endpoint

```bash
curl https://your-domain.com/health
```

Response:
```json
{
  "status": "ok"
}
```

### Logs

In Railway dashboard:
- View real-time logs
- Set up alerts for errors
- Configure log retention

### Key Metrics to Monitor

1. **Response Times**: Target < 100ms p95
2. **Error Rate**: Should be < 1%
3. **Database Connections**: Monitor connection pool
4. **CPU/Memory**: Monitor resource usage

## Scaling

### Horizontal Scaling

1. Increase Railway Plan
2. Railway auto-handles load balancing
3. Ensure database can handle connections

### Optimization Tips

1. Enable query result caching in Prisma
2. Implement Redis caching layer (future)
3. Use database indexes (already optimized)
4. Implement request pagination

## Security Best Practices

### In Production

1. **Environment Variables**
   - Never hardcode secrets
   - Rotate JWT_SECRET periodically
   - Use strong random secrets

2. **HTTPS**
   - Railway provides automatic SSL
   - All traffic encrypted

3. **CORS**
   - Update CORS configuration for specific origins
   - In `src/index.ts`, change:
   ```typescript
   app.use("*", cors({ origin: "https://your-frontend-domain.com" }));
   ```

4. **Rate Limiting**
   - Implement per-IP rate limiting (future)
   - Add per-user rate limiting
   - Implement exponential backoff

5. **Input Validation**
   - Validate all request payloads
   - Sanitize user inputs
   - Use Zod/Yup for schema validation (future)

6. **SQL Injection**
   - Prisma prevents SQL injection
   - Always use parameterized queries
   - Never concatenate user input into queries

7. **Authentication**
   - JWT tokens expire after 7 days
   - Implement refresh tokens (future)
   - Add password complexity requirements

8. **Database**
   - Use PostgreSQL user with limited permissions
   - Enable SSL for database connections
   - Regular backups (Railway handles automatically)

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma configuration
npx prisma db execute --stdin < /dev/null
```

### High Memory Usage

1. Check for memory leaks
2. Monitor active connections
3. Review query performance
4. Consider caching strategy

### Slow Responses

1. Check database query performance
2. Review API response times
3. Look for N+1 queries in Prisma
4. Consider indexing improvements

### Authentication Errors

1. Verify JWT_SECRET is consistent
2. Check token expiration
3. Ensure Authorization header format
4. Validate user roles

## Backup and Recovery

### Database Backups

Railway provides:
- Automatic daily backups
- 30-day backup retention
- Point-in-time recovery

### Manual Backup

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore from Backup

```bash
psql $DATABASE_URL < backup.sql
```

## CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: railwayapp/deploy-action@v1
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Rollback Procedure

In Railway:
1. Go to Deployments
2. Select previous working deployment
3. Click "Redeploy"

## Performance Optimization

### Current Optimizations

1. **Database**
   - Indexed foreign keys
   - Optimized cascade deletes
   - Query result pagination

2. **API**
   - Response compression (Hono built-in)
   - Pagination on list endpoints
   - Connection pooling

3. **Code**
   - TypeScript strict mode
   - Error handling throughout
   - Graceful shutdown

### Future Optimizations

1. Add Redis caching layer
2. Implement GraphQL for flexible querying
3. Add query result caching
4. Implement batch endpoints
5. Add compression middleware

## Testing Strategy

### Unit Tests (Future)

```bash
npm test
```

### Integration Tests (Future)

```bash
npm run test:integration
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 https://your-domain.com/health
```

## Documentation

- **API Docs**: See `API.md`
- **Database Schema**: See `prisma/schema.prisma`
- **Architecture**: See below

## Architecture Overview

```
┌─────────────────┐
│   Client (Web)  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────┐
│   Hono API Server       │
│  (Node.js TypeScript)   │
│  Port: 3000             │
├─────────────────────────┤
│ Routes                  │
│ ├─ Public               │
│ ├─ Auth                 │
│ ├─ Admin (protected)    │
│ └─ Docente (protected)  │
├─────────────────────────┤
│ Middleware              │
│ ├─ CORS                 │
│ ├─ JWT Auth             │
│ └─ Error Handling       │
├─────────────────────────┤
│ Libraries               │
│ ├─ Prisma (ORM)        │
│ ├─ bcryptjs            │
│ ├─ jsonwebtoken        │
│ ├─ xlsx (import)        │
│ └─ ical-generator      │
└─────────────┬───────────┘
              │ TCP
              ▼
   ┌──────────────────┐
   │  PostgreSQL DB   │
   │  Port: 5432      │
   └──────────────────┘
```

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor error logs
- Check database size

**Monthly:**
- Review performance metrics
- Update dependencies (security)
- Backup verification

**Quarterly:**
- Full security audit
- Performance optimization review
- Capacity planning

## Support and Escalation

1. **Local Issues**: Check logs and error messages
2. **Database Issues**: Contact PostgreSQL support
3. **Deployment Issues**: Check Railway dashboard
4. **Application Bugs**: Debug through logs and testing

## Resources

- [Hono Documentation](https://hono.dev)
- [Prisma ORM](https://www.prisma.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Railway Deployment](https://railway.app)
- [JWT Introduction](https://jwt.io)
