# Auxible India — 3D Music-Systems Field Service Platform (PRD)

## Domain
Auxible India installs music/audio systems in Clubs, Bars, Restaurants, Home Theatres, Theatres.
Interfaces: **Owner/HR Command Center** (desktop) and **Employee** app (mobile-web).

## Roles (updated)
- **Owner** — full access (admin command center). owner@auxibleindia.com / Owner@2026
- **HR** — full access (same command center). hr@auxibleindia.com / Hr@2026
- **Employee** — mobile-web app. rahul@auxibleindia.com / Employee@123

## Design
3D immersive dark theme — obsidian #0A0A0A + audio-gold #D4AF37 + alert-red #FF3B30.
Outfit (headings) + IBM Plex Sans. Framer Motion, glassmorphism, dark Leaflet map (OSM tiles + CSS dark filter), recharts.

## Implemented (updated 2026-06-04, iteration 4)
- **Device tracking (Owner/HR)**: full device info captured on check-in & live pings (device name, type, OS, browser, platform, screen, vendor, language, user agent). Live Monitor has a Device column + Device Details dialog (current live device + device used at check-in). Attendance tab shows the check-in device.
- **Multiple check-ins per day**: attendance is now session-based — an employee can check in/out repeatedly; each session is tracked. Employee home shows live timer, Sessions Today and Worked Today; history lists every session.
- Removed the "live location & device telemetry are shared with the owner" line from the employee home.
- Get Directions uses maps.google.com `?daddr=` format.

## Implemented (2026-06-04, iteration 3)
- Auth: JWT, two staff roles (Owner + HR, both full access) + Employee. Role badge in sidebar.
- Employee app (3 tabs: Home / Updates / Alerts): animated check-in/out + live timer + history; live GPS + battery/network pings; On-Duty updates with delete; Owner alerts inbox.
- Command Center: Live Monitor (dark map + employee table: status, check-in, battery, network, live location). **Get Directions** link (Google Maps directions) per employee. Mark Red / Contact Owner → in-app alerts. Employees CRUD + **Export employee PDF report** (reportlab). Updates Feed (+ delete). Attendance. Analytics (employee/attendance/updates KPIs + Updates-by-Status pie + 7-day area chart).
- **Removed** this iteration: Job Scheduling, Venue Directory. **Renamed** Technician → Employee throughout. **Map fixed** (CartoDB→OSM dark-filtered, ResizeObserver invalidateSize).

## Testing
- iteration_3.json: backend 19/19 pass, frontend 100% (Owner+HR access, map 16 tiles, PDF download, removed routes redirect, 3 employee tabs, role gating).

## Backlog / Next
- P1: Photo/selfie proof of setup (object storage), job completion report + client e-sign.
- P1: Geofence auto-flag when employee GPS drifts from assigned site.
- P2: SMS/WhatsApp alerts (Twilio), CSV/bulk PDF export, brute-force lockout, threadpool PDF gen, harden ISO date filters.
