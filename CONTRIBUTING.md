# Contributing to GigaChad GRC

Thank you for your interest in contributing to GigaChad GRC! This document provides guidelines and instructions for contributing.

## Quick Start

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Run tests (`npm test`)
5. Submit a pull request

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [License Agreement](#license-agreement)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## License Agreement

By contributing to GigaChad GRC, you agree that your contributions will be licensed under the [Elastic License 2.0](LICENSE). This means:

- Your contributions can be used commercially by others (internally)
- Your contributions cannot be used to create a competing managed service
- You retain copyright of your contributions

## Getting Started

### Prerequisites

- **Node.js 20+** (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- **Docker and Docker Compose** (for running infrastructure services)
- **Git** (for version control)
- **VS Code** (recommended) or your preferred editor

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/gigachad-grc.git
cd gigachad-grc
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL_ORG/gigachad-grc.git
```

## Development Setup

### 1. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, Keycloak, and RustFS
docker-compose up -d postgres redis keycloak rustfs
```

Wait for services to be healthy:

```bash
docker-compose ps
```

### 2. Install Dependencies

```bash
# Install root dependencies (if any)
npm install

# Build the shared library first (required by all services)
cd services/shared
npm install
npm run build
cd ../..

# Install service dependencies
cd services/controls && npm install && cd ../..
cd services/frameworks && npm install && cd ../..
cd services/policies && npm install && cd ../..
cd services/tprm && npm install && cd ../..
cd services/trust && npm install && cd ../..
cd services/audit && npm install && cd ../..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Set Up Environment

```bash
# Copy environment template
cp env.example .env

# The defaults work for local development
```

### 4. Run Database Migrations

```bash
cd services/controls
npm run prisma:migrate
cd ../..
```

### 5. Seed Demo Data (Optional)

```bash
cd services/controls
npm run seed
cd ../..
```

### 6. Start Development Servers

You'll need multiple terminals:

```bash
# Terminal 1: Controls service (main backend)
cd services/controls
npm run start:dev

# Terminal 2: Frameworks service
cd services/frameworks
npm run start:dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:5173
- **Controls API**: http://localhost:3001/api/docs (Swagger)
- **Frameworks API**: http://localhost:3002/api/docs (Swagger)
- **Keycloak Admin**: http://localhost:8080 (admin/admin)
- **RustFS Console**: http://localhost:9001 (rustfsadmin/rustfsadminpassword)

### Development with Docker (Alternative)

If you prefer running everything in Docker:

```bash
# Build and start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Or use the development compose file
docker-compose -f docker-compose.dev.yml up --build
```

## Project Structure

```
gigachad-grc/
├── services/
│   ├── shared/           # Shared library (types, utils, Prisma schema)
│   ├── controls/         # Controls, Evidence, Dashboard, AI, Config-as-Code
│   ├── frameworks/       # Frameworks, Assessments, Mappings
│   ├── policies/         # Policy lifecycle management
│   ├── tprm/             # Third-party risk management
│   ├── trust/            # Questionnaires, Knowledge Base, Trust Center
│   └── audit/            # Audit management
├── frontend/             # React SPA with Vite
├── database/             # SQL migrations and seeds
├── deploy/               # Deployment scripts and configs
├── docs/                 # Documentation
├── mcp-servers/          # MCP server implementations
└── tests/                # Integration and load tests
```

### Key Directories

| Directory                              | Description                                |
| -------------------------------------- | ------------------------------------------ |
| `services/shared/prisma/schema.prisma` | Single source of truth for database schema |
| `services/controls/src/`               | Main backend service with most features    |
| `frontend/src/pages/`                  | React page components                      |
| `frontend/src/components/`             | Reusable UI components                     |
| `frontend/src/lib/api.ts`              | API client and type definitions            |

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-risk-heatmap` - New features
- `fix/control-pagination` - Bug fixes
- `docs/update-api-guide` - Documentation
- `refactor/extract-cache-service` - Code refactoring
- `test/add-risk-service-tests` - Adding tests

### Commit Messages

Follow conventional commit format:

```
type(scope): short description

Longer description if needed.

Fixes #123
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Updating build tasks, dependencies, etc.

**Examples:**

```
feat(risks): add risk heatmap visualization

fix(controls): correct pagination offset calculation

docs(api): update authentication examples

refactor(cache): extract LRU cache to shared service
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Use enums for fixed sets of values

```typescript
// Good
interface CreateControlDto {
  title: string;
  description?: string;
  status: ControlStatus;
}

// Avoid
function createControl(data: any) { ... }
```

### NestJS Backend

- Use dependency injection
- Create DTOs for request/response validation
- Use decorators for validation (`@IsString()`, `@IsOptional()`)
- Handle errors with NestJS exceptions
- Add Swagger decorators for API documentation

```typescript
@Post()
@ApiOperation({ summary: 'Create a new control' })
@ApiResponse({ status: 201, type: ControlDto })
async create(@Body() dto: CreateControlDto): Promise<ControlDto> {
  return this.controlsService.create(dto);
}
```

### React Frontend

- Use functional components with hooks
- Use TypeScript for props and state
- Use React Query for data fetching
- Use Tailwind CSS for styling
- Keep components focused and small

```typescript
interface ControlCardProps {
  control: Control;
  onEdit: (id: string) => void;
}

export function ControlCard({ control, onEdit }: ControlCardProps) {
  return (
    <div className="p-4 bg-surface-800 rounded-lg">
      <h3 className="font-medium text-white">{control.title}</h3>
      <button onClick={() => onEdit(control.id)}>Edit</button>
    </div>
  );
}
```

### Database

- Use Prisma for all database operations
- Add migrations for schema changes
- Use transactions for multi-step operations
- Add indexes for frequently queried fields

```typescript
// Good: Use Prisma's query builder
const controls = await this.prisma.control.findMany({
  where: { organizationId, deletedAt: null },
  include: { evidence: true },
});

// Avoid: Raw SQL unless absolutely necessary
```

## Testing

### Running Tests

All six backend services (`controls`, `frameworks`, `audit`,
`policies`, `tprm`, `trust`) have Jest wired with the same scripts.
The CI `backend` matrix runs `npm test --if-present` in every service.

```bash
# Unit tests for a service
cd services/<service>
npm run test            # one-shot
npm run test:watch      # watch mode
npm run test:ci         # CI flags (--ci --runInBand)
npm run test:cov        # with coverage

# Run every service from the repo root
for svc in controls frameworks audit policies tprm trust; do
  (cd services/$svc && npm test) || break
done

# E2E tests (Playwright, frontend only)
cd frontend && npm run test:e2e
```

Two Playwright suites are required CI gates:
[`tenant-isolation.spec.ts`](frontend/e2e/tenant-isolation.spec.ts)
and [`rbac.spec.ts`](frontend/e2e/rbac.spec.ts). If you touch a
controller, service method, or guard, add or update a case in both.
See [frontend/e2e/README.md](frontend/e2e/README.md) for the
multi-user fixture layout and `x-dev-user-id` header override.

### Writing Tests

```typescript
describe('ControlsService', () => {
  let service: ControlsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ControlsService, PrismaService],
    }).compile();

    service = module.get(ControlsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a control with valid data', async () => {
      const dto = { title: 'Test Control', status: 'draft' };
      const result = await service.create(dto, 'org-123', 'user-123');

      expect(result.title).toBe('Test Control');
      expect(result.id).toBeDefined();
    });
  });
});
```

## Submitting Changes

### Before Submitting

1. **Update your branch** with the latest upstream changes:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run linting**:

   ```bash
   npm run lint
   ```

3. **Run formatting**:

   ```bash
   npm run format
   ```

4. **Run tests**:

   ```bash
   npm run test
   ```

5. **Test your changes manually** in the browser

### Creating a Pull Request

1. Push your branch to your fork:

   ```bash
   git push origin feature/your-feature
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template completely

4. Wait for review and address feedback

### PR Review Process

- All PRs require at least one approval
- CI checks must pass (lint, tests, build)
- Maintainers may request changes
- Once approved, a maintainer will merge

## Reporting Issues

### Bug Reports

Use the bug report template and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Docker version)

### Feature Requests

Use the feature request template and include:

- Clear description of the feature
- Use case / problem it solves
- Proposed solution (if you have one)
- Alternatives considered

### Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security concerns to the maintainers directly or use GitHub's private vulnerability reporting feature.

## Getting Help

- **GitHub Discussions**: Ask questions and discuss ideas
- **Issue Tracker**: Report bugs and request features
- **Documentation**: Check the `/docs` folder

## Recognition

Contributors are recognized in:

- The project README
- Release notes
- GitHub contributors page

Thank you for contributing to GigaChad GRC!
