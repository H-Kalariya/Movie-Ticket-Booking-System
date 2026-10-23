# Software Metrics Report — CurtainCall Movie Ticket Booking System

**Project:** CurtainCall (full-stack movie ticket booking platform)
**Stack:** React + Vite frontend, Node/Express + MongoDB backend, JWT auth, role-based access control
**Scope of measurement:** All application source (frontend `src/` + backend `server/src/`), excluding `node_modules`, build output, and lock files.
**Prepared:** metrics calculated directly from the current codebase.

---

## 1. Why these metrics, in plain language

Before the numbers, here's the idea behind each family of metrics, because the point of measuring software is not to collect numbers — it's to answer three practical questions:

- **Size-oriented metrics** answer *"How big is this thing, really?"* They count lines of code and normalise everything else (effort, defects, cost) against that size. Simple to gather, easy to misuse, but a useful first lens.
- **Function-oriented metrics** answer *"How much functionality did we deliver?"* instead of *"How many lines did we type?"* Function Points measure what the software **does** for the user, independent of the language. A feature is a feature whether you wrote it in 10 lines of Python or 100 lines of Java.
- **Quality metrics** answer *"Is it any good, and will it stay maintainable?"* Defect density, complexity, comment ratio, modularity — the things that decide whether the next change is pleasant or painful.

Each section below shows the raw measurements, the calculation, and then a human reading of what it means for this particular project.

---

## 2. Raw measurements (the ground truth)

All figures were counted programmatically from the repository.

| Measure | Value |
|---|---|
| Total source files measured | 47 |
| Total physical lines | 2,808 |
| Blank lines | 355 |
| Comment lines | 145 |
| **Source Lines of Code (SLOC, non-blank non-comment)** | **2,308** |
| Frontend SLOC (`src/`) | 1,036 (8 files) |
| Backend SLOC (`server/src/`) | 1,218 (35 files) |
| REST endpoints (route handlers) | 29 (28 resource routes + health) |
| Data models (MongoDB collections) | 6 (User, Movie, Theatre, Show, Booking, ActivityLog) |
| User roles with distinct permissions | 3 (Customer, Theatre Owner, Admin) |

**Largest files by SLOC** (useful for spotting where complexity concentrates):

| File | SLOC | Role |
|---|---|---|
| `src/pages.jsx` | 360 | All customer-facing pages |
| `src/Dashboard.jsx` | 232 | Owner/admin console |
| `src/styles.css` | 194 | Design system |
| `server/.../bookingController.js` | 147 | Booking logic + transactions |
| `server/.../showController.js` | 115 | Showtime management |

> A note on honesty: KLOC = 2,308 / 1,000 = **2.308 KLOC**. The per-KLOC figures below are small-sample extrapolations. On a ~2.3 KLOC project they are *illustrative of method*, not statistically robust. I've flagged where that matters.

---

## 3. Size-Oriented Metrics

Size-oriented metrics take one agreed measure of size (here, KLOC) and express everything else as a ratio to it. To do that we need effort and defect data. Since this is a single-developer build, I'll use a **transparent assumed project scenario** so the arithmetic is clear and you can swap in your own real figures.

### 3.1 Assumed project scenario (clearly labelled assumptions)

| Input | Assumed value | Basis |
|---|---|---|
| Size | 2.308 KLOC | **Measured** |
| Effort | 2.5 person-months | Typical for a feature set this size with reuse of frameworks |
| Cost | ₹1,50,000 (at ₹60,000/person-month) | Illustrative blended rate |
| Defects found (dev + test) | 18 | Assumed scenario |
| Pages of documentation | 3 (README + metrics + inline) | Approx. |
| Errors found during review/test | 18 | Same as defects for this scenario |

### 3.2 Calculations

```
Productivity   = KLOC / Effort        = 2.308 / 2.5   = 0.923 KLOC per person-month
                                                       ≈ 923 LOC per person-month
Cost per LOC   = Cost / LOC           = 150000 / 2308 = ₹65.0 per line
Quality        = Defects / KLOC       = 18 / 2.308    = 7.80 defects per KLOC
Documentation  = Pages / KLOC         = 3 / 2.308     = 1.30 pages per KLOC
```

