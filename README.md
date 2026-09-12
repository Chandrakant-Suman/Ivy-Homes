# Ivy Homes — Software Engineering Internship Assignment

A small React + Node/Express app on top of the Ivy Homes property API
(`https://solve.ivy.homes`), plus an investigation of where the shipped
`API_REFERENCE.md` disagrees with the running service.

City: **Hyderabad** · Assigned locality: **Kukatpally**

> The running API is treated as the only source of truth. Every number in
> `submission.json` comes from paging the real API and computing over it in
> [`server/scripts/analyzeData.js`](server/scripts/analyzeData.js) — nothing is
> copied from the documentation or the decoy figures in `llms.txt`.

---

## 1. Project overview

Six things work, all gated behind a real login:

- **Login / logout** against the real auth flow, with a session that survives a
  refresh and auto-refreshes the 15-minute access token so the app keeps working.
- **Browse listings** — paginated, with working filters (locality, BHK, price
  range, furnishing) and sorting.
- **Listing detail** at `/listings/:id`, with a computed "Similar listings" strip.
- **Favourites** — add / remove / list, per user, surviving refresh and re-login.
- **Rentals and projects** — browsable with correct rents, deposits and areas.
- **Insights** — the analytics dashboard, computed locally (the documented
  endpoint does not exist), plus the data-quality facts I discovered.

Pages: `/login`, `/listings`, `/listings/:id`, `/rentals`, `/projects`,
`/favourites`, `/insights`.

---

## 2. Tech stack

- **Frontend:** React 18 (JavaScript), React Router, Vite, Tailwind CSS, Axios.
- **Backend:** Node.js + Express (ES modules), Axios.
- **Investigation:** a single Node script that crawls and computes everything.

The API key lives only in the backend `.env`; the browser never sees it and
talks only to our Node server.

---

## 3. How to install

```bash
# backend
cd server
npm install
cp .env.example .env      # then check the values (key is already filled in)

# frontend
cd ../client
npm install
```

Requires Node 18+ (developed on Node 24).

## 4. How to run the backend

```bash
cd server
npm start                 # http://localhost:4000
```

## 5. How to run the frontend

```bash
cd client
npm run dev               # http://localhost:5173  (proxies /api -> :4000)
```

Open `http://localhost:5173`, log in with a demo user
(`demo1@ivy.homes` / your key password) and use the app.

To (re)generate `submission.json` and cache the dataset:

```bash
cd server
IVY_DEMO_EMAIL=demo1@ivy.homes IVY_DEMO_PASSWORD=<password> npm run analyze
# or:  node scripts/analyzeData.js demo1@ivy.homes <password>
```

---

## 6. Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Meaning |
| --- | --- |
| `IVY_BASE_URL` | Upstream API base, `https://solve.ivy.homes` |
| `IVY_API_KEY`  | Your API key (**server-side only**) |
| `PORT`         | Backend port (default `4000`) |

The demo **password** is deliberately *not* stored anywhere. Users type it on
the login page; the analyze script reads it from `IVY_DEMO_PASSWORD` / an arg at
run time.

`client/.env` (optional): `VITE_API_BASE` (defaults to `/api`).

---

## 7. API architecture

```
Browser (React)  ──/api──►  Node/Express  ──X-API-Key + Bearer──►  solve.ivy.homes
```

- The React app calls only our backend (`/api/...`). It stores the user's
  access/refresh tokens in `localStorage` and sends the access token as a bearer.
- The Express backend injects the secret `X-API-Key` header, forwards the user's
  bearer token, and maps our clean routes onto the real (sometimes
  differently-named) upstream paths — e.g. `/api/favourites` → `/v1/saved`,
  `/api/listings/:id` → `/v1/listings/{id}`.
- On first data request the backend **crawls the whole city dataset once**
  (~4.4k listings + rentals + projects, paging by `has_more`) and holds it in
  memory for 10 minutes. Filtering, sorting and pagination are then done in the
  backend. This is the only reliable way to fix three upstream bugs (understated
  `total`, ignored `order`, ignored `page`) and it keeps the UI instant. The
  assignment itself recommends pulling the dataset down early.
- `similar` and `insights` are **computed** by the backend because those upstream
  endpoints don't exist.
- Favourites go straight through to the upstream `/v1/saved`, so they are truly
  per-user and persist across refresh and re-login.

Backend layout: `routes/` → `controllers/` → `services/` (`ivyApi`, `dataStore`,
`query`) with shared data-quality rules in `utils/detect.js` (imported by both
the runtime and the analyze script, so the app and the submission never drift).

