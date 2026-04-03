# Testing Guide - Horario UPS Backend

## Quick Test

After starting the server, test all major endpoints:

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok"
}
```

### 2. Get Degree Programs

```bash
curl http://localhost:3001/api/carreras
```

### 3. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ups.edu.ec",
    "password": "password123"
  }'
```

Save the token for protected requests.

### 4. Get Current User

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ups.edu.ec",
    "password": "password123"
  }' | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/me
```

### 5. List Periods

```bash
curl http://localhost:3001/api/periodos?carreraId=1
```

### 6. Get Schedule

```bash
curl http://localhost:3001/api/horario/1/1/1
```

## Comprehensive API Testing

### Test Cases for Public Routes

#### GET /api/carreras

Test all active degree programs are returned:

```bash
curl http://localhost:3001/api/carreras | jq '.[0]'
```

Expected fields:
- `id` (integer)
- `nombre` (string)
- `codigo` (string, unique)
- `activa` (boolean)
- `createdAt` (ISO date)
- `updatedAt` (ISO date)

#### GET /api/periodos

Test with and without carreraId:

```bash
# Should fail - missing carreraId
curl http://localhost:3001/api/periodos

# Should succeed
curl http://localhost:3001/api/periodos?carreraId=1
```

#### GET /api/centros

```bash
curl http://localhost:3001/api/centros | jq 'length'
```

Should return array with at least one center.

#### GET /api/horario/:periodoId/:nivelId/:centroId

```bash
curl http://localhost:3001/api/horario/1/1/1 | jq '.[0].nombre'
```

Should return materials with teachers and assignments.

### Test Cases for Auth Routes

#### POST /api/auth/login

Test valid credentials:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ups.edu.ec",
    "password": "password123"
  }' | jq '.token'
```

Test invalid credentials:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ups.edu.ec",
    "password": "wrongpassword"
  }'
```

Expected: 401 Unauthorized

#### GET /api/auth/me

Test without token:

```bash
curl http://localhost:3001/api/auth/me
```

Expected: 401 Unauthorized

Test with valid token:

```bash
TOKEN="<your-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/me | jq '.rol'
```

Expected: "superadmin"

Test with invalid token:

```bash
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:3001/api/auth/me
```

Expected: 401 Unauthorized

### Test Cases for Admin Routes

All admin routes require `Authorization` header with valid token.

#### Create Carrera

```bash
TOKEN="<your-token>"
curl -X POST http://localhost:3001/api/admin/carreras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Ingeniería Mecánica",
    "codigo": "INGMEC",
    "activa": true
  }' | jq '.id'
```

Expected: Returns created carrera with ID

#### Get Carreras with Pagination

```bash
TOKEN="<your-token>"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/admin/carreras?page=1&limit=10" | jq '.pagination'
```

Expected pagination object:
```json
{
  "total": 5,
  "page": 1,
  "limit": 10
}
```

#### Update Carrera

```bash
TOKEN="<your-token>"
curl -X PUT http://localhost:3001/api/admin/carreras/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Ingeniería en Sistemas Actualizada",
    "codigo": "INGSOFT",
    "activa": true
  }' | jq '.nombre'
```

#### Delete Carrera

```bash
TOKEN="<your-token>"
curl -X DELETE http://localhost:3001/api/admin/carreras/1 \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 with message

#### Test Permission Denial

Create a docente user, then test admin endpoint:

```bash
TOKEN="<docente-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/carreras
```

Expected: 403 Forbidden

### Test Cases for Teacher Routes

#### Get My Schedule

Create/login as a docente, then:

```bash
TOKEN="<docente-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/docente/mi-horario/1
```

#### Get My Sessions

```bash
TOKEN="<docente-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/docente/mis-sesiones/1
```

#### Export Calendar as iCal

```bash
TOKEN="<docente-token>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/docente/calendario/1/ical \
  -o calendar.ics
```

Verify file is valid iCalendar:

```bash
grep -q "BEGIN:VCALENDAR" calendar.ics && echo "Valid iCal"
```

## Database Testing

### Test Database Connection

```bash
npm run db:studio
```

Opens Prisma Studio in browser showing all data.

### Test Seed Data

```bash
npm run db:seed
```

Check if data loads without errors.

## Load Testing

### Using Apache Bench

Install (if not present):

```bash
# macOS
brew install httpd

# Ubuntu
sudo apt-get install apache2-utils
```

