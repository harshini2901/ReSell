# ReSell — Antigravity Handoff Specification

> **Important:** This is the current authoritative specification for the ReSell project.  
> The project is being built from scratch. No frontend or backend implementation exists yet.

---

# SOURCE: project-overview.md

# ReSell — Project Overview

**Full title:** ReSell: An AI-Powered Peer-to-Peer Marketplace for Smart Pricing, Fraud Detection, and Sustainable Resale of Used Goods

**Team:** P. Anusree (23B81A05S0), K. Harshini (23B81A05T3), V. Kundan Kumar (23B81A05T7)
**Guide:** C. Ramesh, Associate Dean

---

## 1. What ReSell Is

ReSell is a full-stack peer-to-peer (C2C) classifieds marketplace, inspired by OLX, built on the MERN stack. Sellers list used items with images, descriptions, and location; buyers browse, search, and chat with sellers in real time. Two data-driven features differentiate it from a plain classifieds clone: a **heuristic price recommendation engine** and a **perceptual-hashing-based duplicate/repost detector**.

The project is being built from scratch — no frontend or backend code exists yet at the start of this plan.

## 2. Problem Statement

Existing peer-to-peer online classifieds platforms leave sellers without reliable pricing guidance and lack automated mechanisms to detect duplicate or reposted listings, resulting in pricing uncertainty for sellers and reduced buyer trust in listing authenticity.

## 3. Core Scope (build now)

| # | Feature |
|---|---|
| 1 | Authentication (email-first: check-email → login or register) |
| 2 | User profiles |
| 3 | Product listing creation / editing / deletion |
| 4 | Image upload (Cloudinary) |
| 5 | Browse / search / filter (category, condition, price, keyword) |
| 6 | Heuristic Smart Price Recommendation (median-based, comparable listings) |
| 7 | Duplicate/reposted image detection (perceptual hashing + Hamming distance) |
| 8 | Real-time chat — text, read receipts, image sharing (Socket.io) |
| 9 | Listing location via Google Maps Geocoding API |
| 10 | Deployment (frontend on Vercel, backend on a WebSocket-friendly host) |

## 4. Explicitly Deferred (future work, not built now)

- Seller trust score
- Automatic product categorization (image-based)
- Payment integration
- Any other advanced feature not listed in Core Scope above

Deferred items are **not** touched unless explicitly re-approved later.

## 5. Technology Stack

- **Frontend:** React.js (Vite), React Router, Axios, Socket.io-client
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** MongoDB Atlas, Mongoose
- **Auth:** JWT (jsonwebtoken), bcryptjs
- **Media:** Cloudinary, Multer
- **Location:** Google Maps Geocoding API
- **Duplicate Detection:** perceptual hashing + custom Hamming distance
- **Testing:** Thunder Client (API), manual test cases, end-to-end feature testing
- **Deployment:** Vercel (frontend) + Render/Railway (backend — required for persistent Socket.io connections; Vercel serverless functions cannot hold WebSocket connections open)

## 6. Price Recommendation Logic (summary)

Inputs: category, brand, condition, product age, prices of similar active listings.
Logic: query comparable listings → compute **median** price (+ range + sample size) → if too few matches, progressively relax filters (drop brand → drop condition → category only) until a usable sample is found.
No regression/ML model — purely statistical, by design, since there's no historical transaction data yet. Database will be seeded with sample listings so this feature is demoable.

## 7. Duplicate Detection Logic (summary)

Each uploaded image → perceptual hash (specific algorithm to be finalized during implementation) → compared via Hamming distance against all stored hashes → flagged as probable duplicate/repost if distance ≤ adjustable threshold. Demoable by uploading the same or a visually similar image twice.

## 8. Team Task Split

Not yet finalized — to be assigned once the phase plan below is reviewed by all three members.

## 9. Definition of Success

A working end-to-end ReSell application, with all 10 core-scope features functioning reliably, stable enough for a live evaluation/demo. See `success-criteria.md` for detailed, per-feature success checks.

---
*See `implementation-plan.md` for the phase-by-phase build order, and `success-criteria.md` for measurable goals per phase.*


---

# SOURCE: implementation-plan.md

# ReSell — Implementation Plan (Phase by Phase)

Priority: get a working core end-to-end as fast as possible, then layer in the two intelligence features, then chat, then polish and deploy. Each phase is independently testable before moving to the next — don't start a phase until the previous one passes its own checks.