---

## 8. How authentication works

1. The login page posts email + password to `/api/auth/login`; the backend adds
   `X-API-Key` and forwards to upstream `POST /auth/login`.
2. Upstream returns `access_token` (15 min), `refresh_token`, and `user`. The
   frontend stores them in `localStorage` — this is what makes the session
   survive a **page refresh**.
3. Every API call sends `Authorization: Bearer <access_token>`. An Axios response
   interceptor catches a `401`, calls `/api/auth/refresh` **once**, saves the new
   tokens and replays the request — so the app keeps working well past 15 minutes.
4. Logout calls `/api/auth/logout` and clears local storage. (Upstream logout is
   stateless — see the findings — so clearing the client is what actually matters.)

## 9. How pagination works

The docs describe `page` / `page_size`; the API actually uses **`limit` / `offset`**
and returns `{ limit, offset, count, total, has_more, results }`. Two traps:

- `page` is ignored, and `limit` is capped at **50** (not 200).
- `total` is **understated** — it says 4178 while paging by `has_more` yields
  **4400** distinct records.

So the crawler pages by `offset += results.length` and stops on
`has_more === false`, never trusting `total`. The UI then paginates over the
in-memory dataset with its own `page` / `pageSize`.

---

## 10. How I investigated the documentation

1. **Swept the endpoints first.** Called `/health`, tried the documented auth
   (query-param key → rejected; the API told me to use the `X-API-Key` header),
   logged in, and hit every documented path. Several 404'd
   (`/v1/listing/{id}`, `/v1/listings/{id}/similar`, `/v1/favourites`,
   `/v1/analytics/summary`) and I found the real paths by probing
   (`/v1/listings/{id}`, `/v1/saved`). I also read `/`, `/llms.txt` and
   `/llms-full.txt` — the "key figures" there are decoys ("nobody checked them")
   and were ignored.
2. **Pulled the whole dataset down** (~150 requests) and stopped reading it one
   record at a time.
