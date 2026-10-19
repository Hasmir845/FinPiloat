# FinPilot AI — Staging Deployment Guide

**Target Application:** FinPilot AI — SME Finance Copilot  
**Version:** 0.1.0  
**Stack:** React 18 + TypeScript (Vite) / Express 4 + Node.js 20+ / MongoDB Atlas / Google Gemini  

---

## 1. Architecture & Deployment Specifications

| Component | Framework / Technology | Build Command | Runtime / Start Command | Output / Entry Point |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | React 18.3, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4 | `npm run build` (in `client/`) | Static asset hosting (Vercel, Netlify, Cloudflare Pages, Nginx) | `client/dist/` (`index.html`, assets, `_redirects`) |
| **Backend** | Node.js 20+, Express 4.21, TypeScript 5.6, Zod 3.23 | `npm run build` (in `server/`) | `npm run start` (in `server/`) | `server/dist/index.js` (listening on `process.env.PORT`) |
| **Database** | MongoDB Atlas (Cluster 6.x+) | Automated index creation & seed on boot | Managed cloud replica set | TLS/SSL SRV connection string |
| **AI Intelligence**| Google Gemini (`gemini-3.5-flash` / `@google/genai`) | Backend-only SDK client | Server-to-Google AI Studio HTTPS API | Zero client-side API exposure |

---

## 2. Environment Variables Matrix

> [!CAUTION]
> Never hardcode, commit, or print secret values. All production and staging credentials must be supplied via the hosting provider's encrypted environment settings.

### 2.1 Backend Environment Variables (`server`)

| Variable Name | Required | Default / Example Value | Description | Sensitivity |
| :--- | :---: | :--- | :--- | :---: |
| `NODE_ENV` | **Yes** | `production` | Enforces production security headers, strips stack traces, and tightens CORS. | Public |
| `PORT` | **Yes** | `10000` (auto-assigned by host) | Port on which Express binds. Managed hosts (Render, Railway) inject this automatically. | Low |
| `CLIENT_ORIGIN` | **Yes** | `https://staging-finpilot.vercel.app` | Comma-separated list of permitted frontend origins for CORS preflight and access control. | Low |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority` | Connection URI for MongoDB Atlas staging database cluster. | **CRITICAL SECRET** |
| `MONGODB_DB_NAME` | No | `finpilot` | Target MongoDB database name. | Low |
| `GEMINI_API_KEY` | **Yes** | `<Google_AI_Studio_API_Key>` | API key for Gemini model inference. Read strictly on the backend. | **CRITICAL SECRET** |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | Gemini model name identifier supported by your API key. | Low |

### 2.2 Frontend Environment Variables (`client`)

| Variable Name | Required | Default / Example Value | Description | Sensitivity |
| :--- | :---: | :--- | :--- | :---: |
| `VITE_API_URL` | **Yes** | `https://finpilot-server-staging.onrender.com/api` | Public HTTPS base URL of the staging backend API. Embedded during build. | Public |
| `VITE_APP_NAME` | No | `"FinPilot AI"` | Branding title displayed in navbar and HTML title tags. | Public |

---

## 3. Recommended Hosting Providers & Free-Tier Cost Analysis