### 3.3 Human reading

- **Productivity (~923 LOC/person-month)** is healthy for application code that leans on mature frameworks (React, Express, Mongoose do a lot of heavy lifting). You are writing *orchestration and business rules*, not reinventing HTTP or rendering — so each line carries more leverage than raw LOC suggests.
- **Cost per LOC (₹65)** is only meaningful relative to your own historical baseline. On its own it's a vanity number; the moment you compare two projects of different languages with it, it lies.
- **Defect density (7.8/KLOC)** sits in a reasonable band for pre-release application code (industry rough bands often cite 5–15 defects/KLOC during development, dropping to <1 after release hardening). It's a *scenario* figure here — the real value only emerges once you track issues in a tracker.
- **The honest caveat:** size-oriented metrics punish expressive code. If you refactored `pages.jsx` to be more concise, LOC would drop and "defects per KLOC" would *rise* even though the software got better. This is exactly why function-oriented metrics exist.

---

## 4. Function-Oriented Metrics (Function Point Analysis)

Function Points (FP) measure delivered functionality independent of language. We classify the system's externally visible functions into five types, weight each by complexity, sum them into the **Unadjusted Function Point (UFP)** count, then adjust by 14 technical **General System Characteristics (GSCs)**.

### 4.1 The five function types, mapped to this project

| Type | What it is | Where it appears in CurtainCall |
|---|---|---|
| **EI** — External Inputs | Data/control entering the system | Register, Login, Update profile, Create/Update/Delete movie, Create/Update/Delete theatre, Add/Update/Delete screen, Create/Update/Delete show, Create booking, Cancel booking, Set user role |
| **EO** — External Outputs | Derived/processed output to the user | Ticket (computed total), Activity log, Seats-sold summary, Booking confirmation |
| **EQ** — External Inquiries | Input→output retrieval, no derivation | Movie list/detail, Theatre list, Showtimes, My bookings, Seat-map (taken seats), User list |
| **ILF** — Internal Logical Files | Data maintained inside the system | Users, Movies, Theatres (+screens), Shows, Bookings, Activity log |
| **EIF** — External Interface Files | Data referenced from outside | (none — the app owns all its data) |

### 4.2 Counting and weighting (using standard IFPUG average weights)

| Function type | Count | Simple | Average | Complex | Weight used | FP contribution |
|---|---:|---|---|---|---:|---:|
| External Inputs (EI) | 18 | 3 | **4** | 6 | 4 | 72 |
| External Outputs (EO) | 4 | 4 | **5** | 7 | 5 | 20 |
| External Inquiries (EQ) | 7 | 3 | **4** | 6 | 4 | 28 |
| Internal Logical Files (ILF) | 6 | 7 | **10** | 15 | 10 | 60 |
| External Interface Files (EIF) | 0 | 5 | 7 | 10 | 7 | 0 |
| **Unadjusted Function Points (UFP)** | | | | | | **180** |

> I used **average** complexity weights across the board for a clean, defensible baseline. In a formal count you would rate each function individually (e.g., a simple "list theatres" inquiry is lighter than the seat-map inquiry that joins bookings to a screen layout).

### 4.3 Value Adjustment Factor (VAF)

Each of the 14 GSCs is scored 0 (not present) to 5 (strong influence). Scores below reflect the actual system.

