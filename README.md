# AERIS-1 Engineering Workbench

A React + Vite dashboard for aerospace engineering planning and mission analysis for the AERIS-1 program.

## Live app

Production deployment: https://aeris-1-engineering-workbench.vercel.app/

## Overview

This application provides a mission engineering workstation with:

- engineering summary and status overview
- requirements and traceability matrix
- mass and power budget tracking
- environmental and telemetry dashboards
- risk register and validation workflow
- mission simulation and reporting tools

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide icons

## Local Setup

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run the app locally

```bash
npm run dev
```

The app will be available at:

- http://localhost:3000/

### Production build

```bash
npm run build
```

### Lint / type-check

```bash
npm run lint
```

## Notes

- The project uses Vite on port 3000.
- Some package versions were aligned for compatibility during local setup.
- The app is designed to work as a single-page engineering dashboard without a backend service.
