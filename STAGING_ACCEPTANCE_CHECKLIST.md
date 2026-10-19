# FinPilot AI — Staging Acceptance Checklist & Runbook

**Target Application:** FinPilot AI — SME Finance Copilot  
**Execution Context:** Pre-Staging Verification & Post-Deployment Acceptance  

---

## 1. Acceptance Verification Matrix

This checklist clearly distinguishes between **Automated CI/CD Tests**, **Local Live Browser Validation**, and **Hosted Staging Live Verification**.

| Test ID | Verification Item | Automated Test Coverage | Local Browser Audit | Hosted Staging Live Verification Procedure | Staging Readiness Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **AC-01** | **Route Loading**<br>Landing, Dashboard, Transactions, Cash Flow, Financing, Copilot, 404 | [`transactionController.test.ts`](file:///e:/finpilot-ai/server/src/controllers/__tests__/transactionController.test.ts)<br>[`copilotController.test.ts`](file:///e:/finpilot-ai/server/src/controllers/__tests__/copilotController.test.ts) | Verified all 7 routes via `browser_subagent` without layout collapse. | Navigate through all paths on the hosted staging domain. Confirm SPA direct access works (no 404 on refresh). | **READY** |
| **AC-02** | **Language Regression & Persistence**<br>Defaults to English, switches to Bangla, survives page refresh | [`i18n.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/i18n.test.ts) (key parity & formatting) | Toggled EN -> BN -> EN. Verified instant update & `localStorage` persistence. | On staging URL, toggle language to Bangla (`বাংলা`), refresh page, verify language stays Bangla across navbar, modals, and charts. | **READY** |
| **AC-03** | **Transaction Lifecycle**<br>Create, read, update, delete (CRUD) transactions | [`e2eFinancialWorkflow.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/e2eFinancialWorkflow.test.ts)<br>[`transactionRepository.test.ts`](file:///e:/finpilot-ai/server/src/repositories/__tests__/transactionRepository.test.ts) | Created and audited transactions in local UI; verified modal validation. | Click "Add Transaction" on staging, record $5,000 paid expense, edit to $6,000, verify update in table, delete record. | **READY** |
| **AC-04** | **Data Persistence & Restart Resilience**<br>State retained across reloads & backend restarts | [`e2eFinancialWorkflow.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/e2eFinancialWorkflow.test.ts) (Step 7 simulation) | Verified records remain across browser tab closures and reloads. | Record a unique transaction on staging, trigger redeploy or restart backend in Render, refresh staging frontend, verify record persists. | **READY** |
| **AC-05** | **Cash vs. Accrual Separation**<br>Pending AR/AP never distorts operating cash balance | [`financialCalculations.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/financialCalculations.test.ts)<br>[`e2eFinancialWorkflow.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/e2eFinancialWorkflow.test.ts) | Verified metrics cards show paid cash separate from pending invoices. | Add $20,000 Pending Income on staging. Confirm "Total Operating Cash" does NOT change, while "Pending Receivables" increases by $20,000. | **READY** |
| **AC-06** | **Dashboard & Forecast Dynamic Recalculation**<br>Balances, runway, and risk alerts update on mutations | [`financialService.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/financialService.test.ts)<br>[`forecastService.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/forecastService.test.ts) | Verified 30-day forecast chart and alerts list re-render reactively. | Add high-value expense; verify Dashboard Operating Cash decreases, Runway weeks decrease, and Deficit Alert triggers. | **READY** |
| **AC-07** | **AI Copilot Live Reasoning**<br>Grounded in backend financial context without hallucinations | [`copilotService.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/copilotService.test.ts) (prompt construction & grounding) | Verified UI chat interface, prompt chips, and message history rendering. | On staging Copilot page, send: *"What is my current cash runway and net cash flow?"* Verify Gemini quotes exact numbers from staging database. | **PENDING LIVE STAGING** *(Requires user API key configured on host)* |
| **AC-08** | **Financing Assessment Integrity**<br>Uses actual ledger figures, labels options as illustrative | [`financingService.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/financingService.test.ts) | Verified form inputs, verified vs stated metrics, and illustrative tags. | Submit staging financing form with $30,000 request. Verify match results cite actual average revenue and show disclaimer badges. | **READY** |
| **AC-09** | **Rate Limiting & Abuse Prevention**<br>Returns HTTP 429 when limits are exceeded | [`securityAndRateLimiter.test.ts`](file:///e:/finpilot-ai/server/src/middleware/__tests__/securityAndRateLimiter.test.ts) | Verified headers `X-RateLimit-*` and `Retry-After` on local responses. | Send rapid automated requests (curl script) exceeding 20 req/min to staging `/api/copilot/chat`. Verify HTTP 429 received. | **READY** |
| **AC-10** | **Input Validation & Malformed Payload Rejection**<br>Rejects invalid amounts, non-finite values, and malformed IDs | [`securityAndRateLimiter.test.ts`](file:///e:/finpilot-ai/server/src/middleware/__tests__/securityAndRateLimiter.test.ts) | Verified form rejects negative numbers, empty dates, and oversized texts. | Send `PUT /api/transactions/<invalid-id>` or `{}` on staging. Confirm HTTP 400 with clean JSON error response. | **READY** |
| **AC-11** | **Zero Secret Exposure**<br>No API keys or DB credentials in client bundles or API payloads | Verified `client/dist` grep and `sanitizeSecrets` in `errorHandler.ts`. | Inspected dev tools network tab and DOM; zero secrets present. | View staging page source and search for `mongodb+srv` or `AIzaSy`. Confirm zero credentials exist in frontend JavaScript chunks. | **READY** |
| **AC-12** | **CORS Security Enforcement**<br>Permits staging frontend origin and blocks unauthorized origins | [`app.ts`](file:///e:/finpilot-ai/server/src/app.ts) production CORS logic | Verified local loopbacks pass in dev; loopbacks disabled in prod. | Execute `curl -H "Origin: https://malicious-site.com" -I https://<staging-api>/api/health`. Verify `Access-Control-Allow-Origin` is NOT returned. | **READY** |
| **AC-13** | **Degraded Mode & Safe Error Handling**<br>Clean non-sensitive 503 errors on DB/AI failure | [`connection.test.ts`](file:///e:/finpilot-ai/server/src/db/__tests__/connection.test.ts)<br>[`copilotService.test.ts`](file:///e:/finpilot-ai/server/src/services/__tests__/copilotService.test.ts) | Verified server boots and serves health checks even when DB is offline. | Check `/api/health` and `/api/copilot/status` on staging with unconfigured DB or key. Verify clean 503 without process crash or stack trace. | **READY** |

---

## 2. Live Acceptance Testing Execution Script

Once the application is deployed to your staging environment, execute this standardized test sequence:

### Step 1: Health Check Handshake
```bash
# Verify backend is running and connected to MongoDB Atlas
curl -s -i https://<your-backend-staging-url>/api/health
```
- **Expected Status:** `HTTP/1.1 200 OK`
- **Expected Payload:** `"status": "ok"`, `"database": { "status": "connected", "configured": true }`

---

### Step 2: CORS Preflight & Security Headers Check
```bash
# Verify CORS allows staging frontend origin and returns defensive headers
curl -s -I -H "Origin: https://<your-frontend-staging-url>" https://<your-backend-staging-url>/api/health
```
- **Expected Headers:**
  - `Access-Control-Allow-Origin: https://<your-frontend-staging-url>`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Cache-Control: no-store...`
  - `X-Powered-By`: **Absent**

---

### Step 3: Unauthorized Origin Rejection Check
```bash
# Verify CORS blocks untrusted origins
curl -s -I -H "Origin: https://unauthorized-domain.com" https://<your-backend-staging-url>/api/health
```
- **Expected Outcome:** `Access-Control-Allow-Origin` header is **NOT** present in the response.

---

### Step 4: Live Gemini Copilot Conversation Verification
1. Open `https://<your-frontend-staging-url>/copilot` in your browser.
2. Ensure the Copilot Status indicator displays: **"Active (gemini-3.5-flash)"** with a green badge.
3. Type: *"What is my current operating cash and burn rate?"*
4. Click Send.
5. **Expected Outcome:** Gemini responds within 2–5 seconds with an analytical breakdown matching the exact current operating cash figure from the staging MongoDB database.

---

### Step 5: Live Bangla Mode Acceptance
1. In the top navigation, click the Language Selector and choose **বাংলা (Bangla)**.
2. Confirm that every route title, KPI card, risk alert, and navigation button transitions to natural Bangla.
3. Go to the Copilot chat and ask: *"আমার বর্তমান ক্যাশ রানওয়ে কত দিন?"*
4. **Expected Outcome:** Gemini answers in natural, professional Bangla while citing the verified ledger figures.
5. Refresh the browser page (`Ctrl+F5`).
6. **Expected Outcome:** The page reloads in Bangla without reverting to English.
