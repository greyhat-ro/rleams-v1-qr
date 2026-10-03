# RLEAMS v1: Robotics Lab Equipment & Asset Management System

Track robots, sensors, controllers and tools in a robotics lab: who has what, where it lives, what is overdue, and what is in maintenance.

**v1 is the portfolio edition.** It runs entirely on free tiers (GitHub Pages + Supabase) with no server to maintain. v2 is the lab-grade version (see roadmap).

## Features
- Asset inventory with tag, category, location and status (Available, Checked out, Maintenance, Retired)
- Check-out / check-in with person and due date, with overdue detection
- Search and filter by category and status
- Activity log of every change
- CSV export
- **QR workflow:** scan a label to add an asset (tag auto-filled), lend it (checkout form opens), or return it; print QR labels per asset
- Responsive, keyboard-friendly, light/dark theme
- **Two modes, same code:** demo mode (browser localStorage, zero setup) and live mode (Supabase Postgres)

## Stack
| Layer | Choice | Cost |
|---|---|---|
| Frontend | Vanilla HTML, CSS and JavaScript (no build step) | Free |
| Hosting | GitHub Pages | Free |
| Database + API | Supabase (Postgres + auto REST) | Free tier |

## Project structure
```
rleams/
├── index.html   markup
├── style.css    styles (light/dark theme)
├── app.js       data layer (localStorage / Supabase), rendering, events
├── schema.sql   Supabase tables, constraints, RLS, sample data
└── README.md
```

## Run it
**Demo mode:** open `index.html`. Data is saved in your browser.

**Live mode:**
1. Create a free project at supabase.com.
2. Run `schema.sql` in the SQL Editor.
3. In `app.js` (top of the file), set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Project Settings > API). The header badge changes to "live · Supabase".
4. Create the admin account: Authentication > Users > Add user (email + password, tick Auto Confirm). Then Authentication > Sign In / Providers > turn **off** "Allow new users to sign up" so only accounts you create can log in.
5. Open the app and sign in with that account.
6. Push to GitHub, then Settings > Pages > deploy from `main`.

## QR workflow
1. **Print labels:** click **QR** on any asset row, then **Print label**. The code is a link like `https://you.github.io/rleams/?tag=RB-014`.
2. **Register a new asset (admin):** click **Scan QR** (or **Scan** next to the tag field) and scan an unregistered label. The Add form opens with the tag filled in; the admin completes the rest.
3. **Lend (student):** scan the label. If the asset is available, the checkout form opens for the person's name and due date.
4. **Return:** scan a checked-out asset and confirm to check it in.
5. Phone's native camera also works: the label link opens the app and runs the same flow. USB handheld scanners work through the manual tag box.

Camera access needs HTTPS (GitHub Pages is fine) or `localhost`.

## Design notes (talking points for interviews)
- A small `store` data layer exposes `load / upsert / remove`; swapping localStorage for Supabase changes nothing in the UI code.
- Status is constrained at the database level with a `check` constraint, and asset tags are unique.
- Every mutation writes an `activity` row, giving an audit trail.
- User-supplied text is HTML-escaped before rendering.
- The app is gated behind Supabase Auth; the anon key is public by design, and Row Level Security restricts all tables to signed-in users. Demo mode uses a fixed demo login that is not real security.

## Roadmap (v2)
Authentication and roles (admin, technician, student), per-user RLS, QR/barcode labels, reservations and calendar, maintenance schedules and calibration reminders, photo uploads, email alerts, and a proper backend (FastAPI + PostgreSQL) with tests and CI.

## License
MIT
