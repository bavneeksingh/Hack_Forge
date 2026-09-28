# Leave Management System

## Architecture

### Backend
- **Framework**: Spring Boot 3.3 + Java 17
- **Database**: H2 (dev) / PostgreSQL (prod)
- **Migrations**: Flyway
- **Auth**: JWT (Bearer token)
- **API prefix**: `/api`

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: TanStack Query
- **Routing**: React Router

## Quick Start

### Backend
```bash
cd backend
mvn spring-boot:run
```
Backend runs on http://localhost:8080/api

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

## Demo Users
| Email | Password | Role |
|---|---|---|
| charlie@company.com | password123 | EMPLOYEE |
| diana@company.com | password123 | EMPLOYEE |
| alice.manager@company.com | password123 | MANAGER |
| bob.manager@company.com | password123 | MANAGER |
| hr.helen@company.com | password123 | HR |
| hr.ivan@company.com | password123 | HR |

## API Endpoints

### Auth
- `POST /api/auth/login` — Login with email/password
- `GET /api/auth/me` — Get current user

### Employee
- `POST /api/leaves` — Submit leave request
- `GET /api/leaves/mine` — My requests
- `GET /api/leaves/{id}` — Get leave details
- `POST /api/leaves/{id}/cancel` — Cancel request
- `GET /api/leaves/preview?start&end&type` — Preview working days + conflicts
- `GET /api/balance/me` — My balance

### Manager
- `GET /api/manager/pending` — Pending approvals
- `POST /api/manager/leaves/{id}/approve` — Approve
- `POST /api/manager/leaves/{id}/reject` — Reject (comment required)
- `GET /api/manager/team-calendar?from&to` — Team calendar

### HR
- `GET /api/hr/pending?filter=ALL|FLAGGED|ESCALATED` — HR queue
- `POST /api/hr/leaves/{id}/approve` — Approve
- `POST /api/hr/leaves/{id}/reject` — Reject (comment required)
- `GET /api/hr/balances` — All balances
- `GET /api/hr/policies` — Team policies
- `PUT /api/hr/policies/{teamId}` — Update policy
- `GET /api/hr/audit` — Audit log
