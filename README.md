<p align="center">
  <h1 align="center">🏢 Hack Forge — Leave Management System</h1>
  <p align="center">
    A full-stack, enterprise-grade leave management platform with multi-stage approvals, automated escalation, team conflict detection, and role-based access control.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.3.5-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

---

## 📑 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Leave Approval Workflow](#-leave-approval-workflow)
- [State Machine](#-state-machine)
- [Escalation Engine](#-escalation-engine)
- [Conflict Detection](#-conflict-detection)
- [Role-Based Access Control](#-role-based-access-control)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Demo Credentials](#-demo-credentials)
- [Traceability Matrix](#-traceability-matrix)
- [Testing](#-testing)

---

## ✨ Features

| Category | Features |
|----------|----------|
| **Employee** | Apply for leave · Preview working days & conflicts · View balances · Track request status · Cancel requests · Team calendar |
| **Manager** | Approve/reject team requests · View pending queue · Team calendar overview · Escalation notifications · Mid-joining leave calculator & push balance |
| **HR** | Final approval queue · Organization-wide balances · Policy configuration · Audit trail · Filterable queue · Mid-joining leave calculator & org-wide recalibration |
| **System** | JWT authentication · Auto-escalation scheduler · Conflict detection · Working day calculator · Public holiday support · Flyway migrations |

---

## 🏗 System Architecture

```mermaid
graph TB
    subgraph "Frontend — React 19 + Vite"
        UI["🖥️ React SPA<br/>(TypeScript)"]
        RQ["TanStack<br/>React Query"]
        RR["React Router v7"]
        Auth["Auth Context<br/>(JWT Storage)"]
        UI --> RQ
        UI --> RR
        UI --> Auth
    end

    subgraph "Backend — Spring Boot 3.3"
        GW["🔐 Security Filter Chain"]
        JWT["JWT Token Provider"]
        
        subgraph "Controllers"
            AC["AuthController"]
            LC["LeaveController"]
            MC["ManagerController"]
            HC["HrController"]
            BC["BalanceController"]
        end
        
        subgraph "Business Logic"
            LS["LeaveService"]
            SM["LeaveStateMachine"]
            CS["ConflictService"]
            BS["BalanceService"]
            ES["EscalationService"]
            WD["WorkingDayService"]
            SCH["EscalationScheduler"]
        end
        
        subgraph "Data Layer"
            REPO["Spring Data JPA<br/>Repositories"]
            FW["Flyway Migrations"]
        end

        GW --> JWT
        GW --> AC
        GW --> LC
        GW --> MC
        GW --> HC
        GW --> BC
        LC --> LS
        MC --> LS
        HC --> LS
        BC --> LS
        LS --> SM
        LS --> CS
        LS --> BS
        LS --> WD
        SCH --> ES
        SM --> REPO
        CS --> REPO
        BS --> REPO
        ES --> REPO
        REPO --> FW
    end

    subgraph "Database"
        DB[("PostgreSQL 15<br/>/ H2 (dev)")]
    end

    UI -- "HTTPS / JSON<br/>Bearer Token" --> GW
    FW --> DB
    REPO --> DB
```

---

## 🔄 Leave Approval Workflow

The complete lifecycle of a leave request from submission to final resolution:

```mermaid
flowchart TD
    A["👤 Employee Submits<br/>Leave Request"] --> B{"Working Days<br/>Calculated"}
    B --> C["Weekends & Holidays<br/>Excluded"]
    C --> D{"Sufficient<br/>Balance?"}
    D -- No --> E["❌ Rejected<br/>(Insufficient Balance)"]
    D -- Yes --> F["🔍 Conflict Check"]
    F --> G{"Team Conflict<br/>Detected?"}
    G -- Yes --> H["⚠️ Conflict Flagged<br/>(Informational Only)"]
    G -- No --> I["✅ No Conflicts"]
    H --> J["📋 Request Created<br/>Status: PENDING_MANAGER"]
    I --> J
    J --> K["📧 Assigned to<br/>Direct Manager"]
    K --> L{"Manager<br/>Decision"}
    L -- Approve --> M["✅ Manager Approved<br/>Status: PENDING_HR"]
    L -- Reject --> N["❌ Rejected<br/>(with mandatory comment)"]
    L -- No action within timeout --> O["⏰ Escalation<br/>Triggered"]
    M --> P["📧 Assigned to<br/>HR Approver"]
    P --> Q{"HR<br/>Decision"}
    Q -- Approve --> R["🎉 APPROVED<br/>Balance Deducted"]
    Q -- Reject --> S["❌ Rejected<br/>(with mandatory comment)"]
    Q -- No action within timeout --> T["⏰ HR Escalation<br/>Triggered"]
    O --> U["Reassigned to<br/>Manager's Manager or HR"]
    U --> L
    T --> V["Reassigned to<br/>Next HR in Rotation"]
    V --> Q

    style A fill:#4CAF50,color:#fff
    style R fill:#4CAF50,color:#fff
    style E fill:#F44336,color:#fff
    style N fill:#F44336,color:#fff
    style S fill:#F44336,color:#fff
    style H fill:#FF9800,color:#fff
    style O fill:#FF9800,color:#fff
    style T fill:#FF9800,color:#fff
```

---

## ⚙️ State Machine

Every leave request transitions through a deterministic state machine. All transitions are validated for permission and recorded in the audit trail.

```mermaid
stateDiagram-v2
    [*] --> PENDING_MANAGER : SUBMIT
    
    PENDING_MANAGER --> PENDING_HR : MANAGER_APPROVE
    PENDING_MANAGER --> REJECTED : MANAGER_REJECT
    PENDING_MANAGER --> CANCELLED : CANCEL (by requester)
    PENDING_MANAGER --> PENDING_MANAGER : ESCALATE (reassign)

    PENDING_HR --> APPROVED : HR_APPROVE
    PENDING_HR --> REJECTED : HR_REJECT
    PENDING_HR --> CANCELLED : CANCEL (by requester)
    PENDING_HR --> PENDING_HR : ESCALATE (reassign)

    APPROVED --> CANCELLED : CANCEL (if not ended)
    
    REJECTED --> [*]
    CANCELLED --> [*]
    APPROVED --> [*]
```

### Transition Rules

| Current State | Action | Next State | Actor | Constraint |
|---------------|--------|------------|-------|------------|
| `null` (new) | `SUBMIT` | `PENDING_MANAGER` | Employee | Must have sufficient balance |
| `PENDING_MANAGER` | `MANAGER_APPROVE` | `PENDING_HR` | Assigned Manager | - |
| `PENDING_MANAGER` | `MANAGER_REJECT` | `REJECTED` | Assigned Manager | Comment required |
| `PENDING_HR` | `HR_APPROVE` | `APPROVED` | Any HR user | Balance deducted |
| `PENDING_HR` | `HR_REJECT` | `REJECTED` | Any HR user | Comment required |
| `PENDING_*` / `APPROVED` | `CANCEL` | `CANCELLED` | Requester only | Cannot cancel ended leave |
| `PENDING_*` | `ESCALATE` | Same status | System (scheduler) | Reassigns approver |

---

## ⏰ Escalation Engine

Automatic escalation prevents leave requests from stalling. The scheduler runs periodically and reassigns overdue requests.

```mermaid
flowchart LR
    subgraph "⏰ Scheduler"
        CRON["EscalationScheduler<br/>(Periodic Check)"]
    end
    
    subgraph "Escalation Service"
        CHECK["Find Overdue<br/>Requests"]
        EVAL{"Current<br/>Stage?"}
    end
    
    subgraph "Manager Stage Escalation"
        M1["Current Manager"]
        M2["Manager's Manager"]
        M3["First HR User"]
    end
    
    subgraph "HR Stage Escalation"
        H1["Current HR"]
        H2["Next HR<br/>(Round-Robin)"]
    end

    CRON --> CHECK
    CHECK --> EVAL
    EVAL -- "PENDING_MANAGER" --> M1
    M1 -- "has manager" --> M2
    M1 -- "no manager" --> M3
    M2 -- "no manager" --> M3
    EVAL -- "PENDING_HR" --> H1
    H1 --> H2

    style CRON fill:#9C27B0,color:#fff
    style M3 fill:#2196F3,color:#fff
    style H2 fill:#2196F3,color:#fff
```

### Escalation Chain

```
Manager Stage:  Current Manager → Manager's Manager → HR Pool
HR Stage:       Current HR → Next HR (round-robin rotation)
```

Each escalation:
- Sets `escalated = true` and records `escalatedFrom`
- Marks `stageSkipped = true`
- Resets the `dueAt` timer based on team's `escalationTimeoutHours`
- Writes an `ApprovalHistory` audit entry

---

## 🔍 Conflict Detection

The conflict engine analyzes team availability for each working day in a leave request's range and flags potential overlaps.

```mermaid
flowchart TD
    A["Leave Request<br/>(startDate → endDate)"] --> B["Identify Team<br/>(employees sharing same manager)"]
    B --> C["Calculate Working Days<br/>(exclude weekends + holidays)"]
    C --> D["For Each Working Day"]
    D --> E["Count Team Members<br/>Already Away"]
    E --> F["Calculate Away %<br/>= (away + 1) / teamSize"]
    F --> G{"awayPct ≥<br/>threshold?"}
    G -- Yes --> H["🚩 Flag Day<br/>as Conflict"]
    G -- No --> I["✅ Day is<br/>Clear"]
    H --> J["Attach ConflictDetails<br/>to Request"]
    I --> D

    style H fill:#FF9800,color:#fff
    style I fill:#4CAF50,color:#fff
```

> **Note:** Conflicts are **informational only** — they never block submission or approval. The default threshold is **40%** of the team away.

---

## 🛡 Role-Based Access Control

```mermaid
flowchart LR
    subgraph "Roles"
        EMP["👤 EMPLOYEE"]
        MGR["👔 MANAGER"]
        HR["🏛️ HR"]
    end

    subgraph "Permissions"
        P1["Apply for Leave"]
        P2["View Own Requests"]
        P3["View Own Balance"]
        P4["Cancel Own Requests"]
        P5["Team Calendar"]
        P6["Approve / Reject Team"]
        P7["Final Approval Queue"]
        P8["All Org Balances"]
        P9["Policy Configuration"]
        P10["Audit Trail"]
    end

    EMP --> P1
    EMP --> P2
    EMP --> P3
    EMP --> P4
    EMP --> P5
    
    MGR --> P1
    MGR --> P2
    MGR --> P3
    MGR --> P4
    MGR --> P5
    MGR --> P6
    
    HR --> P1
    HR --> P2
    HR --> P3
    HR --> P4
    HR --> P5
    HR --> P6
    HR --> P7
    HR --> P8
    HR --> P9
    HR --> P10

    style EMP fill:#66BB6A,color:#fff
    style MGR fill:#42A5F5,color:#fff
    style HR fill:#AB47BC,color:#fff
```

> HR **inherits** all Manager permissions — an HR user can access both the Manager approvals page and all HR-exclusive pages.

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Java 17** | Language runtime |
| **Spring Boot 3.3.5** | Application framework |
| **Spring Security** | Authentication & authorization |
| **Spring Data JPA** | ORM & repository abstraction |
| **JJWT 0.12.6** | JWT token generation & validation |
| **Flyway** | Database migration management |
| **H2** | In-memory database (development) |
| **PostgreSQL 15** | Production database |
| **Jakarta Validation** | Request validation |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **TypeScript 6.0** | Type-safe JavaScript |
| **Vite 8** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **TanStack React Query v5** | Server state management & caching |
| **Axios** | HTTP client |
| **Tailwind CSS 4** | Utility-first styling |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Multi-container orchestration |
| **Playwright** | End-to-end testing |

---

## 📁 Project Structure

```
Hack_Forge/
├── 📄 README.md
├── 📄 docker-compose.yml
│
├── 📂 backend/                          # Spring Boot API
│   ├── 📄 pom.xml                       # Maven config
│   └── src/main/java/com/leavemanager/
│       ├── 📄 LeaveManagerApplication.java
│       │
│       ├── 📂 config/                   # Application configuration
│       │   ├── SecurityConfig.java      #   JWT filter chain, CORS, role-based endpoint security
│       │   ├── JacksonConfig.java       #   JSON serialization settings
│       │   └── ClockConfig.java         #   Injectable Clock for testability
│       │
│       ├── 📂 controller/              # REST API endpoints
│       │   ├── AuthController.java      #   POST /auth/login, GET /auth/me
│       │   ├── LeaveController.java     #   CRUD for leave requests, preview, team-calendar
│       │   ├── ManagerController.java   #   GET /manager/pending, approve/reject
│       │   ├── HrController.java        #   HR queue, policies, audit, org balances
│       │   └── BalanceController.java   #   GET /balance/me
│       │
│       ├── 📂 domain/                   # JPA entities
│       │   ├── User.java                #   Employee/Manager/HR user entity
│       │   ├── Team.java                #   Team with conflict threshold & escalation config
│       │   ├── LeaveRequest.java        #   Core leave request entity
│       │   ├── LeaveType.java           #   Annual/Sick/Personal leave types
│       │   ├── LeaveBalance.java        #   Per-employee yearly balance tracking
│       │   ├── ApprovalHistory.java     #   Audit trail entries
│       │   ├── PublicHoliday.java       #   Public holiday calendar
│       │   └── 📂 enums/
│       │       ├── Role.java            #     EMPLOYEE | MANAGER | HR
│       │       ├── LeaveStatus.java     #     PENDING_MANAGER | PENDING_HR | APPROVED | REJECTED | CANCELLED
│       │       └── LeaveAction.java     #     SUBMIT | MANAGER_APPROVE | MANAGER_REJECT | HR_APPROVE | HR_REJECT | CANCEL | ESCALATE
│       │
│       ├── 📂 dto/                      # Data Transfer Objects
│       │   ├── LoginRequest / LoginResponse
│       │   ├── LeaveSubmitRequest / LeaveRequestDto / LeavePreviewDto
│       │   ├── BalanceDto / PolicyDto / TeamCalendarDto
│       │   ├── ApprovalHistoryDto / ConflictDetail
│       │   └── UserDto / UserSummaryDto / ErrorResponse
│       │
│       ├── 📂 service/                  # Business logic
│       │   ├── AuthService.java         #   Login, JWT generation, user lookup
│       │   ├── LeaveService.java        #   Core orchestrator — submit, approve, reject, cancel
│       │   ├── LeaveStateMachine.java   #   Deterministic state transitions + audit trail
│       │   ├── ConflictService.java     #   Team overlap detection
│       │   ├── BalanceService.java      #   Balance tracking + pro-rated entitlements
│       │   ├── EscalationService.java   #   Overdue request reassignment
│       │   ├── EscalationScheduler.java #   Periodic escalation trigger
│       │   └── WorkingDayService.java   #   Working day calculation (holidays + weekends)
│       │
│       ├── 📂 security/                 # JWT infrastructure
│       │   ├── JwtTokenProvider.java    #   Token creation + validation
│       │   ├── JwtAuthenticationFilter.java  # Request filter
│       │   ├── CustomUserDetails.java   #   Spring Security UserDetails impl
│       │   └── CustomUserDetailsService.java # User loading
│       │
│       ├── 📂 repository/              # Spring Data JPA repos
│       │   ├── UserRepository.java
│       │   ├── LeaveRequestRepository.java  # Complex queries (team, overdue, etc.)
│       │   ├── LeaveBalanceRepository.java
│       │   ├── LeaveTypeRepository.java
│       │   ├── ApprovalHistoryRepository.java
│       │   ├── TeamRepository.java
│       │   └── PublicHolidayRepository.java
│       │
│       ├── 📂 exception/               # Custom exceptions
│       │
│       └── 📂 resources/db/migration/  # Flyway SQL migrations
│           ├── V1__create_users_and_teams.sql
│           ├── V2__create_leave_types_and_balances.sql
│           ├── V3__create_leave_requests_and_history.sql
│           ├── V4__create_public_holidays.sql
│           ├── V5__seed_data.sql                      # Users, teams, balances, holidays
│           ├── V6__seed_upcoming_team_leaves.sql       # Demo leave data
│           └── V7__seed_hr_and_manager_balances.sql    # HR/Manager balance seeding
│
└── 📂 frontend/                         # React SPA
    ├── 📄 package.json
    └── src/
        ├── 📄 App.tsx                   # Router + protected routes
        ├── 📄 Layout.tsx                # Sidebar navigation + layout shell
        ├── 📄 auth.tsx                  # Auth context + JWT management
        ├── 📄 api.ts                    # Axios instance with interceptors
        ├── 📄 types.ts                  # Shared TypeScript interfaces
        ├── 📄 toast.tsx                 # Toast notification system
        ├── 📄 index.css                 # Global styles + design tokens
        │
        ├── 📂 pages/
        │   ├── LoginPage.tsx            # Authentication page
        │   ├── DashboardPage.tsx        # Role-aware dashboard with stats
        │   ├── ApplyLeavePage.tsx        # Leave application form with preview
        │   ├── MyRequestsPage.tsx       # Employee's request history
        │   ├── LeaveDetailPage.tsx       # Full request detail + approval timeline
        │   ├── BalancePage.tsx           # Personal balance view
        │   ├── TeamCalendarPage.tsx      # Interactive team availability calendar
        │   ├── ApprovalsPage.tsx         # Manager approval queue
        │   ├── HrQueuePage.tsx          # HR final approval queue
        │   ├── AllBalancesPage.tsx       # Org-wide balance overview (HR)
        │   ├── PoliciesPage.tsx         # Team policy configuration (HR)
        │   └── AuditLogPage.tsx         # System audit trail (HR)
        │
        └── 📂 components/
            └── StatusBadge.tsx           # Reusable status indicator
```

---

## 🚀 Quick Start

### Prerequisites

- **Java 17+** (for backend)
- **Node.js 18+** (for frontend)
- **Docker & Docker Compose** (optional, for containerized setup)

### Option 1: Docker Compose (Recommended)

Run the entire stack with a single command:

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | `http://localhost` |
| Backend API | `http://localhost:8080/api` |
| PostgreSQL | `localhost:5432` |

### Option 2: Local Development

**1. Start the Backend:**
```bash
cd backend
./mvnw spring-boot:run
```
> Uses H2 in-memory database by default. Backend runs on `http://localhost:8080`.

**2. Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs on `http://localhost:5173` with HMR.

---

## 📡 API Reference

All endpoints are prefixed with `/api` (configured via `server.servlet.context-path`).

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | Login with email/password → JWT | ❌ Public |
| `GET` | `/api/auth/me` | Get current user profile | ✅ Bearer |

### Leave Requests (Employee)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/leaves` | Submit a new leave request | ✅ Bearer |
| `GET` | `/api/leaves/mine` | Get all of the user's requests | ✅ Bearer |
| `GET` | `/api/leaves/:id` | Get a specific leave request | ✅ Bearer |
| `POST` | `/api/leaves/:id/cancel` | Cancel own leave request | ✅ Bearer |
| `GET` | `/api/leaves/preview` | Preview working days + conflicts | ✅ Bearer |
| `GET` | `/api/leaves/team-calendar` | Team availability calendar | ✅ Bearer |

### Balance
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/balance/me` | Get current user's balances | ✅ Bearer |

### Manager
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/manager/pending` | Get pending approvals queue | ✅ MANAGER |
| `POST` | `/api/manager/leaves/:id/approve` | Approve a request | ✅ MANAGER |
| `POST` | `/api/manager/leaves/:id/reject` | Reject (comment required) | ✅ MANAGER |
| `GET` | `/api/manager/team-calendar` | Manager's team calendar | ✅ MANAGER |

### HR
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/hr/pending` | Get HR approval queue | ✅ HR |
| `POST` | `/api/hr/leaves/:id/approve` | Final approval | ✅ HR |
| `POST` | `/api/hr/leaves/:id/reject` | Final rejection (comment required) | ✅ HR |
| `GET` | `/api/hr/balances` | All employee balances | ✅ HR |
| `GET` | `/api/hr/policies` | Team policies | ✅ HR |
| `GET` | `/api/hr/audit` | Audit trail | ✅ HR |

### Mid-Joining Calculator (Manager & HR)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/calculator/preview` | Preview pro-rated leave calculations for any join date | ✅ MANAGER / HR |
| `GET` | `/api/calculator/users` | Organization members with current & calculated pro-rated leaves | ✅ MANAGER / HR |
| `POST` | `/api/calculator/push-balance` | Push mid-joining calculated leaves to member balance | ✅ MANAGER / HR |
| `POST` | `/api/calculator/recalibrate-all` | Batch recalibrate and push for all mid-year joiners | ✅ HR |

---

## 🗄 Database Schema

```mermaid
erDiagram
    USERS {
        bigint id PK
        varchar email UK
        varchar password
        varchar name
        enum role "EMPLOYEE | MANAGER | HR"
        bigint manager_id FK
        bigint team_id FK
        date join_date
        boolean active
    }

    TEAMS {
        bigint id PK
        varchar name
        bigint manager_id FK
        decimal conflict_threshold
        int escalation_timeout_hours
    }

    LEAVE_TYPES {
        bigint id PK
        varchar name
        int annual_entitlement
        boolean carry_forward
    }

    LEAVE_BALANCES {
        bigint id PK
        bigint employee_id FK
        bigint leave_type_id FK
        int year
        decimal entitled
        decimal used
        decimal pending
    }

    LEAVE_REQUESTS {
        bigint id PK
        bigint requester_id FK
        bigint leave_type_id FK
        date start_date
        date end_date
        int working_days
        varchar reason
        enum status "PENDING_MANAGER | PENDING_HR | APPROVED | REJECTED | CANCELLED"
        bigint current_assignee_id FK
        timestamp due_at
        boolean escalated
        varchar escalated_from
        boolean stage_skipped
        boolean conflict_flagged
        text conflict_details
        timestamp created_at
        timestamp updated_at
    }

    APPROVAL_HISTORY {
        bigint id PK
        bigint leave_request_id FK
        varchar stage
        bigint actor_id FK
        enum action
        varchar comment
        timestamp created_at
    }

    PUBLIC_HOLIDAYS {
        bigint id PK
        date date
        varchar name
        int year
    }

    USERS ||--o{ LEAVE_REQUESTS : "submits"
    USERS ||--o{ LEAVE_BALANCES : "has"
    USERS ||--o| TEAMS : "belongs to"
    USERS ||--o| USERS : "reports to (manager)"
    TEAMS ||--|| USERS : "managed by"
    LEAVE_TYPES ||--o{ LEAVE_BALANCES : "defines"
    LEAVE_TYPES ||--o{ LEAVE_REQUESTS : "categorizes"
    LEAVE_REQUESTS ||--o{ APPROVAL_HISTORY : "tracks"
    USERS ||--o{ APPROVAL_HISTORY : "acts on"
    USERS ||--o{ LEAVE_REQUESTS : "assigned to"
```

---

## 🔑 Demo Credentials

All demo accounts use the password: **`password123`**

| Role | Email | Name | Team |
|------|-------|------|------|
| 🏛️ HR | `hr.helen@company.com` | Helen HR | — |
| 🏛️ HR | `hr.ivan@company.com` | Ivan HR | — |
| 🏛️ HR | `harper.hr@company.com` | Harper HR (Joined Sep 2026) | — |
| 👔 Manager | `alice.manager@company.com` | Alice Manager | Engineering |
| 👔 Manager | `bob.manager@company.com` | Bob Manager | Design |
| 👔 Manager | `marcus.manager@company.com` | Marcus Manager (Joined Aug 2026) | Design |
| 👤 Employee | `charlie@company.com` | Charlie Dev | Engineering |
| 👤 Employee | `diana@company.com` | Diana Dev | Engineering |
| 👤 Employee | `eve@company.com` | Eve Designer | Design |
| 👤 Employee | `frank@company.com` | Frank Dev (Joined Jul 2026) | Engineering |
| 👤 Employee | `george.dev@company.com` | George Dev (Joined May 2026) | Engineering |

### Team Hierarchy

```mermaid
graph TD
    BOB["👔 Bob Manager<br/>(Design Team)"]
    ALICE["👔 Alice Manager<br/>(Engineering Team)"]
    
    BOB --> ALICE
    ALICE --> CHARLIE["👤 Charlie Dev"]
    ALICE --> DIANA["👤 Diana Dev"]
    ALICE --> FRANK["👤 Frank Dev"]
    BOB --> EVE["👤 Eve Designer"]

    HELEN["🏛️ Helen HR"]
    IVAN["🏛️ Ivan HR"]

    style BOB fill:#42A5F5,color:#fff
    style ALICE fill:#42A5F5,color:#fff
    style CHARLIE fill:#66BB6A,color:#fff
    style DIANA fill:#66BB6A,color:#fff
    style FRANK fill:#66BB6A,color:#fff
    style EVE fill:#66BB6A,color:#fff
    style HELEN fill:#AB47BC,color:#fff
    style IVAN fill:#AB47BC,color:#fff
```

---

## 📊 Traceability Matrix

| # | Requirement | Implementation |
|---|-------------|----------------|
| P1 | Roles & Authentication | `SecurityConfig.java`, `JwtTokenProvider.java`, `AuthContext.tsx` |
| P2 | Balance Service | `BalanceService.java`, `WorkingDayService.java`, `LeaveBalance.java` |
| P3 | Conflict Detection & State Machine | `ConflictService.java`, `LeaveStateMachine.java` |
| P4 | Manager / HR Approval Flow | `ManagerController.java`, `HrController.java`, `ApprovalsPage.tsx` |
| P5 | Escalation & Audit | `EscalationService.java`, `EscalationScheduler.java`, `ApprovalHistory.java` |
| P6 | Shared UI Framework | `Layout.tsx`, `index.css`, `App.tsx` router |
| P7 | Employee UI | `ApplyLeavePage.tsx`, `DashboardPage.tsx`, `MyRequestsPage.tsx`, `TeamCalendarPage.tsx` |
| P8 | Manager UI | `ApprovalsPage.tsx`, `LeaveDetailPage.tsx` |
| P9 | HR UI | `HrQueuePage.tsx`, `AuditLogPage.tsx`, `AllBalancesPage.tsx`, `PoliciesPage.tsx` |
| P10 | Polish & E2E | `docker-compose.yml`, Playwright tests, `README.md` |

---

## 🧪 Testing

### End-to-End Tests (Playwright)

```bash
cd frontend
npx playwright install    # first-time setup
npm run test:e2e
```

### Backend Tests

```bash
cd backend
./mvnw test
```

---

## 📜 License

This project was built for the **Hack Forge** hackathon.
