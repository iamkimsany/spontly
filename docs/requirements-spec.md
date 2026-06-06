# Gachi — Requirements Specification

## Functional Requirements

### FR-01: Authentication
- User registers with phone number (SMS verification required)
- Profile photo upload mandatory
- Selfie verification at registration (AI cross-checks with profile photo)
- Trusted contact number required before first activity match
- GPS consent required before first activity match

### FR-02: Activity Wish List
- User can add activities to a personal wish list
- Each activity has:
  - Category (see categories below)
  - Title / description
  - Timeframe: Today / This Week / Someday
  - Visibility toggle: Public (seeking company) / Private
- User can edit or delete activities at any time

#### Activity Categories
| Category | Examples |
|---|---|
| 🏃 Sports & Nature | Hiking, climbing, yoga, cycling, surfing |
| 🎨 Creative | Drawing, ceramics, photography, DIY |
| 🎵 Music & Dance | Salsa, hip-hop, jam sessions, concerts |
| 🍜 Food & Drinks | New restaurants, cafés, cooking classes |
| 📚 Learning | Seminars, workshops, language clubs, lectures |
| 🎉 Events | Exhibitions, festivals, markets, outdoor cinema |
| 💼 Networking | Industry meetups, startup events, co-working |
| 🎮 Games & Fun | Board games, quiz nights, escape rooms, bowling |
| 🌍 Travel | Day trips, neighborhood walks, exploring |

### FR-03: Real-Time Matching
- AI scans all public activity entries and matches by:
  - Activity type
  - Location (city → district → neighborhood)
  - Timeframe
- Match logic:
  - 1 match found → offer 1:1 meetup
  - 2–4 matches → suggest small group
  - 5+ matches → suggest group activity
- User chooses preferred format
- 1:1 meetup requires: account age > 7 days AND at least 1 past activity with positive rating
- Push notification sent to all matched users: "Aliya also wants to go hiking today — want to connect?"

### FR-04: Trust Score
Each user has a Trust Score calculated from:
- Phone verification (base)
- Selfie verification (medium)
- Number of completed activities (high)
- Average rating received (high)
- Account age (low)
- Document verification — optional, free (maximum)

Restrictions by Trust Score:
- New account: can only join groups, cannot create meetups
- Low Trust Score: limited to group activities only
- High Trust Score: unlocks 1:1 meetups and advanced filters

### FR-05: In-App Chat
- Group chat per activity (visible only to confirmed participants)
- AI monitors chat for: aggression, pressure tactics, suspicious patterns
- Flagged messages → warning to sender or silent alert to moderator
- Chat history retained for 30 days post-activity

### FR-06: Safety System

#### GPS Protection
- GPS activates 10 minutes before confirmed meetup
- GPS deactivates automatically when user marks activity as complete
- GPS data retained for 48 hours, then auto-deleted
- Without active GPS → confirm meetup button is disabled (functionally mandatory, legally voluntary)

#### Trusted Contact
- Designated at registration
- Auto-notified when meetup is confirmed: location, time, expected return
- Receives escalation alerts if safety system is triggered

#### AI Mismatch Detector
Compares three data sources:
1. Meetup location set in app
2. Address mentioned in chat
3. Real GPS location

| Zone | Condition | System Response |
|---|---|---|
| 🟢 Green | All match | Silent, no action |
| 🟡 Yellow | Minor deviation | Push: "Did you change location? Everything okay?" |
| 🔴 Red | Major deviation + no response | Alert sent to trusted contact |
| ⚫ Black | No response 10+ min + Red zone | Auto-call to emergency services + trusted contact |
| 🆘 SOS | User pressed button manually | Instant call to emergency services + trusted contact + location saved |

### FR-07: Post-Activity Rating
- Rating prompt is mandatory after every activity — cannot be skipped
- Rate each participant (1–5 stars + optional comment)
- AI flags patterns: frequent cancellations, last-minute location changes, repeated low ratings
- Multiple red flags → automatic account review

### FR-08: User Profile
- Profile photo, name, age
- Trust Score display
- Activity history
- Companions list (people met through the app)
- Settings: notifications, GPS preferences, trusted contact

---

## Non-Functional Requirements

### NFR-01: Performance
- Match results returned within 3 seconds
- Push notifications delivered within 5 seconds of match
- App launch time < 2 seconds

### NFR-02: Security
- All data encrypted in transit (TLS 1.3)
- GPS data stored encrypted, auto-deleted after 48h
- Chat content not stored longer than 30 days
- GDPR and Korean PIPA compliant

### NFR-03: Availability
- 99.5% uptime SLA
- Graceful degradation if matching service is down

### NFR-04: Scalability
- Architecture supports horizontal scaling
- Real-time features via WebSocket with fallback to polling

---

## Out of Scope (MVP)
- Document verification
- Advanced AI chat analysis
- Venue partnership integrations
- Activity photo gallery
- Recurring companions / friend groups
- Advanced search filters
- Web version
