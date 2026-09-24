# GigaChad GRC Troubleshooting Guide

This guide covers common issues you may encounter and how to resolve them.

## Table of Contents

1. [Initial Setup Issues](#initial-setup-issues)
2. [Authentication Problems](#authentication-problems)
3. [Database Issues](#database-issues)
4. [Frontend Issues](#frontend-issues)
5. [API/Backend Issues](#apibackend-issues)
6. [Performance Problems](#performance-problems)
7. [Docker Issues](#docker-issues)

---

## Initial Setup Issues

### "Cannot find module" errors when starting services

**Symptom:** Services fail to start with module not found errors.

**Solution:**

```bash
# Install dependencies for each service
cd services/controls && npm install
cd ../frameworks && npm install
cd ../policies && npm install
cd ../tprm && npm install
cd ../trust && npm install
cd ../audit && npm install
cd ../shared && npm install

# Or from project root
npm run install:all
```

### Database schema synchronization fails

**Symptom:** The controls container fails while running Prisma schema synchronization.

**Solution:**

1. Ensure PostgreSQL is running:
```bash
docker compose up postgres -d
docker logs grc-postgres
```

2. For disposable local data, reset and let the controls entrypoint rebuild the shared schema:
```bash
docker compose down -v
./start.sh
```

3. For host development, generate clients and intentionally sync the shared schema:
```bash
npm run db:generate
npm --workspace @gigachad-grc/controls run prisma:push
```

Do not run a separate migration from every service. The current Docker flow is
owned by the controls entrypoint and uses
`services/shared/prisma/schema.prisma`.

### Services can't connect to database

**Symptom:** "Connection refused" or "ECONNREFUSED" errors.

**Solution:**

1. Check database is running:
```bash
docker compose ps postgres
```

2. Verify DATABASE_URL format:
```bash
# Should be: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
echo $DATABASE_URL
```

3. Test connection:
```bash
docker exec -it grc-postgres psql -U grc_user -d gigachad_grc -c "SELECT 1"
```

4. If using Docker, ensure services are on the same network:
```bash
docker network ls
docker network inspect gigachad-grc_default
```

---

## Authentication Problems

### "Invalid redirect URI" from Keycloak

**Symptom:** Authentication fails with redirect URI error.

**Solution:**

1. In Keycloak Admin Console:
   - Go to Clients → grc-frontend
   - Check "Valid Redirect URIs" includes your app URL
   - Local Docker flow: `https://localhost/*`
   - Host Vite development only: the exact Vite origin
   - For production: `https://grc.yourcompany.com/*`

2. Check "Web Origins":
   - Should match your frontend URL
   - Local Docker flow: `https://localhost`

### "Token validation failed"

**Symptom:** API requests fail with 401 after successful login.

**Solution:**

1. Check token is being stored:
```javascript
// In browser console
console.log(sessionStorage.getItem('grc_token'));
```

2. Verify token is being sent:
```javascript
// Check network tab in browser DevTools
// Look for Authorization header in requests
```

3. Ensure backend and frontend use same Keycloak realm:
```bash
# Frontend
echo $VITE_KEYCLOAK_REALM

# Backend
echo $KEYCLOAK_REALM
```

### Dev login not working

**Symptom:** Development authentication bypass doesn't work.

**Solution:**

1. Ensure dev mode is enabled:
```bash
# In frontend/.env.local
VITE_ENABLE_DEV_AUTH=true
```

2. Clear existing auth state:
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

3. Check the login page shows "Dev Login" button

---

## Database Issues

### "Relation does not exist"

**Symptom:** Queries fail with "relation X does not exist".

**Solution:**

1. Check the controls entrypoint, which owns shared-schema synchronization:
```bash
docker compose logs controls
```

2. For disposable local data, rebuild from a clean volume:
```bash
docker compose down -v
./start.sh
```

3. For host development, intentionally sync the single shared schema:
```bash
npm run db:generate
npm --workspace @gigachad-grc/controls run prisma:push
```

Do not apply every numbered `database/init` file in sequence.

### Slow queries

**Symptom:** Pages load slowly, especially with large data sets.

**Solution:**

1. Capture and review the query plan before adding indexes. Historical SQL
   files under `database/init/` are not automatically part of the current
   application migration flow and must not be applied ad hoc.

2. Analyze query performance:
```sql
-- Enable query logging (for debugging)
SET log_statement = 'all';

-- Check slow queries
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

3. Run VACUUM ANALYZE:
```sql
VACUUM ANALYZE;
```

### Connection pool exhausted

**Symptom:** "too many connections" errors.

**Solution:**

1. Increase PostgreSQL connections:
```sql
-- Check current limit
SHOW max_connections;

-- In postgresql.conf
max_connections = 200
```

2. Configure Prisma connection pool:
```prisma
datasource db {
  url = env("DATABASE_URL")
  // Add connection pool settings
}
```

3. In DATABASE_URL:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

---

## Frontend Issues

### Blank white page after build

**Symptom:** Production build shows blank page.

**Solution:**

1. Check for JavaScript errors in console
2. Verify asset paths are correct:
```bash
# Build output should reference correct paths
cat frontend/dist/index.html | grep src
```

3. Check base path configuration in vite.config.ts:
```typescript
export default defineConfig({
  base: '/', // or '/subpath/' if hosted at subpath
})
```

### "Failed to fetch" errors

**Symptom:** Network requests fail in browser.

**Solution:**

1. Check CORS configuration on backend
2. Verify API URL is correct:
```bash
# Should be set correctly
echo $VITE_API_URL
```

3. Check Vite proxy configuration (development):
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

### Charts/graphs not rendering

**Symptom:** Dashboard charts show nothing or errors.

**Solution:**

1. Check data is being returned:
```javascript
// In component, add logging
const { data, error } = useQuery(['dashboard'], fetchDashboard);
console.log('Dashboard data:', data, 'Error:', error);
```

2. Verify chart data format matches expected shape
3. Check for Recharts errors in console

### Memory issues / page becomes unresponsive

**Symptom:** Browser tab becomes slow or crashes.

**Solution:**

1. Use pagination for large lists
2. Enable virtual scrolling:
```tsx
import { VirtualTable } from '@/components/VirtualTable';
// Use VirtualTable for large data sets
```

3. Check for memory leaks in React DevTools

---

## API/Backend Issues

### Service won't start

**Symptom:** `npm run start` fails for a service.

**Solution:**

1. Check all dependencies installed:
```bash
npm install
```

2. Verify TypeScript compiles:
```bash
npm run build
```

3. Check for port conflicts:
```bash
lsof -i :3001  # Check if port is in use
```

4. View detailed error:
```bash
npm run start:dev 2>&1 | head -50
```

### Rate limiting / 429 errors

**Symptom:** Too many requests error.

**Solution:**

1. Rate limit is 100 requests/minute by default
2. For batch operations, add delays:
```typescript
for (const item of items) {
  await api.post('/controls', item);
  await new Promise(r => setTimeout(r, 100)); // 100ms delay
}
```

3. Increase limit for production (in .env):
```bash
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW_MS=60000
```

### File upload fails

**Symptom:** Evidence uploads fail.

**Solution:**

1. Check file size limits:
```typescript
// In service
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}))
```

2. Verify storage is configured:
```bash
echo $STORAGE_PROVIDER  # local or s3 (RustFS is S3-compatible)
```

3. Check storage permissions:
```bash
# For local storage
ls -la uploads/
```

---

## Performance Problems

### Slow initial page load

**Symptom:** First page load takes several seconds.

**Solution:**

1. Enable code splitting (already configured in vite.config.ts)
2. Check bundle size:
```bash
cd frontend && npm run build
# Review output sizes
```

3. Preload critical resources in index.html:
```html
<link rel="preload" href="/fonts/..." as="font" crossorigin>
```

### API responses are slow

**Symptom:** Backend requests take > 1 second.

**Solution:**

1. Enable caching (already configured with @Cacheable):
```typescript
@Cacheable({ ttl: 60 })
async findAll() { ... }
```

2. Add database indexes (see Database Issues)

3. Check N+1 query problems:
```typescript
// Bad - multiple queries
const controls = await prisma.control.findMany();
for (const c of controls) {
  c.evidence = await prisma.evidence.findMany({ where: { controlId: c.id }});
}

// Good - single query with include
const controls = await prisma.control.findMany({
  include: { evidence: true }
});
```

### Dashboard loads slowly

**Symptom:** Dashboard takes > 3 seconds to load.

**Solution:**

1. Use lightweight endpoints:
```typescript
// Instead of full data, use summary endpoint
const { data } = useQuery(['dashboard-summary'], () => 
  api.get('/api/dashboard/summary')
);
```

2. Load data progressively:
```typescript
// Load critical data first, charts in background
const summary = useQuery(['summary'], fetchSummary, { staleTime: 60000 });
const charts = useQuery(['charts'], fetchCharts, { 
  enabled: !!summary.data, // Wait for summary
  staleTime: 300000 
});
```

---

## Docker Issues

### Container keeps restarting

**Symptom:** Service container in restart loop.

**Solution:**

1. Check logs:
```bash
docker logs grc-controls --tail 100
```

2. Check health:
```bash
docker inspect grc-controls | jq '.[0].State'
```

3. Ensure dependencies are healthy:
```bash
docker compose ps
# postgres and redis should be 'healthy'
```

### Out of disk space

**Symptom:** Docker operations fail with no space.

**Solution:**

```bash
# Clean up unused resources
docker system prune -a --volumes

# Check disk usage
docker system df

# Remove specific old images
docker image prune -a --filter "until=24h"
```

### Network connectivity between containers

**Symptom:** Services can't reach each other.

**Solution:**

1. Verify all on same network:
```bash
docker network inspect gigachad-grc_default
```

2. Use service names not localhost:
```bash
# Wrong
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Correct (in Docker)
DATABASE_URL=postgresql://user:pass@postgres:5432/db
```

3. Test connectivity:
```bash
docker exec grc-controls ping postgres
docker exec grc-controls nc -zv postgres 5432
```

---

## Getting Help

If you're still stuck:

1. **Check logs carefully** - most issues have clear error messages
2. **Search existing issues** on GitHub
3. **Include details** when reporting:
   - Error messages (full stack trace)
   - Steps to reproduce
   - Environment (OS, Node version, Docker version)
   - Relevant configuration (sanitized)

---

*Last updated: December 2024*