### 3.1 Frontend Hosting: Vercel (Recommended)
- **Why Vercel:** Native support for Vite SPAs, automated HTTPS, global edge CDN, and Git-driven deployments.
- **Routing Configuration:** Handled via [`client/vercel.json`](file:///e:/finpilot-ai/client/vercel.json) (SPA rewrite rule forwarding all routes to `/index.html`).
- **Free Tier Allowance (Hobby Plan):**
  - 100 GB monthly bandwidth.
  - Unlimited automated previews and custom domains with free SSL certificates.
  - **Estimated Cost: $0.00 / month.**

### 3.2 Backend Hosting: Render (Recommended)
- **Why Render:** Native Node.js long-running process support, automatic `PORT` assignment, zero-downtime deploys, and automated health checks (`/api/health`).
- **Blueprint Support:** Handled via [`render.yaml`](file:///e:/finpilot-ai/render.yaml) located in repository root.
- **Tier Comparison:**
  - **Free Tier:** 512 MB RAM, shared CPU. Spins down after 15 minutes of inactivity; initial request encounters a 30–50 second cold start.
  - **Starter Plan ($7.00 / month):** Recommended for active staging and live demos. Zero cold starts, 24/7 uptime, 512 MB RAM, dedicated compute.
  - **Estimated Cost: $0.00 / month (Free Tier) or $7.00 / month (Starter Plan).**

### 3.3 Database: MongoDB Atlas
- **Tier:** **M0 Free Sandbox** (512 MB storage, shared RAM, replica set).
- **Network Security:** Requires configuring IP Access List in Atlas Network Access. For serverless/cloud backend hosting with dynamic outbound IPs (e.g., Render Free), configure `0.0.0.0/0` (allow access from anywhere) paired with a high-entropy database password.
- **Estimated Cost: $0.00 / month.**

### 3.4 AI Inference: Google Gemini API (Google AI Studio)
- **Tier:** Pay-As-You-Go with Free Tier allotment (up to 15 requests/minute on Gemini 1.5/2.0 Flash).
- **Abuse Defense:** Backend enforces in-memory rate limiting (20 requests/minute per IP) to prevent quota exhaustion.
- **Estimated Cost: $0.00 / month within free quota.**

---

## 4. Step-by-Step Staging Deployment Instructions

### Phase A: MongoDB Atlas Staging Database Setup
1. Log into your [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Create an **M0 Free Cluster** in your preferred cloud provider and region (e.g., AWS us-east-1 or Frankfurt).
3. Under **Database Access**, create a database user (e.g., `finpilot_staging_user`) with read and write permissions to the database. Generate a strong, high-entropy password.
4. Under **Network Access**, add an IP Access List entry allowing your backend host IP (or `0.0.0.0/0` if deploying on dynamic-IP hosts like Render).
5. Click **Connect** -> **Drivers** -> **Node.js** and copy the connection string:
   ```text
   mongodb+srv://finpilot_staging_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Phase B: Deploying Backend to Render
1. Log into [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your Git repository (`finpilot-ai`).
4. Configure service parameters:
   - **Name:** `finpilot-server-staging`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/api/health`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `MONGODB_DB_NAME`: `finpilot`
   - `GEMINI_API_KEY`: `<Your Google AI Studio API Key>`
   - `GEMINI_MODEL`: `gemini-3.5-flash`
   - `CLIENT_ORIGIN`: `http://localhost:5173` *(Temporary placeholder; will update in Phase D)*
6. Click **Create Web Service**. Wait for the build and deployment to complete.
7. Test backend health: Open `https://<your-render-service-name>.onrender.com/api/health` in your browser. Expected output:
   ```json
   {
     "status": "ok",
     "service": "finpilot-server",
     "version": "0.1.0",
     "database": {
       "status": "connected",
       "databaseName": "finpilot",
       "configured": true
     }
   }
   ```

### Phase C: Deploying Frontend to Vercel
1. Log into [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import the `finpilot-ai` repository.
4. In the project configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `client`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://<your-render-service-name>.onrender.com/api`
   - `VITE_APP_NAME`: `FinPilot AI`
6. Click **Deploy**. Vercel will bundle the React application and deploy to edge servers.
7. Note the generated staging URL (e.g., `https://finpilot-ai-staging.vercel.app`).

### Phase D: Finalizing CORS Handshake
1. Return to the Render dashboard for `finpilot-server-staging`.
2. Navigate to **Environment**.
3. Update `CLIENT_ORIGIN` to the exact Vercel staging URL:
   ```text
   CLIENT_ORIGIN=https://finpilot-ai-staging.vercel.app
   ```
4. Save changes. Render will automatically redeploy the backend with the new origin whitelist.

---

## 5. Rollback & Disaster Recovery Procedures

1. **Instant Frontend Rollback:** In the Vercel dashboard under Deployments, click on any previous successful deployment and select **Instant Rollback**.
2. **Backend Rollback:** In Render under Deploys, select a previous commit and click **Rollback to this deploy**.
3. **Database Degraded Mode Resilience:**
   - If MongoDB Atlas becomes unreachable, the server does not crash. It automatically enters degraded mode, serving health checks with `"status": "degraded"` and returning HTTP `503 Service Unavailable` with clean user-facing error messages on database endpoints.
4. **AI Fallback Resilience:**
   - If the Gemini API key expires or is throttled by Google upstream, `/api/copilot/chat` gracefully returns structured HTTP 503 error responses without leaking backend stack traces.