Run load test:

```bash
ab -n 1000 -c 10 http://localhost:3001/health
```

Expected output shows:
- Requests per second
- Median response time
- 95th percentile response time

### Using wrk

```bash
wrk -t4 -c100 -d30s http://localhost:3001/api/carreras
```

Parameters:
- `-t4`: 4 threads
- `-c100`: 100 connections
- `-d30s`: 30 second duration

## Error Handling Tests

### Test 404 Not Found

```bash
curl http://localhost:3001/api/nonexistent
```

Expected: 404 with error message

### Test 500 Error

Intentionally cause server error (requires code modification for testing)

### Test Validation Errors

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Expected: 400 Bad Request (missing password)

## Data Consistency Tests

### Test Cascade Delete

Create and delete scenario:

```bash
TOKEN="<admin-token>"

# Create carrera
CARRERA=$(curl -s -X POST http://localhost:3001/api/admin/carreras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test Carrera",
    "codigo": "TEST123",
    "activa": true
  }' | jq '.id')

# Create periodo
PERIODO=$(curl -s -X POST http://localhost:3001/api/admin/periodos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"carreraId\": $CARRERA,
    \"numero\": 1,
    \"label\": \"Test Period\",
    \"fechaInicio\": \"2026-03-01\",
    \"fechaFin\": \"2026-08-31\",
    \"activo\": true
  }" | jq '.id')

# Delete carrera (should cascade delete periodo)
curl -X DELETE http://localhost:3001/api/admin/carreras/$CARRERA \
  -H "Authorization: Bearer $TOKEN"

# Verify periodo is deleted
curl http://localhost:3001/api/periodos?carreraId=$CARRERA \
  -H "Authorization: Bearer $TOKEN" | jq 'length'
```

Expected: 0 periodos remaining

## Excel Import Testing

### Create Test Excel File

Using `xlsx` npm package:

```javascript
const XLSX = require('xlsx');

const wb = XLSX.utils.book_new();

// Add Carreras sheet
const carrerasData = [
  { nombre: "Ingeniería en Sistemas", codigo: "INGSOFT", activa: true }
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(carrerasData), "Carreras");

// Add other required sheets...

XLSX.writeFile(wb, "test_data.xlsx");
```

### Test Import

```bash
TOKEN="<admin-token>"
curl -X POST http://localhost:3001/api/admin/import-excel \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_data.xlsx" | jq '.carreras'
```

## Automated Testing (Future)

Create test suite:

```bash
npm install --save-dev jest @types/jest ts-jest
```

Example test:

```typescript
// src/__tests__/health.test.ts
describe("Health Check", () => {
  it("should return ok status", async () => {
    const response = await fetch("http://localhost:3001/health");
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
});
```

Run tests:

```bash
npm test
```

## Performance Testing Checklist

- [ ] Response time < 100ms for GET requests
- [ ] Response time < 200ms for POST/PUT requests
- [ ] Can handle 100 concurrent connections
- [ ] Database queries complete in < 50ms
- [ ] No memory leaks after 1000 requests
- [ ] Connection pool not exhausted

## Security Testing Checklist

- [ ] SQL injection prevention (Prisma safe)
- [ ] XSS prevention (no HTML in responses)
- [ ] CSRF token validation (if applicable)
- [ ] Rate limiting (none currently - add for production)
- [ ] HTTPS only (enforce in production)
- [ ] JWT secret is strong (32+ characters)
- [ ] Passwords are hashed with bcrypt
- [ ] Sensitive data not logged

## Manual Testing Script

Save as `test.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth=$4

  if [ -z "$auth" ]; then
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $auth" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

echo "Testing Health Check..."
test_endpoint "GET" "/health"

echo -e "\nTesting Public Endpoints..."
test_endpoint "GET" "/api/carreras"

echo -e "\nTesting Auth..."
test_endpoint "POST" "/api/auth/login" '{"email":"admin@ups.edu.ec","password":"password123"}'

echo -e "\n${GREEN}Tests completed${NC}"
```

Run tests:

```bash
chmod +x test.sh
./test.sh
```

## Documentation Coverage

All endpoints should have:
- [x] Clear documentation
- [x] Request/response examples
- [x] Error cases documented
- [x] Parameter descriptions
- [x] Authorization requirements

See [API.md](./API.md) for comprehensive documentation.
