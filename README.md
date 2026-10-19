# FinPilot AI — SME Finance Copilot

[![FinTech Competition](https://img.shields.io/badge/Competition-FinTech%20MVP-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-7%20Passed-emerald.svg)](#unit-tests--accounting-rule-verification)

**FinPilot AI** is an intelligent financial operating system and copilot designed for small and medium-sized enterprises (SMEs). Built for an international FinTech competition, FinPilot AI helps business owners master cash flow velocity, anticipate liquidity bottlenecks, monitor cash runway, and explore working capital options.

---

## Accounting Rules & Principles

The financial engine strictly adheres to foundational financial principles to prevent misleading figures:

### 1. Cash Basis for Operating Cash Movements
- **Realized Cash Movements**: Only transactions marked with `status: 'paid'` represent realized cash inflows or outflows.
- **Operating Cash Balance**: Calculated strictly as:
  $$\text{Operating Cash Balance} = \text{Opening Balance} + \sum \text{Paid Inflows} - \sum \text{Paid Outflows}$$
- An invoice or bill does **not** alter the bank balance until it is settled.

### 2. Separation of Pending Commitments (Accrual vs. Cash)
- **Pending Receivables (Accounts Receivable / AR)**: Invoices sent to customers with `type: 'income'` and `status: 'pending'`. These represent money owed to the business but are **strictly excluded** from current operating cash to prevent premature cash recognition.
- **Pending Payables (Accounts Payable / AP)**: Supplier bills with `type: 'expense'` and `status: 'pending'`. These are tracked as upcoming cash drains but are **not deducted** from current cash until payment execution.

### 3. Elimination of Double-Counting
- When a transaction status transitions from `'pending'` to `'paid'`, it shifts out of AR/AP and into realized cash movements. Transactions cannot be counted simultaneously as both pending receivables and realized cash receipts.

### 4. Decimal-Safe Integer Cents Arithmetic
- Floating-point calculations in JavaScript (IEEE 754) can introduce rounding drift (e.g., `0.1 + 0.2 = 0.30000000000000004`).
- All sums and differences are computed in **integer minor units** (cents / minor units) before converting back to standard currency format:
  $$\text{toCents}(d) = \text{Math.round}(d \times 100), \quad \text{fromCents}(c) = \frac{\text{Math.round}(c)}{100}$$

### 5. Transparent Next-30-Day Baseline Projection
- **Methodology**: Extrapolates net cash trajectory using trailing 60-day historical net cash velocity ($\text{run-rate}/\text{day}$) combined with scheduled pending invoice settlements.
- **Stated Modeling Assumptions**:
  1. Base operational cash burn/inflow rate is extrapolated linearly from the trailing 60 calendar days.
  2. 90% realization rate applied to scheduled pending customer receivables.
  3. 100% fulfillment rate applied to scheduled pending supplier payables.
  4. Assumes zero unbudgeted extraordinary capital equipment outlays.
- **Integrity Notice**: Clearly labeled as a **deterministic baseline extrapolation**, not an AI prediction or neural forecast.

---

## Architectural Stack

| Layer | Technologies & Libraries | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Single Page Application with centralized state |
| **State Management** | React Context (`FinancialContext`) | Unified single source of truth across Dashboard, Ledger, and Cash Flow |
| **Routing** | React Router (`react-router-dom` v6) | Route declarations (`/`, `/dashboard`, `/transactions`, `/cash-flow`, etc.) |
| **Styling** | Tailwind CSS v3, Lucide React | Trustworthy fintech design system with navy & teal palette |
| **Charts** | Recharts v2 | Responsive cash flow trajectory area charts derived from live transactions |
| **Backend Server** | Node.js, Express, TypeScript | RESTful API server with centralized error handling |
| **Validation** | Zod | Runtime schema validation on both server & client |
| **Testing** | Node.js Test Runner + `tsx` | Native TypeScript unit tests for accounting rules |
| **Repository** | Isolated Demo Repository | In-memory evaluation repository with reset capability |

---

## Project Structure

```text
finpilot-ai/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             # Button, Card, MetricCard, StatusBadge, Modals
│   │   │   ├── dashboard/          # FinancialSummaryGrid, CashFlowOverviewChart, RecentAlerts
│   │   │   └── transactions/       # TransactionModal (Add/Edit), DeleteConfirmModal
│   │   ├── context/
│   │   │   └── FinancialContext.tsx# Centralized shared state & synchronization
│   │   ├── hooks/                  # useHealthCheck, useFinancial
│   │   ├── layouts/                # AppLayout (Sidebar + Navbar), PublicLayout
│   │   ├── lib/                    # utils.ts, money.ts (cents-safe arithmetic)
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx     # Route / (Product overview)
│   │   │   ├── DashboardPage.tsx   # Route /dashboard (KPI cards, chart, ledger preview)
│   │   │   ├── TransactionsPage.tsx# Route /transactions (Search, filters, CRUD modals)
│   │   │   ├── CashFlowPage.tsx    # Route /cash-flow (Monthly rolling ledger, 30d projection)
│   │   │   ├── FinancingPage.tsx   # Route /financing (Upcoming financing support)
│   │   │   ├── CopilotPage.tsx     # Route /copilot (Interactive AI Copilot preview)
│   │   │   └── NotFoundPage.tsx    # Route 404 fallback
│   │   ├── services/
│   │   │   ├── api.ts              # Centralized typed HTTP client with Zod parsing
│   │   │   └── financialCalculations.ts # Pure financial math engine
│   │   ├── types/                  # TypeScript interfaces & Zod schemas
│   │   ├── App.tsx                 # Route tree definitions
│   │   └── main.tsx                # React DOM mounting
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── controllers/            # transactionController.ts, financialController.ts, healthController.ts
│   │   ├── middleware/             # errorHandler.ts (404 and global handler)
│   │   ├── repositories/           # transactionRepository.ts (isolated in-memory sandbox)
│   │   ├── routes/                 # transactionRoutes.ts, financialRoutes.ts, healthRoutes.ts
│   │   ├── services/
│   │   │   ├── financialCalculationService.ts # Accounting logic & monthly aggregations
│   │   │   └── __tests__/          # Unit tests (financialCalculations.test.ts)
│   │   ├── utils/                  # money.ts (cents arithmetic)
│   │   ├── types/                  # Server-side TypeScript interfaces & Zod schemas
│   │   ├── app.ts                  # Express application setup & CORS configuration
│   │   └── index.ts                # Server entry point & graceful shutdown
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                    # Root orchestration scripts
└── README.md                       # Complete documentation & runbook
```

---

## API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server uptime and health verification |
| `GET` | `/api/transactions` | Query transactions with filters (`type`, `status`, `category`, `search`, `startDate`, `endDate`, `sortBy`, `sortOrder`) |
| `GET` | `/api/transactions/:id` | Fetch individual transaction by ID |
| `POST` | `/api/transactions` | Record new transaction (validated with Zod) |
| `PUT` | `/api/transactions/:id` | Update existing transaction (validated with Zod) |
| `DELETE` | `/api/transactions/:id` | Delete transaction by ID |
| `POST` | `/api/transactions/reset` | Restore transaction store to initial illustrative seed records |
| `GET` | `/api/financial/summary` | Return computed financial metrics, monthly rolling ledger, and 30-day baseline projection |

---

## In-Memory Demo Repository Notice & Limitations

> [!NOTE]
> **Storage Limitations:** The backend currently utilizes an isolated in-memory repository (`transactionRepository.ts`).
> - Data is stored in application memory for testing and demonstration purposes without requiring external paid database setups.
> - Repository state is non-durable and resets when the backend server process restarts.
> - Users can click **"Reset Demo Data"** at any time to restore the initial illustrative SME dataset (26 verified records spanning May 2026 to October 2026).

---

## Unit Tests & Accounting Rule Verification

Unit tests are written using Node's native test runner (`node:test`) and `tsx`:

```bash
# Run unit tests from root
npm run test

# Or run directly in server
cd server
npm run test
```

### Verified Test Suite (7/7 Passing)
1. **Paid vs. Pending Separation**: Confirms pending income is isolated into AR and never counted in cash balance.
2. **Negative Net Cash Flow**: Verifies negative net cash flow burns operating cash correctly.
3. **Zero / Empty Handling**: Verifies empty transaction collections return valid baseline responses without errors.
4. **Integer Cents Precision**: Proves `0.1 + 0.2 = 0.3` without floating-point artifacts.
5. **Rolling Monthly Ledger**: Proves closing balance of Month $N$ becomes exact opening balance of Month $N+1$.
6. **Month Boundary Handling**: Verifies transactions on boundary dates (`2026-10-01` and `2026-10-31`) are correctly included in monthly buckets.
7. **Baseline 30-Day Projection**: Verifies run-rate calculation and documented assumptions.

---

## Commands to Build, Test, and Run

### 1. Build and Typecheck
```bash
# Typecheck entire full stack (client + server)
npm run typecheck

# Run unit tests
npm run test

# Build production bundles
npm run build
```

### 2. Running Locally for Manual Testing

In two terminal windows:

#### Terminal 1 — Backend Server:
```bash
cd server
npm run dev
```
*Starts at `http://localhost:5000` (`GET http://localhost:5000/api/health`).*

#### Terminal 2 — Frontend Client:
```bash
cd client
npm run dev
```
*Starts at `http://localhost:5173`. Open in your browser.*

---

## Manual Testing Walkthrough

Follow these steps to manually evaluate all Step 2 features:

1. **Transaction Management (`/transactions`)**:
   - Navigate to `/transactions` via the left sidebar.
   - Verify the ledger table displays 26 seeded demo transactions.
   - Click **"Add Transaction"**; enter an expense (e.g. `$2,500` for "Warehouse Supplies", status "Settled"). Submit the form.
   - Notice the table immediately updates, and the top metric strips recalculate.
   - Edit an existing transaction or click the trash icon to test the deletion confirmation dialog.
   - Test filtering by Type ("Income Only"), Status ("Pending Only"), Category, or Date range.
   - Test the search bar (type "Vanguard" or "Payroll").
2. **Dashboard Synchronization (`/dashboard`)**:
   - Navigate to `/dashboard`.
   - Observe that **Total Operating Cash**, **Net Monthly Cash Flow**, **Pending Receivables**, and the **Cash Flow Trajectory Chart** match the transactions recorded in the ledger.
   - Click **"Reset Demo Data"** to restore initial state.
3. **Cash Flow Intelligence & Projections (`/cash-flow`)**:
   - Navigate to `/cash-flow`.
   - Inspect the **Monthly Cash Flow & Balance Ledger**: check that May closing balance matches June opening balance.
   - Inspect the **Next-30-Day Baseline Cash Projection**: review the 60-day daily run rate, expected pending impact, projected ending cash, and documented assumptions.
