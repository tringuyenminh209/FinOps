# FinOps Platform

> 🇯🇵 日本のSME向け FinOps/GreenOps Micro-SaaS プラットフォーム

クラウドコスト最適化とCO2排出量管理を自動化する、中小企業に特化したプラットフォーム。

## Features

| Module | Description |
|--------|-------------|
| **Cloud Connector** | AWS/Azure環境への安全な接続・リソースカタログ化 |
| **Night-Watch** | 就業時間ベースのリソース自動停止/起動（最大40%コスト削減） |
| **GreenOps** | CO2排出量算出・Green-scoreレポート |
| **AI Advisor** | GPT-4o miniによるコスト最適化提案 |
| **LINE Integration** | Flex Message通知・LINE Mini App承認 |

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Node.js (TypeScript) + Hono + AWS Lambda
- **Database**: PostgreSQL (Supabase) + Row Level Security
- **Event-Driven**: EventBridge + SQS + SNS
- **AI**: OpenAI GPT-4o mini
- **Payments**: Stripe (JCT対応)
- **DevOps**: Docker + GitHub Actions + Terraform

## Project Structure

```
FinOps/
├── packages/
│   ├── frontend/          # Next.js App Router
│   ├── backend/           # Hono API (Lambda)
│   │   └── src/modules/
│   │       ├── cloud-connector/
│   │       ├── night-watch/
│   │       ├── greenops/
│   │       ├── ai-advisor/
│   │       ├── line/
│   │       ├── auth/
│   │       └── billing/
│   └── shared/            # Shared types & constants
├── docker/                # Docker Compose configs
├── .github/workflows/     # CI/CD pipelines
├── .env.example           # Environment template
├── turbo.json             # Turborepo config
└── package.json           # Root workspace
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop

### Setup

```bash
# Clone & install
git clone <repo-url>
cd FinOps
cp .env.example .env
pnpm install

# Start infrastructure (PostgreSQL + LocalStack)
docker compose -f docker/docker-compose.dev.yml up -d

# Start development servers
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

### Available Commands

```bash
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm docker:up        # Start Docker services
pnpm docker:down      # Stop Docker services
pnpm db:migrate       # Run database migrations
```

## Documentation

> Documentation is in the `docs/` folder (gitignored, local only).

| Doc | Content |
|-----|---------|
| `01-project-overview.md` | Vision, modules, business model |
| `02-system-architecture.md` | Architecture diagrams, data flows |
| `03-database-design.md` | ER diagram, SQL schemas |
| `04-tech-stack.md` | Complete technology stack |
| `05-feature-specs.md` | Module implementation specs |
| `06-development-plan.md` | Roadmap, timeline |
| `07-docker-setup.md` | Docker environment guide |
| `08-cicd-pipeline.md` | GitHub Actions pipelines |
| `09-git-strategy.md` | Branch model, conventions |
| `10-scalability.md` | Scaling & future plans |

## License

Private — All rights reserved.
