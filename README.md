# CurtainCall: Online Movie Ticket Booking System

A production-grade, full-stack movie ticket booking platform with role-based access control.

- **Frontend:** React + Vite (SPA, hash routing, no extra UI deps)
- **Backend:** Node + Express + MongoDB (Mongoose), JWT auth, zod validation
- **Roles:** Customer, Theatre Owner, Administrator

## Architecture

```
movie-ticket-booking/
├─ src/                 # React frontend
│  ├─ api.js            # API client (tokens + transparent refresh)
│  ├─ lib.js            # shared helpers + React context
│  ├─ App.jsx           # routing, session, role-aware nav
│  ├─ pages.jsx         # public + customer pages
│  └─ Dashboard.jsx     # owner/admin console (role-scoped tabs)
└─ server/              # Express + MongoDB API
   └─ src/
      ├─ config/        # env + db connection
      ├─ constants/     # roles + capabilities (RBAC)
      ├─ models/        # Mongoose schemas
      ├─ middleware/    # auth, RBAC, validation, errors
      ├─ validation/    # zod schemas
      ├─ controllers/   # request handlers
      ├─ routes/        # route tables
      └─ seed.js        # demo data seeder
```

## Prerequisites
- Node 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas URI.
  Seat booking uses a transaction when the server supports it (replica set / Atlas)
  and transparently falls back to a safe non-transactional path on standalone Mongo.

## Run it

**1. Backend**
```
cd server
npm install
copy .env.example .env     # then edit secrets / MONGO_URI as needed
npm run seed               # loads demo movies, theatres, shows, admin + owner
npm run dev                # API on http://localhost:4000
```

**2. Frontend** (in a second terminal, from the project root)
```
npm install
npm run dev                # open the printed URL (Vite proxies /api to :4000)
npm run build              # production build in dist/
```

## Demo logins
| Role | Email | Password |
|---|---|---|
| Administrator | `admin@cinema.com` | `Admin@123` |
| Theatre owner | `owner@cinema.com` | `Owner@123` |
| Customer | create one via **Create account** | 8+ chars, upper, lower, number |

New sign-ups can choose **Customer** or **Theatre owner**. Admin accounts are seed/admin-promoted only.

## Role-based access control

Permissions are enforced on the server (never trust the client). Each role maps to
capabilities in `server/src/constants/roles.js`:

| Capability | Customer | Theatre owner | Admin |
|---|:---:|:---:|:---:|
| Browse catalogue, book/cancel own seats | ✅ | ✅ | ✅ |
| Manage **own** theatres, screens, shows, prices | — | ✅ | ✅ |
| View / cancel bookings for **own** theatres | — | ✅ | ✅ |
| Manage the movie catalogue | — | — | ✅ |
| Manage all theatres & reassign ownership | — | — | ✅ |
| Manage users & roles | — | — | ✅ |
| Read the activity log | — | — | ✅ |

Owner scoping is tested end-to-end: an owner cannot see, edit, or take bookings for
another owner's theatre; only admins have platform-wide reach.

## Security notes (production grade)
- Passwords hashed with bcrypt (cost 12); never stored or returned in plain text.
- JWT access + refresh tokens; access tokens are short-lived and refreshed transparently.
- Login lockout after repeated failures; auth endpoints rate-limited.
- All input validated with zod; a global soft rate limit, `helmet`, and CORS allow-list.
- Seat conflicts re-checked atomically at confirm time to prevent double-booking.
- Set strong `JWT_*` secrets and your real `MONGO_URI`/`CORS_ORIGIN` in production,
  and always serve over HTTPS.

## How it maps to the SRS
| SRS section | Where |
|---|---|
| 5.1 Registration & login | `authController`, `authRoutes`, login lockout + rate limiting |
| 5.2 Profile | `profileController`, `Profile` page |
| 5.3 Catalogue & search | `movieController` (keyword/genre/language/status), `Home`, `Movies`, `MovieDetail` |
| 5.4 Theatres & shows | `theatreController`, `showController`, owner-scoped management |
| 5.5 Seats & booking | `bookingController` (atomic conflict check), `Seats`, `Ticket` |
| 5.6 History & cancellation | `MyBookings`, 2-hour cancellation window |
| 5.7 Admin + Owner operations | `Dashboard.jsx` + admin/owner routes, activity log |
| 6.x Non-functional | validation, rate limits, RBAC, responsive UI, keyboard focus styles |
| 7.2 Internationalisation | dates, times, currency use the browser's regional settings |

## Notes
- Payment and email notifications are marked "future" in the SRS and are not included.
- To reset the demo data at any time: `cd server && npm run seed`.
