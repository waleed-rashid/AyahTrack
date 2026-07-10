# AyahTrack

AyahTrack is a full-stack Hifz tracking platform designed to help Quran students record daily memorization, revision, lesson timing, consistency, and long-term progress. The app combines a clean React dashboard, a TypeScript/Express API, PostgreSQL-backed user data, Quran metadata-based progress calculations, achievement badges, and an optional ESP32 OLED companion device for timing study sessions.

The goal of AyahTrack is to make memorization progress easier to understand at a glance while preserving the details that matter to serious students: sabaq, sabaq para, revision, juz progress, surah progress, daily consistency, and personalized lesson recommendations.

## Highlights

- Built and deployed a production-style full-stack application with React, Node.js, Express, TypeScript, PostgreSQL, Prisma, Vercel, Render, Supabase, and Resend.
- Implemented account authentication with JWT, bcrypt password hashing, protected routes, persistent login, and email verification during signup.
- Designed a responsive dashboard with progress stats, recent entries, streak tracking, weekly/monthly activity history, dark mode, undo notifications, and achievement badges.
- Used Quran metadata and 15-line mushaf layout data to calculate progress and ideal daily lessons more accurately than simple ayah counting.
- Added an ESP32 + OLED hardware integration that displays ideal lessons, records study session durations, and uploads timing data to the backend.
- Structured the project into separate `client`, `server`, and `esp32` folders for clear frontend, backend, and device boundaries.

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript / JSX
- React Router
- Axios
- CSS and inline React styling

**Backend**
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT authentication
- bcrypt password hashing
- Resend email API

**Database**
- PostgreSQL
- Supabase
- Prisma migrations

**Deployment**
- Vercel for the frontend
- Render for the backend
- Supabase for the production database
- Resend for email verification

**Hardware**
- ESP32
- Arduino C++
- SSD1306 OLED display
- Button-controlled session timer

## Core Features

### User Accounts
- Secure signup and login
- Email verification before account creation
- Password hashing with bcrypt
- JWT-based authentication
- Protected dashboard routes
- Persistent login state

### Hifz Dashboard
- Personalized greeting and dashboard title
- Daily entry workflow for sabaq, sabaq para, revision, and optional notes
- Independent entry sections so users can add only what they completed
- Recent entries panel showing dates, lesson ranges, notes, and session times
- Undo flow for recently saved entries
- Dark mode with persistent visual theme

### Progress Tracking
- Ajzaa memorized
- Surahs memorized
- Current surah progress
- Current juz progress
- Estimated juz completion date
- Current memorization point
- Progress updates based on sabaq entries and onboarding baseline

### Lesson Recommendations
- Personalized "Ideal for Today" recommendations
- User-configurable average lesson lengths
- Sabaq recommendations based on current memorization point
- Sabaq para recommendations based on recent sabaq history
- Revision recommendations based on memorized material
- Calculations backed by Quran and mushaf metadata

### Consistency and Motivation
- Current streak and longest streak
- Weekly activity graph
- Full weekly activity history organized by week
- Monthly activity graph with per-day entry counts
- Achievement badges for milestones such as first entry, streaks, juz completion, surah completion, and revision milestones
- Badge unlock notifications

### ESP32 Companion Device
- Displays ideal lessons on a 128x64 OLED screen
- Button controls for sabaq, sabaq para, and revision timing
- Uploads session durations to the backend
- Uses per-user device tokens to associate hardware data with the correct account

## Project Structure

```txt
hifz-tracker/
├── client/                # React/Vite frontend
│   ├── public/            # Public assets and favicon
│   └── src/
│       ├── api/           # Axios API client
│       ├── auth/          # Protected/public route helpers
│       ├── data/          # Frontend Quran metadata
│       ├── pages/         # Login and dashboard pages
│       └── utils/         # Coverage/date helpers
├── server/                # Express/TypeScript backend
│   ├── data/mushaf/       # Quran and mushaf metadata
│   ├── prisma/            # Prisma schema and migrations
│   └── src/
│       ├── routes/        # Auth, dashboard, entry, and device routes
│       ├── middleware/    # JWT auth middleware
│       ├── mushafLayout.ts
│       └── quranProgress.ts
├── esp32/                 # ESP32 OLED timer firmware
└── docs/                  # Supporting project documentation
```

## Getting Started

AyahTrack is deployed and can be used directly in the browser. Users do not need to install Node.js, run terminal commands, or configure a database.

```txt
Live App: https://ayahtrack.vercel.app
Backend API: https://ayahtrack-server.onrender.com
```

To try the app as a user:

1. Open the deployed frontend URL.
2. Create an account.
3. Verify your email.
4. Enter your current memorization progress.
5. Start tracking daily sabaq, sabaq para, revision, notes, and activity.

## ESP32 Setup

The ESP32 firmware lives in:

```txt
esp32/hifz_oled_timer/
```

Create a private `hifz_config.h` from the example file:

```txt
hifz_config.example.h -> hifz_config.h
```

Configure:

```cpp
#define WIFI_SSID "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"
#define API_BASE_URL "https://your-render-backend-url.onrender.com"
#define DEVICE_TOKEN "the-user-device-token"
```

`hifz_config.h` should never be committed to GitHub.

## Security Notes

- Passwords are stored as bcrypt hashes.
- Auth uses signed JWTs.
- Email verification is required before account creation.
- Device access uses per-user device tokens.
- Secrets are stored in environment variables, not source code.
- Private ESP32 credentials are excluded from version control.

## What I Learned

This project strengthened my experience with full-stack architecture, production deployment, authentication flows, database modeling, Prisma migrations, API design, stateful React interfaces, data-driven progress calculations, and hardware-to-web integration. It also required balancing user experience with technical correctness, especially around Quran progress calculations, onboarding state, undo behavior, and personalized recommendations.

## Future Improvements

- Add password reset emails.
- Add a user-facing ESP32 setup panel.
- Add more detailed analytics for revision consistency.
- Add teacher/parent viewing modes.
- Add automated test coverage for progress calculations and API routes.
- Improve accessibility and keyboard navigation across all custom controls.