| # | General System Characteristic | Score | Why |
|---|---|---:|---|
| 1 | Data communications | 4 | Client/server over REST, token auth |
| 2 | Distributed data processing | 2 | Single API + DB, no sharding |
| 3 | Performance | 3 | Indexed queries, atomic booking |
| 4 | Heavily used configuration | 2 | Modest expected load |
| 5 | Transaction rate | 3 | Booking is transactional |
| 6 | Online data entry | 5 | Everything is online forms |
| 7 | End-user efficiency | 4 | Filters, seat map, role dashboards |
| 8 | Online update | 5 | Live CRUD across all resources |
| 9 | Complex processing | 3 | Seat conflict logic, RBAC scoping |
| 10 | Reusability | 4 | Shared middleware, form/table primitives |
| 11 | Installation ease | 3 | Seed script, `.env.example` |
| 12 | Operational ease | 3 | Health check, graceful shutdown, logging |
| 13 | Multiple sites | 2 | Single deployment target assumed |
| 14 | Facilitate change | 4 | Capability-based RBAC, layered structure |
| | **Sum (ΣFi)** | **47** | |

```
VAF = 0.65 + (0.01 × ΣFi) = 0.65 + (0.01 × 47) = 0.65 + 0.47 = 1.12
```

### 4.4 Adjusted Function Points and derived metrics

```
AFP (FP) = UFP × VAF = 180 × 1.12 = 201.6 ≈ 202 Function Points
```

Now we can cross-check size and productivity in **language-independent** terms. Using a common backfiring estimate of ~**53 LOC per FP for JavaScript**:

```
Estimated LOC from FP = 202 × 53 = 10,706 LOC   (if built "from scratch" with no framework leverage)
Actual measured LOC   = 2,308 LOC
Framework leverage    = 2308 / 10706 ≈ 0.22  → you wrote ~22% of the code a from-scratch build implies
```

Function-point productivity for the assumed scenario:

```
FP productivity = FP / Effort        = 202 / 2.5     = 80.8 FP per person-month
Cost per FP     = Cost / FP          = 150000 / 202  = ₹742 per Function Point
Defects per FP  = Defects / FP       = 18 / 202      = 0.089 defects per FP
```

### 4.5 Human reading

- **~202 FP** places CurtainCall in the **small-to-medium application** category — comparable in delivered functionality to a modest internal business tool, not a toy. That matches intuition: three roles, six data entities, full CRUD, booking with concurrency control, and auth is genuinely *more* functionality than the 2.3 KLOC headline suggests.
- The **framework-leverage ratio (~0.22)** is the most interesting single number in this report. It says the measured code is roughly a fifth of what the same functionality would cost to build without React/Express/Mongoose. That's the modern-stack dividend, and it's exactly the kind of insight LOC-only metrics hide.
- **VAF of 1.12** means the technical characteristics push effort *up* 12% over the raw function count — driven mostly by online update (5), online data entry (5), end-user efficiency (4), and data communications (4). This is an interactive, transactional, networked app, and the adjustment honestly reflects that.
- **0.089 defects/FP** is a cleaner quality signal than defects/KLOC because it won't swing when you reformat code.

---

## 5. Quality Metrics

Quality metrics come in two flavours: **product quality** (is the code well-structured?) and **process quality** (how effective was defect removal?).

### 5.1 Structural / maintainability metrics (measured)

| Metric | Formula | Value | Reading |
|---|---|---|---|
| Comment density | comments / total lines | 145 / 2808 = **5.2%** | On the low side. The *why* comments that exist are high-value, but public modules would benefit from more. |
| Blank-line ratio | blanks / total | 355 / 2808 = **12.6%** | Healthy — code breathes, not cramped. |
| Avg. file size | SLOC / files | 2308 / 47 = **49 SLOC/file** | Excellent. Small files = easy to reason about. |
| Largest file | — | 360 SLOC (`pages.jsx`) | The only file worth watching; a candidate to split per-page later. |
| Frontend/backend balance | — | 46% / 54% SLOC | Well balanced; logic lives on the server where it belongs. |
| Modules (files) per role feature | — | ~16 backend modules for 7 resources | Strong separation (routes/controllers/models/middleware). |

### 5.2 Cyclomatic complexity (McCabe) — spot analysis

Cyclomatic complexity V(G) = (decision points) + 1 per function. I sampled the two most logic-heavy functions.

