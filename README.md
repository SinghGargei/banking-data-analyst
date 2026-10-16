<<<<<<< HEAD
# Banking Conversational Data Analyst

Foundational backend architecture for a **Banking Conversational Data Analyst** built with **Node.js**, **Express**, **TypeScript**, and **SQLite**.

---

## 🌟 Key Features

1. **Secure SQLite Database (`banking.db`)**:
   - Automated initialization with SQLite safety and concurrency PRAGMAs (`WAL` journal mode, `foreign_keys = ON`, `busy_timeout = 5000ms`, `synchronous = NORMAL`).
   - Prepared statements and parameterized bindings across all queries to prevent SQL injection.
   - Comprehensive error handling for file permissions, schema initialization, and query execution.

2. **Three Logically Distinct Datasets**:
   - `applications`: `id`, `month`, `segment` (e.g. Retail, SME, Corporate, Wealth Management, Agriculture), `count`, `created_at`.
   - `branches`: `id`, `name`, `rejection_rate` (`REAL`), `created_at`.
   - `customers`: `id`, `name`, `transaction_value` (`REAL`), `created_at`.

3. **Conversational Analyst Engine Features**:
   - `/api/analyst/schema`: Schema discovery and table introspection endpoint for LLM context grounding.
   - `/api/analyst/overview`: Multi-dataset executive summary across all banking metrics.
   - `POST /api/analyst/query`: Secure, read-only SQL query runner with strict parsing (rejects data manipulation statements, `PRAGMA` commands, and multi-statement queries).

4. **Production-Ready Architecture**:
   - Strict TypeScript configuration (`tsconfig.json`) with strict null checks, no implicit any, and strict parameter checks.
   - Modular structure: Config, Types, Database Service, Schema, Seed, Middleware, Controllers, and Routes.
   - Graceful shutdown handlers for `SIGINT` / `SIGTERM` ensuring clean database disconnection.

---

## 📁 Project Structure

```text
banking-data-analyst/
├── src/
│   ├── config/
│   │   └── env.ts                   # Environment variable parsing and validation
│   ├── db/
│   │   ├── connection.ts            # DatabaseService singleton with PRAGMA security & promise wrappers
│   │   ├── schema.ts                # DDL definitions, indexing, and schema introspection
│   │   └── seed.ts                  # Atomic transaction seeding script with realistic datasets
│   ├── types/
│   │   ├── database.types.ts        # Interfaces for Applications, Branches, Customers, and schema info
│   │   └── express.types.ts         # Standard API responses and AppError definitions
│   ├── middleware/
│   │   ├── errorHandler.ts          # Centralized error handler and 404 handler
│   │   └── requestLogger.ts         # HTTP request logger
│   ├── controllers/
│   │   ├── applications.controller.ts # Applications query and summary endpoints
│   │   ├── branches.controller.ts     # Branches query and rejection rate statistics
│   │   ├── customers.controller.ts    # Customers query and portfolio statistics
│   │   └── analyst.controller.ts      # Schema discovery and safe read-only SQL execution
│   ├── routes/
│   │   ├── applications.routes.ts
│   │   ├── branches.routes.ts
│   │   ├── customers.routes.ts
│   │   ├── analyst.routes.ts
│   │   └── index.ts                 # Aggregated API router
│   ├── app.ts                       # Express app configuration
│   └── server.ts                    # Bootstrap sequence, health checks & graceful shutdown
├── dist/                            # Compiled JavaScript output
├── banking.db                       # SQLite database file
├── .env                             # Environment configuration
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore list
├── tsconfig.json                    # Strict TypeScript configuration
└── package.json                     # Project scripts and dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Installation
```bash
npm install
```

### 3. Database Initialization & Seeding
To initialize the database schema and populate all three datasets (75 application records, 15 branches, 30 customer accounts):
```bash
npm run seed
```

### 4. Running the Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔌 API Endpoints

### System & Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server status and SQLite connection health |
| `GET` | `/api` | Service overview and available endpoints |

### Dataset 1: Applications
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/applications` | List applications (supports `?segment=...`, `?month=...`, pagination) |
| `GET` | `/api/applications/summary` | Aggregated application counts grouped by month and segment |
| `GET` | `/api/applications/:id` | Get single application record by ID |

### Dataset 2: Branches
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/branches` | List branches sorted by rejection rate (`?sortBy=rejection_rate&order=desc`) |
| `GET` | `/api/branches/stats` | Average rejection rate, highest risk, and lowest rejection branches |
| `GET` | `/api/branches/:id` | Get single branch record by ID |

### Dataset 3: Customers
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/customers` | List customers (supports `?minTransaction=...`, pagination) |
| `GET` | `/api/customers/stats` | Total volume, average transaction value, top tier client portfolio |
| `GET` | `/api/customers/:id` | Get single customer record by ID |

### Conversational Analyst Specific Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analyst/schema` | Complete schema metadata, columns, types, and sample data for LLM grounding |
| `GET` | `/api/analyst/overview` | Multi-dataset executive summary for instant conversational answers |
| `POST` | `/api/analyst/query` | Validated read-only SQL query runner (rejects non-`SELECT` statements) |
=======
# banking-data-analyst
Banking Conversational Data Analyst: A foundational backend application built using Node.js, Express, and SQLite designed for banking domain requirements to handle conversational data interactions.
>>>>>>> 890c99ce7a9b9e9c7cc668d7720220bda35ffcb9