---

## Phase 0 — Project Setup
**Goal:** A running skeleton, nothing functional yet.
- Initialize `server/` (Node + Express + Mongoose) and `client/` (React via Vite)
- Connect to MongoDB Atlas
- Set up `.env` for both server and client (Mongo URI, JWT secret, Cloudinary keys, Google Maps key)
- Basic health-check route (`GET /` → "ReSell API is running")
**Outcome:** `npm run dev` on both server and client runs without errors; server confirms "MongoDB connected".

## Phase 1 — Authentication
**Goal:** Users can register and log in.
- `models/User.js` (email, name, password hash, timestamps)
- `routes/auth.js` — `/check-email`, `/login`, `/register`
- `middleware/auth.js` — JWT verification
- Frontend: email-first login/register screen, store JWT in localStorage
**Outcome:** A user can register, log out, and log back in; protected routes reject requests without a valid token. Test via Thunder Client + manual UI test.

## Phase 2 — User Profiles
**Goal:** Basic profile data attached to each user.
- Extend `User` model if needed (name, profile fields)
- `GET /api/auth/profile` — return logged-in user's info
- Frontend: simple profile view/edit page
**Outcome:** Logged-in user can view their own profile info.

## Phase 3 — Listing Management + Image Upload
**Goal:** Sellers can create, edit, delete listings with images.
- `models/Listing.js` (title, description, price, category, condition, images[], sellerId, status, attributes)
- `config/cloudinary.js`, `middleware/upload.js` (Multer → Cloudinary)
- `routes/listings.js` — POST / PATCH /:id / DELETE /:id (protected, owner-only for edit/delete)
- Frontend: Create Listing form (with image upload), My Listings dashboard (edit/delete/mark sold)
**Outcome:** A logged-in user can create a listing with photos, see it in "My Listings," edit it, and delete it.

## Phase 4 — Browse / Search / Filter
**Goal:** Anyone can discover listings.
- `GET /api/listings` — filters: category, condition, minPrice, maxPrice, keyword search, pagination
- `GET /api/listings/:id` — single listing detail (with seller info populated)
- Frontend: Home/browse grid, filter bar, listing detail page
**Outcome:** A visitor can browse all active listings, filter by category/price/condition, search by keyword, and open a listing's full detail page.

## Phase 5 — Location (Google Maps Geocoding)
**Goal:** Listings have accurate, geocoded locations.
- `routes/geocode.js` — `POST /api/geocode` (server-side Google Maps API key only)
- Frontend: location text field on Create Listing → debounced call to `/api/geocode` → store formatted address + lat/long
**Outcome:** A listing's location is stored with coordinates; location displays correctly on the listing detail page.

## Phase 6 — Heuristic Smart Price Recommendation
**Goal:** Sellers get a suggested price while creating a listing.
- `routes/price.js` — `POST /api/price/suggest`: query comparable active listings by category (+ optional brand, condition); compute median, range, sample size; progressively relax filters if sample is too small
- Seed the database with a batch of sample listings across categories/conditions so the feature has real comparables to work with
- Frontend: show suggested price + range + sample size on the Create Listing form as the seller fills in category/condition/brand
**Outcome:** Selecting a category (and optionally condition/brand) shows a live, sensible price suggestion; suggestion still works (via fallback) even with few matching listings.

## Phase 7 — Duplicate / Reposted Image Detection
**Goal:** Flag reused/reposted listing images.
- Add `imageHashes` field to `Listing` model
- `utils/duplicateDetection.js` — compute a perceptual hash per uploaded image, compare via Hamming distance against all stored hashes, adjustable-threshold flagging
- Wire into the listing-creation route: after upload, before save, check for duplicates and attach a warning to the response if found
- Frontend: show a duplicate warning to the seller if flagged
**Outcome:** Uploading the same image (or a lightly edited copy) a second time is detected and flagged, demonstrable live.

## Phase 8 — Real-Time Chat
**Goal:** Buyers and sellers can message each other in real time.
- `models/Message.js` (listingId, senderId, receiverId, text, imageUrl, readAt, timestamp)
- Socket.io setup in `index.js`, JWT-verified on socket handshake, rooms scoped per listing+user-pair
- `routes/messages.js` — `GET /api/messages/:listingId/:otherUserId` (history)
- Features to include: text messages, read receipts (readAt timestamp + "seen" indicator), image sharing in chat (reuse Cloudinary upload), real-time delivery via Socket.io
- Explicitly skip: online/offline status indicators (not required now)
- Frontend: chat page/panel, message list, read-receipt ticks, image attach button
**Outcome:** Two users can exchange text and image messages in real time from a listing's detail page, and see when their message has been read.