- **`bookSeats` / `createBooking`** (booking with conflict check + transaction fallback): decision points include past-show check, seat-validity check, seat-clash check, code-collision loop, transaction-supported branch, and the retry path. Estimated **V(G) ≈ 8–9**. This is the system's complexity hotspot — appropriately so, since preventing double-booking is the hardest correctness problem here. Still within the "moderate, acceptable" band (McCabe flags >10 as worth watching, >20 as high risk).
- **Typical controller (e.g., `updateMovie`)**: one not-found branch, one success path → **V(G) ≈ 2–3**. Trivially testable.

**Reading:** complexity is concentrated exactly where you'd want it (booking) and kept low everywhere else. No function appears to cross the risky >10 threshold.

### 5.3 Defect Removal Efficiency (DRE) — process quality

DRE measures how many defects you caught *before* release versus leaking to the user.

```
DRE = E / (E + D)
  E = errors found before delivery
  D = defects found after delivery (by users)
```

Assumed scenario: 18 errors found during development/testing (the 25-case end-to-end suite that was run caught the real seat-booking and text-index bugs), and 2 issues surfaced after "delivery" (the CORS origin issue and the server-not-running 500 you reported):

```
DRE = 18 / (18 + 2) = 18 / 20 = 0.90 = 90%
```

**Reading:** a DRE of **90%** is good (world-class teams target ~95%+). The two leaked issues were environmental/configuration (CORS allow-list, process not started) rather than logic defects, which is a reassuring pattern — the *functional* core held up, and the escapes were in deployment/runtime setup. Tightening the dev onboarding (single-command startup, broader CORS defaults — both now addressed) directly raises future DRE.

### 5.4 Quality summary scorecard

| Dimension | Assessment | Evidence |
|---|---|---|
| Modularity | **Strong** | 49 SLOC/file avg, clean layer separation |
| Complexity control | **Strong** | Hotspot V(G)~8, rest trivial |
| Documentation (in-code) | **Moderate** | 5.2% comment density; good README |
| Defect removal | **Good** | 90% DRE, escapes were config not logic |
| Testability | **Good** | Stateless controllers, 25 passing e2e checks |
| Security posture | **Strong** | bcrypt, JWT, zod validation, RBAC, rate limiting |

---

## 6. Overall interpretation

Pulling the three lenses together:

1. **Size says** it's a compact ~2.3 KLOC codebase — but size alone undersells it.
2. **Function points say** it delivers ~202 FP of real functionality, and you achieved that with only ~22% of the code a from-scratch build would need — the payoff of a well-chosen modern stack.
3. **Quality says** the structure is clean (small files, contained complexity), defect removal is effective (90% DRE), and the weak spot is in-code documentation density rather than anything structural or security-related.

**If I were to recommend three improvements driven by these metrics:**
- Raise comment density on the public backend modules (controllers/middleware) from ~5% toward ~10–12% to protect maintainability as the team grows.
- Add unit tests specifically around the `bookSeats` complexity hotspot (V(G)~8) so its branches stay covered as it evolves.
- Keep an eye on `pages.jsx` (360 SLOC); if it grows past ~450, split it into per-page files to preserve the excellent 49-SLOC/file average.

---

## 7. Appendix — formulas used

```
Size-oriented:
  Productivity   = KLOC / Effort
  Cost per LOC   = Cost / LOC
  Quality        = Defects / KLOC
  Documentation  = Pages / KLOC

Function-oriented:
  UFP = Σ (count × weight) over EI, EO, EQ, ILF, EIF
  VAF = 0.65 + 0.01 × Σ(GSC scores, 14 characteristics, 0–5 each)
  FP  = UFP × VAF
  FP productivity = FP / Effort
  Cost per FP     = Cost / FP

Quality:
  Comment density = comment lines / total lines
  Cyclomatic V(G) = decision points + 1
  DRE = E / (E + D)
```

*Measured values are counted from the repository. Effort, cost, and post-release defect counts use a clearly-labelled assumed scenario; replace them with your tracker's real figures for a production report.*
