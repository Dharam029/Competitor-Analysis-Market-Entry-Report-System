# CompetitorIQ — Competitor Analysis & Market Entry Report System

CompetitorIQ is a modern, premium, real-time intelligence platform designed to map competitors, analyze SWOT matrices, compare pricing structures, assess market entry risks, and compile professional reports for stakeholders. 

Built with a robust Express + SQLite backend and a premium, responsive vanilla CSS/JS frontend, it supports real-time multi-user synchronization, granular role-based access control, and seamless PDF/Excel data export.

---

## 🚀 Key Features

*   **Executive Dashboard**: Modern visual hub featuring dynamic metrics and interactive Chart.js visualizations tracking market share, revenue distribution, and risk/opportunity severity counts.
*   **Market Data Management**: Comprehensive cataloging of geographic markets, industries, total addressable market size (TAM), annual growth rates (CAGR), and target demographics.
*   **Competitor Mapping**: Interactive profiles including founding history, original region, financial tracking, market share share, and core descriptions.
*   **SWOT Analysis Engine**: Interactive quadrant analysis tool for mapping Strengths, Weaknesses, Opportunities, and Threats for individual competitors.
*   **Pricing Comparison Matrix**: Multi-product catalog view that visualizes budget, mid-range, and premium competitor offerings with automated average pricing and pricing corridor analysis.
*   **Live Comparison Module**: Real-time side-by-side competitor analysis leveraging WebSocket synchronization.
*   **Risk & Opportunity Tracker**: Dynamic severity-based tagging (Low, Medium, High) for mapping market-wide risks and opportunities.
*   **Strategic Entry Planning**: Strategic models detailing mode of entry (Joint Venture, Greenfield, Acquisition, Franchise, Direct Export), estimated costs, timelines, and expected return on investment (ROI).
*   **Report Generation & Exports**: Version-controlled report compiler equipped with single-click PDF generation (jsPDF) and Excel exporting (SheetJS).
*   **Granular Authentication & RBAC**: Strict JWT-based session security backing three distinct user roles:
    *   **Admin**: Complete system control, user management, and deletion capability.
    *   **Analyst**: Full read/write data capture, SWOT modeling, and strategic compilation.
    *   **Viewer**: Read-only oversight dashboard.

---

## 🛠️ Tech Stack

### Frontend
*   **Structure & Logic**: HTML5, Vanilla JavaScript (ES6 IIFE Modules)
*   **Styling**: Premium Custom Vanilla CSS (featuring fluid grids, glassmorphism UI, elegant micro-animations, and unified HSL color tokens)
*   **Charts**: Chart.js v4.4
*   **Real-time Communication**: Socket.io Client v4.8
*   **Export Engines**: jsPDF (PDF generator) & SheetJS (Excel workbook compiler)

### Backend
*   **Runtime**: Node.js (Express framework)
*   **Database**: SQLite powered in-memory by `sql.js` (WebAssembly SQLite build) with auto-seeding and persistent file backups.
*   **Security**: JSON Web Tokens (`jsonwebtoken`)
*   **Real-Time Sync**: Socket.io Server v4.8

---

## 📂 Project Architecture

The codebase is split cleanly into decoupled client and server environments:

```
Competitor-Analysis-Suite/
├── backend/                  # Express server & Sqlite storage
│   ├── data/                 # SQLite database storage directory
│   │   └── competitoriq.db   # Automatically generated database backup file
│   ├── src/
│   │   ├── middleware/       # JWT Authentication & RBAC filters
│   │   ├── routes/           # REST endpoints
│   │   ├── db.js             # Database schemas & queries
│   │   └── seed.js           # Automated mock data seeder
│   ├── server.js             # Express startup & Socket.io server
│   └── package.json
│
└── frontend/                 # Client-side static resources
    ├── css/
    │   └── styles.css        # Premium custom CSS design system
    ├── js/
    │   ├── api.js            # Unified REST Client
    │   ├── socket.js         # Real-time WebSocket handlers
    │   ├── auth.js           # JWT Session & RBAC authority
    │   ├── app.js            # Main controller, router & global helpers
    │   └── [pages].js        # Module-specific screen handlers (dashboard, markets, etc.)
    └── index.html            # Single Page Application (SPA) entrypoint
```

---

## ⚡ Getting Started

Follow these steps to run CompetitorIQ locally on your system:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v16.0.0 or higher recommended).

### 2. Installation
Navigate to the `backend/` directory and install the necessary dependencies:
```bash
cd backend
npm install
```

### 3. Running the Server
Start the development server:
```bash
npm start
```
Upon launching, the backend will automatically:
1. Initialize the SQLite database.
2. Seed the database with high-quality demo data (if empty).
3. Open a HTTP listener on `http://localhost:3000`.
4. Initialize the WebSocket pipeline.

### 4. Open the Application
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 Demonstration Accounts

You can log in to the application using any of the following pre-configured user credentials:

| Username | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **Admin** | Full system control + deletion permissions |
| **analyst** | `analyst123` | **Analyst** | Add, edit, and link markets, competitors, SWOT and reports |
| **viewer** | `viewer123` | **Viewer** | Read-only access to all dashboards and reports |

---

## 🔒 Security & Best Practices
*   **JWT Sessions**: Authorization tokens are passed securely via standard HTTP Headers (`Authorization: Bearer <token>`) and validated statelessly.
*   **Foreign Key Constraints**: The database model implements robust cascading constraints (`ON DELETE CASCADE` / `ON DELETE SET NULL`) ensuring complete data integrity.
*   **Git Ignored Assets**: Crucial secrets (`.env`) and local environments (`node_modules`) are fully configured in the `.gitignore` profiles to prevent accidental credential leakage.