## Phase 9 — Frontend Integration & Polish
**Goal:** Everything connects cleanly as one coherent app.
- Navbar (Home / Create Listing / My Listings / Chat / Login-Logout depending on auth state)
- ProtectedRoute wrapper for pages requiring login
- Loading and error states on every data-fetching page
- Consistent styling pass
**Outcome:** A first-time user can navigate the whole app without dead ends, broken links, or unhandled loading/error states.

## Phase 10 — Testing
**Goal:** Confidence that the app is demo-stable.
- **API testing:** Thunder Client collection covering every endpoint (happy path + key failure cases: bad auth, missing fields, non-owner edit attempt)
- **Manual test cases:** a written checklist per feature (register/login, create/edit/delete listing, search/filter, price suggestion, duplicate flagging, chat send/receive/read-receipt/image)
- **End-to-end pass:** run through the full user journey once — register → create listing → get price suggestion → upload duplicate image (confirm flag) → browse as a second user → chat with seller → confirm read receipt
**Outcome:** All manual test cases pass; no known broken flows going into deployment.

## Phase 11 — Deployment
**Goal:** A live, demoable version.
- **Backend + Socket.io:** deploy to Render or Railway (persistent server required for WebSocket connections — Vercel serverless functions cannot hold these open)
- **Frontend:** deploy to Vercel, pointed at the deployed backend URL
- Verify all environment variables (Mongo URI, JWT secret, Cloudinary, Google Maps key) are set on the hosting platform, not just locally
- Full end-to-end re-test on the deployed version (not just localhost)
**Outcome:** A public URL where the guide/evaluators can use the live application directly.

---

## Suggested Ordering Priority (if time gets tight)

1. Phases 0–4 (core CRUD marketplace) — **must have**
2. Phase 6 (price recommendation) and Phase 7 (duplicate detection) — **must have**, these are your differentiators
3. Phase 5 (geocoding) — high value, moderate effort
4. Phase 8 (chat) — build text messages first; read receipts and image sharing can follow if time is short
5. Phase 9–11 (polish, testing, deployment) — never skip testing; deployment can fall back to "run locally for the demo" if truly out of time, but flag that early rather than at the last minute


---

# SOURCE: success-criteria.md

# ReSell — Goals, Outcomes & Success Criteria

## Overall Project Success Criteria

The project is considered successful if:
1. A user can complete the full journey — register, create a listing, browse/search, get a price suggestion, receive a duplicate warning on a repeated image, and chat with another user in real time — **without errors**.
2. All 10 core-scope features (see `project-overview.md`) are functioning, not just partially stubbed.
3. The application is stable enough to run live in front of the guide/evaluators without crashing or requiring a restart.
4. The app is reachable via a deployed URL (or, at minimum, reliably runnable locally if deployment is delayed).

---

## Per-Feature Goals, Outcomes, and Success Metrics

### 1. Authentication
- **Goal:** Secure, frictionless email-first login/registration.
- **Outcome:** New users can register; returning users can log in; sessions persist via JWT.
- **Success criteria:**
  - [ ] Registering with a new email creates an account and returns a valid token
  - [ ] Logging in with correct credentials succeeds; wrong password is rejected
  - [ ] Protected routes reject requests with no token or an invalid/expired token
  - [ ] Passwords are never visible in plaintext anywhere (DB, logs, network tab)

### 2. User Profiles
- **Goal:** Users can view their own basic account info.
- **Success criteria:**
  - [ ] Logged-in user can fetch their profile (name, email)
  - [ ] Profile data is not accessible to unauthenticated requests

### 3. Listing Management (Create/Edit/Delete)
- **Goal:** Sellers manage their own listings end-to-end.
- **Success criteria:**
  - [ ] A listing can be created with all required fields and at least one image
  - [ ] Only the listing's owner can edit or delete it (verified by testing with a second account)
  - [ ] Deleted listings no longer appear in browse results

