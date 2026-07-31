# Deployment Guide

## Docker Compose (Recommended for Local/Staging)

```bash
docker-compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000
- PostgreSQL: localhost:5432

## Frontend — Vercel

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variables:
   - `VITE_API_URL` = your backend API URL (e.g., `https://api.restaurantos.com/api`)
   - `VITE_SOCKET_URL` = your backend URL for Socket.IO

## Backend — Railway / Render

1. Create a new Web Service
2. Set root directory to `backend`
3. Use the provided Dockerfile or:
   - Build: `npm install && npx prisma generate`
   - Start: `npx prisma db push && node prisma/seed.js && node src/server.js`
4. Add PostgreSQL database and set `DATABASE_URL`
5. Required environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `FRONTEND_URL`
   - `AI_SERVICE_URL`
   - `NODE_ENV=production`

## AI Service — Railway / Render

1. Deploy from `ai-service` directory using Dockerfile
2. Set `GEMINI_API_KEY` for enhanced insights
3. Note: EasyOCR/PaddleOCR require sufficient memory (2GB+ recommended)

## GitHub Actions CI

CI runs automatically on push to `main`/`develop`:
- Backend: install, Prisma generate, db push, seed
- Frontend: install, build
- AI Service: dependency install, import verification

## Production Checklist

- [ ] Change default JWT secrets
- [ ] Configure SMTP for password reset emails
- [ ] Set up PostgreSQL with backups
- [ ] Configure CORS with production frontend URL
- [ ] Enable HTTPS on all services
- [ ] Set GEMINI_API_KEY for AI features
- [ ] Review RBAC permissions for your team
