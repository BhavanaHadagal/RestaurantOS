# RestaurantOS

AI-powered restaurant management platform — operations, inventory, finance, invoice OCR, and AI-driven insights in one full-stack SaaS app.

## Tech stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts, Framer Motion, Radix UI |
| **Backend** | Node.js, Express, Prisma ORM, PostgreSQL, JWT, Socket.IO, ExcelJS, Winston |
| **AI service** | FastAPI, Tesseract / RapidOCR / EasyOCR, Google Gemini |
| **DevOps** | Docker Compose, GitHub Actions |

## Project structure

```
RestaurantOS/
├── frontend/          # React SPA (Vite)
├── backend/           # Express REST API + Prisma
├── ai-service/        # FastAPI predictions & invoice OCR
├── docs/              # API, RBAC, and deployment guides
├── shared/            # Shared static assets
├── .github/workflows/ # CI pipeline
├── docker-compose.yml # Full-stack Docker setup
└── .env.example       # Environment variable template
```

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **PostgreSQL** 16+
- **Docker & Docker Compose** (optional, for containerized setup)

For invoice OCR on Windows, install [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) or set `TESSERACT_CMD` in `ai-service/.env`.

---

## Local development

Run all three services in separate terminals.

### 1. Database

Start PostgreSQL locally, or use Docker for the database only:

```bash
docker compose up postgres -d
```

If using Docker Postgres, the host port is **5433** (mapped from container `5432`).

### 2. Backend

```bash
cp .env.example backend/.env
# Edit backend/.env — set DATABASE_URL, JWT secrets, AI_SERVICE_URL
```

Example `DATABASE_URL` values:

| Setup | `DATABASE_URL` |
|-------|----------------|
| Local PostgreSQL | `postgresql://restaurantos:restaurantos123@localhost:5432/restaurantos` |
| Docker Postgres | `postgresql://restaurantos:restaurantos123@localhost:5433/restaurantos` |

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Backend API: **http://localhost:5000**  
Health check: **http://localhost:5000/health**

### 3. AI service

```bash
cd ai-service
pip install -r requirements.txt
```

Create `ai-service/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
TESSERACT_CMD=
```

Start the service (run **one** instance on port 8000 — avoid `--reload` during OCR):

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On Windows you can also use `start.bat`.

AI service: **http://localhost:8000**  
API docs: **http://localhost:8000/docs**

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173**

In development, Vite proxies `/api` to `http://localhost:5000`, so no frontend `.env` is required locally.

---

## Docker (full stack)

```bash
cp .env.example .env
# Set GEMINI_API_KEY and strong JWT secrets
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| AI service | http://localhost:8000 |
| PostgreSQL | localhost:5433 |

---

## Demo login credentials

All seeded accounts use the same password: **`Password@123`**

| Role | Email | Default landing route |
|------|-------|------------------------|
| Owner | `owner@restaurantos.com` | `/dashboard` |
| Manager | `manager@restaurantos.com` | `/dashboard` |
| Chef | `chef@restaurantos.com` | `/kitchen` |
| Waiter | `waiter@restaurantos.com` | `/dashboard` |
| Cashier | `cashier@restaurantos.com` | `/dashboard` |

Additional staff accounts are seeded on `demo.restaurantos.in` (e.g. `manager2@`, `chef2@`, `waiter2@`) with the same password.

You can also **sign up** at `/signup` to create a new owner workspace with your own email and password.

After seeding, the console prints a summary including record counts and credentials.

---

## Features

### Authentication & access control
- JWT access + refresh tokens
- Sign up, login, forgot/reset/change password
- Role-based access control (Owner, Manager, Chef, Waiter, Cashier)
- Permission middleware on every API route

### Restaurant operations
- Tables, reservations, menu, orders, kitchen queue
- Customers, bills, payments, staff management

### Inventory & procurement
- Products, warehouses, stock in/out
- Purchase orders, expired/damaged tracking
- Ingredients and suppliers

### Finance
- Expense categories and tracking
- Supplier invoice OCR (PDF/PNG/JPG)
- Sales, expense, inventory, supplier, and profit reports
- Excel and CSV export

### AI Center
- Ingredient shortage prediction (grounded in orders × recipes)
- Stock reorder recommendations
- Menu pricing optimization
- Prep time estimation
- Waste analysis
- Business insights (Gemini-enhanced)

### Real-time
- Socket.IO for new orders, kitchen updates, and dashboard events

---

## API overview

Base URL: `http://localhost:5000/api`

Detailed documentation: [`docs/API.md`](docs/API.md)

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new owner account |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |
| POST | `/auth/forgot-password` | Request password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/change-password` | Change password (authenticated) |
| GET | `/auth/profile` | Get current user profile |

All other routes require `Authorization: Bearer <accessToken>`.

List endpoints support pagination (`page`, `limit`), search, sorting (`sortBy`, `sortOrder`), and filters.

RBAC details: [`docs/RBAC.md`](docs/RBAC.md)

---

## Environment variables

Copy [`.env.example`](.env.example) to `backend/.env` and configure:

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Access token signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Backend | Refresh token signing secret |
| `JWT_EXPIRES_IN` | Backend | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Backend | Refresh token TTL (default `7d`) |
| `PORT` | Backend | API port (default `5000`) |
| `FRONTEND_URL` | Backend | CORS origin (default `http://localhost:5173`) |
| `AI_SERVICE_URL` | Backend | FastAPI base URL (default `http://127.0.0.1:8000`) |
| `SMTP_*` / `EMAIL_FROM` | Backend | Email for password reset |
| `GEMINI_API_KEY` | AI service | Google Gemini API key |
| `GEMINI_MODEL` | AI service | Model name (default `gemini-2.0-flash`) |
| `TESSERACT_CMD` | AI service | Path to `tesseract.exe` on Windows |
| `VITE_API_URL` | Frontend | Production API URL (e.g. `https://api.example.com/api`) |
| `VITE_SOCKET_URL` | Frontend | Production Socket.IO URL |

---

## Useful commands

```bash
# Backend
cd backend
npm run dev          # Start with nodemon
npm run db:seed      # Seed demo data (idempotent)
npm run db:studio    # Open Prisma Studio

# Frontend
cd frontend
npm run build        # Production build
npm run lint         # ESLint

# AI service
cd ai-service
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `EADDRINUSE` on port 5000 or 8000 | Stop duplicate `npm run dev` / `uvicorn` processes; only one backend and one AI instance should run |
| AI returns "Not Found" or connection errors | Ensure AI service is running on port 8000 and `AI_SERVICE_URL` matches |
| Invoice OCR fails on Windows | Install Tesseract or set `TESSERACT_CMD` in `ai-service/.env` |
| Login fails after fresh clone | Run `npm run db:seed` in `backend/` |
| Docker DB connection refused | Use port **5433** in `DATABASE_URL` when connecting from the host |

---

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Vercel (frontend), Railway/Render (backend + AI), and production checklists.

**Production reminders:**
- Change default JWT secrets and demo passwords
- Configure SMTP for password reset
- Set `FRONTEND_URL` and `VITE_API_URL` to your production domains
- Provide `GEMINI_API_KEY` for AI insights and OCR enhancement

---

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main` and `develop`:
- Backend: install, Prisma generate, db push, seed
- Frontend: install, build
- AI service: dependency install, import verification

---

## License

MIT
