Start Dev Environment (optimized)

This folder contains helper scripts for local development.

start-dev-environment.ps1
- Purpose: Start DB (Docker) if needed, install deps, launch backend/frontend dev servers in separate windows.

Options:
- `-NoInstall` : skip `npm install`.
- `-DbWaitSeconds <n>` : seconds to wait for DB readiness (default 60).
- `-UseKube` : use Kubernetes port-forwarding for Postgres (script will prompt; you must run port-forward manually).
- `-RunMigrations` : run `npm run db:migrate` after DB is ready.
- `-OpenBrowser` : open `http://localhost:3000` after servers start.

Examples:

# Default behavior (start docker Postgres if needed, install deps)
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-environment.ps1

# Skip npm install and open browser when ready
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-environment.ps1 -NoInstall -OpenBrowser

# Use Kubernetes port-forward (run port-forward separately first)
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-environment.ps1 -UseKube