3. **Formed hypotheses and tested them against the crawl** — the part the
   endpoint sweep can't do. Units (area, project prices), pagination totals,
   ignored filters/sort, impossible records, duplicate properties, and fraud all
   came from asking "how could this be wrong?" and checking. Where a first rule
   fit most of the data (e.g. "small carpet area = corrupt", "phone posts many
   listings = fraud"), I looked hard at what it got wrong and refined it.

## 11. Which documentation assumptions were wrong

Reproduced discrepancies (full list with evidence in `submission.json` →
`findings`):

- **auth** — key must be an `X-API-Key` header, not a query param.
- **auth** — login returns `access_token` + `refresh_token`, `expires_in` is
  **900s**, and a refresh flow exists (docs: `token`, 24h, "no refresh flow").
- **auth** — logout is **stateless**; the token still works afterwards
  (docs: "invalidates the current token server side").
- **pagination** — `limit`/`offset`, not `page`; `page` ignored; `limit` capped
  at 50; response shape differs.
- **pagination** — `total` (4178) understates the 4400 retrievable records.
- **sorting** — `order` is ignored (asc == desc); always ascending.
- **filters** — `project_id` on `/v1/listings` is ignored (returns everything).
- **units** — some listings report area in **square metres**, not sqft.
- **units** — project `price_min`/`price_max` are in **crore**, not rupees, and
  `min > max` for most projects.
- **data_quality** — 30 impossible listings (negative price, floor > total
  floors, carpet > super built-up).
- **fraud** — 261 enquiry-bait listings from 12 phone numbers posting under many
  seller names, under-priced, mostly flagged "verified".
- **duplicates** — `listing_id` is unique but ~145 records are the *same physical
  property* cross-posted (docs: "each listing corresponds to exactly one property").
- **completeness** — 923 non-live listings are served despite "inactive/withdrawn
  are excluded"; the `is_live` field is undocumented.
- **missing_endpoint** — `/v1/listing/{id}`, `/v1/listings/{id}/similar`,
  `/v1/favourites`, `/v1/analytics/summary`.
- **undocumented_endpoint** — `/v1/saved` (the real favourites API).
- **consistency** — project `total_listings` is wrong for 129 projects.
- **timestamps** — the service clock is IST (`+05:30`) while record timestamps
  carry a UTC `Z`; the wall-clock values are IST and must be read as such.

## 12. What I checked that turned out to be correct (or a dead end)

The assignment specifically asks for the hypotheses that *didn't* pan out —
these say more about the method than the ones that did.

- **The four documented listing filters actually filter.** I expected some to be
  quietly ignored (like `order`), but `locality`, `bhk`, `min_price`, `max_price`
  and `furnishing` all filter correctly server-side. Only `order`, `page` and
  `project_id` are ignored. (I still filter in the backend so the UI is correct
  regardless.)
- **`sort_by` works and validates its field list** — the error message even lists
  the sortable fields, which match the docs. Only the *direction* is broken.
- **"Paging past `total` must be returning duplicates."** It isn't — all 4400
  listing IDs are distinct. `total` is simply understated; there's no paging bug.
- **"Every small carpet area is a corrupt record."** No — the sub-200 values keep
  the same super-built-up/carpet ratio as normal records, so they're a clean
  **square-metre** population (a units bug), not impossible data. The genuinely
  impossible records are a separate, exactly-30 set.
- **"A phone number on many listings is fraud."** No — most such numbers are
  ordinary busy agents with a single consistent name. The real signal is one
  phone under *several* names; that narrowed it to 12 numbers.
- **Money is integer rupees for listings and rentals**, deposit/maintenance are
  rupees, and rental `price` is the monthly rent — all as documented. Only the
  *project* price fields and the negative-price outliers break the money rule.
- **City scoping via the key is real** — every record is `city_id: 2` (Hyderabad);
  there is no city leakage.
- **Error bodies are `{"detail": ...}` and genuinely useful** — they're what
  pointed me to the header-based key and the sortable-field list.

## 13. How the ten answers were calculated

All over the full `has_more` crawl, reference `2026-09-10T00:00:00+05:30`.

| # | Answer | Value | Method |
| --- | --- | --- | --- |
| 1 | `total_listing_records` | **4400** | Page `/v1/listings` by `has_more` (not `total`); all IDs distinct. |
| 2 | `unique_properties` | **4255** | Cluster records by building/locality/bedroom/bathroom/floor **and** coordinate proximity (<0.01°); coordinates alone merge different flats in a tower, attributes alone merge far-apart plots. 145 cross-post duplicates removed. |
| 3 | `active_listings` | **3477** | Count `is_live === true`. |
| 4 | `corrupt_listing_ids` | **30** | Physically impossible: negative price (10) ∪ floor > total_floors (10) ∪ carpet_area > super_built_up_area (10); the three sets are disjoint. |
| 5 | `total_monthly_rent` | **6,717,600** | Sum `price` over all Kukatpally rental records (190 of them). |
| 6 | `avg_price_per_sqft_2bhk` | **10174.63** | Live 2 BHK, excluding corrupt (Q4) and fake (Q9); mean of price ÷ carpet area, with the square-metre records normalised to sqft (×10.7639). Convert-vs-exclude agree within 0.3%. |
| 7 | `costliest_project` | **P20165 / 998,000,000** | Highest `price_max` (99.8), read as crore → ×1e7 rupees. |
| 8 | `listings_last_7_days` | **136** | `posted_at` in `[2026-09-03, 2026-09-10)` read as IST wall-clock (the `Z` is a mislabel; the service clock is IST). |
| 9 | `fake_listing_ids` | **261** | All listings from the 12 phone numbers that post under more than one seller name (rotating agencies/people, systematically under-priced). |
| 10 | `projects_with_wrong_listing_count` | **129** | `total_listings` compared to each project's actual **live** listing count from the crawl. `total_listings` tracks the live count (239 vs 5 among projects with withdrawn listings), so it is measured against that. |

## 14. What I would do with another two days

- **Deploy** the frontend (Vercel) and backend (Render) and fill in `demo_url`.
- **Nail the two genuinely ambiguous answers** with more evidence: Q8's `Z`-vs-IST
  reading and Q7's crore unit — ideally by asking the team, since both are
  documentation lies with two defensible readings.
- **Tighten Q2/Q9** with fuzzy matching (small carpet/price jitter, near-duplicate
  descriptions) and a precision/recall check against held-out spot samples.
- **Infinite scroll + map view**, debounced filters, and a per-listing "why we
  flagged this" panel (fake / corrupt / metric-area) driven by `utils/detect.js`.
- **Tests** for the detection rules and the answer computations, and a small
  server cache persisted to disk so cold starts are instant.

---

## LLM use

Built with an LLM (Claude) pair-programming: it swept the endpoints, wrote the
scaffolding, and ran the hypotheses I formed against the crawl. The hypotheses,
the unit/fraud/duplicate reasoning, and the final answer methods are documented
above and reproducible via `npm run analyze`.
