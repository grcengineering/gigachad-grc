# GigaChad GRC - Development Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Local Development](#local-development)
5. [Frontend Development](#frontend-development)
6. [Backend Development](#backend-development)
7. [Database Management](#database-management)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Code Style](#code-style)
11. [Git Workflow](#git-workflow)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | Runtime for services and frontend |
| npm | 10.x | Package management |
| Docker | 24.x+ | Container runtime |
| Docker Compose | 2.x | Container orchestration |
| Git | 2.x | Version control |

### Optional but Recommended

| Software | Purpose |
|----------|---------|
| VS Code | IDE with recommended extensions |
| Postman/Insomnia | API testing |
| TablePlus/DBeaver | Database GUI |
| Redis Commander | Redis GUI |

### VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## Quick Start

### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc

# Copy environment file
cp deploy/env.example .env

# Install root dependencies
npm install
```

### 2. Start Infrastructure

```bash
# Start all services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Verify all services are running
./deploy/preflight-check.sh
```

### 3. Initialize Database

```bash
# Run Prisma migrations for each service
cd services/controls && npx prisma migrate dev && cd ../..
cd services/frameworks && npx prisma migrate dev && cd ../..
cd services/policies && npx prisma migrate dev && cd ../..
cd services/tprm && npx prisma migrate dev && cd ../..
cd services/trust && npx prisma migrate dev && cd ../..
cd services/audit && npx prisma migrate dev && cd ../..

# Seed database (optional)
npm run seed
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access Application

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Traefik Dashboard | http://localhost:8090 | - |
| Keycloak Admin | http://localhost:8080 | admin / admin |
| RustFS Console | http://localhost:9001 | rustfsadmin / rustfsadmin |
| PostgreSQL | localhost:5433 | grc / grc_secret |
| Redis | localhost:6380 | redis_secret |

---

## Project Structure

```
gigachad-grc/
├── auth/                      # Keycloak configuration
│   └── realm-export.json      # Realm export file
│
├── database/                  # Database initialization
│   └── init/                  # SQL init scripts
│       ├── 01-init.sql
│       ├── 02-soft-delete-migration.sql
│       ├── 03-database-enums.sql
│       └── 04-junction-tables.sql
│
├── deploy/                    # Deployment files
│   ├── env.example           # Environment template
│   ├── preflight-check.sh    # Pre-deployment checks
│   ├── db-migrate.sh         # Database migration script
│   ├── backup.sh             # Backup script
│   ├── restore.sh            # Restore script
│   └── monitoring/           # Monitoring configuration
│       ├── prometheus.yml
│       ├── alerts.yml
│       └── docker-compose.monitoring.yml
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── CONFIGURATION.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   └── App.tsx          # Main app
│   ├── public/              # Static assets
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── gateway/                   # API Gateway
│   └── traefik.yml           # Traefik configuration
│
├── scripts/                   # Utility scripts
│   ├── seed-database.ts      # Database seeding
│   └── import-*.ts           # Data import scripts
│
├── services/                  # Backend microservices
│   ├── shared/               # Shared libraries
│   │   └── src/
│   │       ├── auth/         # Auth utilities
│   │       ├── cache/        # Caching
│   │       ├── filters/      # Exception filters
│   │       ├── health/       # Health checks
│   │       ├── middleware/   # Middleware
│   │       └── prisma/       # Prisma module
│   │
│   ├── controls/             # Controls service
│   │   ├── src/
│   │   │   ├── controls/    # Controls module
│   │   │   ├── evidence/    # Evidence module
│   │   │   ├── assets/      # Assets module
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── frameworks/           # Frameworks service
│   ├── policies/             # Policies service
│   ├── tprm/                 # TPRM service
│   ├── trust/                # Trust service
│   └── audit/                # Audit service
│
├── terraform/                 # Infrastructure as Code
│   └── modules/              # Terraform modules
│
├── docker-compose.yml         # Development compose
├── docker-compose.dev.yml     # Dev overrides
├── docker-compose.prod.yml    # Production compose
├── package.json               # Root package.json
└── README.md
```

---

## Local Development

### Development Mode

```bash
# Start infrastructure only
docker-compose up -d postgres redis keycloak rustfs traefik

# Start services in watch mode (separate terminals)
cd services/controls && npm run start:dev
cd services/frameworks && npm run start:dev
# ... repeat for other services

# Start frontend
cd frontend && npm run dev
```

### Hot Reloading

- **Frontend**: Vite HMR (automatic)
- **Backend**: NestJS watch mode (`npm run start:dev`)
- **Database**: Prisma Studio (`npx prisma studio`)

### Environment Overrides

Create `.env.local` for local overrides:

```bash
# .env.local
LOG_LEVEL=debug
RATE_LIMIT_ENABLED=false
```

---

## Frontend Development

### Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS
- **State**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Routing**: React Router v6
- **UI Components**: Headless UI

### Commands

```bash
cd frontend

# Development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build

# Preview production build
npm run preview
```

### Adding a New Page

1. Create page component in `src/pages/`:

```tsx
// src/pages/NewFeature.tsx
import { useQuery } from '@tanstack/react-query';
import { featureApi } from '@/lib/api';

export default function NewFeature() {
  const { data, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: () => featureApi.list(),
  });

  if (isLoading) return <SkeletonGrid />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Feature</h1>
      {/* Content */}
    </div>
  );
}
```

2. Add route in `src/App.tsx`:

```tsx
<Route path="new-feature" element={<NewFeature />} />
```

3. Add navigation in `src/components/Layout.tsx`:

```tsx
{ name: 'New Feature', href: '/new-feature', icon: FeatureIcon }
```

### Component Guidelines

```tsx
// Use named exports for components
export function MyComponent() {}

// Use default export for pages
export default function MyPage() {}

// Use proper TypeScript types
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

// Use composition over inheritance
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

---

## Backend Development

### Stack

- **Framework**: NestJS 10
- **ORM**: Prisma
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

### Service Structure

```
services/controls/
├── src/
│   ├── main.ts              # Bootstrap
│   ├── app.module.ts        # Root module
│   │
│   ├── controls/            # Feature module
│   │   ├── controls.module.ts
│   │   ├── controls.controller.ts
│   │   ├── controls.service.ts
│   │   ├── dto/
│   │   │   ├── create-control.dto.ts
│   │   │   └── update-control.dto.ts
│   │   └── entities/
│   │       └── control.entity.ts
│   │
│   └── prisma/
│       └── prisma.module.ts
│
├── prisma/
│   └── schema.prisma        # Database schema
│
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Creating a New Module

```bash
cd services/controls

# Generate module, controller, service
nest g module features/new-feature
nest g controller features/new-feature
nest g service features/new-feature
```

### DTO Validation

```typescript
// src/new-feature/dto/create-new-feature.dto.ts
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewFeatureDto {
  @ApiProperty({ description: 'Feature title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Feature description', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;
}
```

### Service Pattern

```typescript
// src/new-feature/new-feature.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewFeatureService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { skip?: number; take?: number }) {
    return this.prisma.newFeature.findMany({
      skip: params.skip,
      take: params.take,
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const feature = await this.prisma.newFeature.findFirst({
      where: { id, deletedAt: null },
    });
    
    if (!feature) {
      throw new NotFoundException(`Feature ${id} not found`);
    }
    
    return feature;
  }

  async create(data: CreateNewFeatureDto, userId: string) {
    return this.prisma.newFeature.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });
  }
}
```

---

## Database Management

### Prisma Commands

```bash
cd services/controls

# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations (production)
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Schema Changes

1. Modify `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description`
3. Generate client: `npx prisma generate`
4. Restart service

### Common Patterns

```prisma
// Soft delete
model Control {
  id        String    @id @default(uuid())
  deletedAt DateTime?
  deletedBy String?
  
  @@index([deletedAt])
}

// Audit fields
model Policy {
  createdAt DateTime @default(now())
  createdBy String
  updatedAt DateTime @updatedAt
  updatedBy String?
}

// Relations
model Evidence {
  control   Control @relation(fields: [controlId], references: [id])
  controlId String
}
```

---

## Testing

### Frontend Testing

```bash
cd frontend

# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Backend Testing

```bash
cd services/controls

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Test Patterns

```typescript
// Unit test
describe('ControlsService', () => {
  let service: ControlsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ControlsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ControlsService>(ControlsService);
  });

  it('should create a control', async () => {
    const result = await service.create(mockData, 'user-id');
    expect(result.title).toBe(mockData.title);
  });
});
```

---

## Debugging

### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Controls Service",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    },
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

### Enable Debug Mode

```bash
# Start service with debugging
cd services/controls
npm run start:debug
```

### Logging

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async process() {
    this.logger.debug('Processing started');
    this.logger.log('Processing complete');
    this.logger.warn('Unexpected condition');
    this.logger.error('Operation failed', error.stack);
  }
}
```

### Database Queries

```bash
# Log all SQL queries
DATABASE_URL="postgresql://...?debug=true"

# Or in Prisma
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

---

## Code Style

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off',
  },
};
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ControlCard.tsx` |
| Hooks | camelCase with use | `useControls.ts` |
| Utils | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `ControlData` |
| Database tables | snake_case | `audit_logs` |

---

## Git Workflow

### Branch Strategy

```
main          # Production-ready code
├── develop   # Integration branch
│   ├── feature/add-export     # Feature branches
│   ├── feature/risk-scoring
│   └── fix/evidence-upload
└── release/v1.2.0             # Release branches
```

### Commit Messages

Follow Conventional Commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(controls): add bulk import functionality
fix(evidence): resolve file upload timeout
docs(api): update authentication docs
refactor(risks): extract calculation service
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Push branch and create PR
4. Request review
5. Address feedback
6. Squash and merge

### Pre-commit Hooks

```bash
# Install husky
npm install husky lint-staged --save-dev

# Setup hooks
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## Troubleshooting

### Common Issues

**Port already in use**:
```bash
lsof -i :3000
kill -9 <PID>
```

**Docker issues**:
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

**Prisma issues**:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

**Node modules issues**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

- Check existing issues in GitHub
- Review documentation
- Ask in team Slack channel
- Create detailed bug report with:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Environment details
  - Error logs