### 4. Image Upload
- **Goal:** Images reliably reach Cloudinary and display correctly.
- **Success criteria:**
  - [ ] Multiple images can be uploaded per listing
  - [ ] Uploaded image URLs render correctly on both the listing card and detail page
  - [ ] Upload failure (e.g., bad file type) shows a clear error, not a silent failure

### 5. Browse / Search / Filter
- **Goal:** Buyers can find relevant listings quickly.
- **Success criteria:**
  - [ ] Filtering by category returns only matching listings
  - [ ] Filtering by price range and condition works in combination with category
  - [ ] Keyword search matches listing title/description
  - [ ] Pagination works without duplicate or skipped listings

### 6. Heuristic Smart Price Recommendation
- **Goal:** Sellers get a statistically reasonable price suggestion, even early in the platform's life.
- **Success criteria:**
  - [ ] Selecting a category (+ optional condition/brand) with sufficient seeded comparables returns a sensible median price, range, and sample size
  - [ ] With very few or no exact matches, the system falls back to broader criteria rather than returning "no data"
  - [ ] The suggestion updates when the seller changes category/condition/brand
  - [ ] Demo-ready: seeded sample listings produce a visibly sensible suggestion live

### 7. Duplicate / Reposted Image Detection
- **Goal:** Reliably catch reused images without false-flagging unrelated ones.
- **Success criteria:**
  - [ ] Uploading the exact same image a second time is flagged as a duplicate
  - [ ] Uploading a lightly modified copy (resized/recompressed) of an existing image is still flagged
  - [ ] Uploading a genuinely different image is **not** flagged (no false positive)
  - [ ] The flag and matched listing are clearly shown to the seller before they finalize the listing

### 8. Real-Time Chat (text, read receipts, image sharing)
- **Goal:** Buyers and sellers can communicate naturally and know when messages are seen.
- **Success criteria:**
  - [ ] Two users can exchange text messages in real time (no page refresh needed)
  - [ ] Messages persist and reload correctly when reopening a conversation
  - [ ] Read receipts update when the recipient opens the conversation
  - [ ] Images can be sent and display correctly in the chat thread
  - [ ] Unauthorized users cannot join or read a conversation they're not part of

### 9. Listing Location (Google Maps Geocoding)
- **Goal:** Listings carry accurate, usable location data.
- **Success criteria:**
  - [ ] Typing a location resolves to a formatted address + coordinates
  - [ ] A failed/ambiguous geocode lookup still allows listing submission with the typed text
  - [ ] The Google Maps API key is never exposed to the frontend/network tab

### 10. Deployment
- **Goal:** A publicly reachable, working demo.
- **Success criteria:**
  - [ ] Frontend is live on Vercel
  - [ ] Backend + Socket.io is live on a persistent-connection-friendly host (Render/Railway)
  - [ ] All environment variables are correctly set in the hosting dashboards (not just local `.env`)
  - [ ] A full end-to-end run-through succeeds on the **deployed** version, not just localhost

---

## Explicitly Out of Scope (not evaluated against success criteria)
- Seller trust score
- Automatic image-based product categorization
- Payment processing
- Online/offline presence indicators in chat
- Any ML/regression-based price model (heuristic-only is the accepted approach for this phase)

These may be revisited as future work but are not part of what "success" means for the current build.


---

# Antigravity Working Instructions

1. Treat this document as the current project specification.
2. Do not implement all phases at once.
3. Work phase-by-phase and wait for explicit approval before starting the next phase.
4. **Current task: implement Phase 0 only.**
5. Do not implement authentication, listings, price recommendation, duplicate detection, chat, or deployment yet.
6. For duplicate detection, the required technique is **perceptual hashing + Hamming Distance**. The exact perceptual hashing algorithm is intentionally **not finalized yet** and must not be hard-coded into the architecture at this stage.
7. Smart Price Recommendation must remain **heuristic/statistical**, not regression or another trained ML model.
8. The chat scope includes **text messages, read receipts, and image sharing**. Online/offline presence is out of scope.
9. Deployment target: frontend on **Vercel**; backend/Socket.io on a persistent WebSocket-friendly host such as Render or Railway.
10. After completing each phase, report:
   - files created/modified
   - commands to run
   - how the phase was tested
   - any configuration/environment variables required
   - any issues or decisions that need user approval
11. Do not silently add future features such as seller trust score, automatic product categorization, or payment processing.
