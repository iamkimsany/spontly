# Spontly — Delivery Plan

## Overview
| Phase | Goal | Timeline |
|---|---|---|
| Phase 0 | Validation | Now → Jun 6 |
| Phase 1 | MVP | Jun 6 → Aug 31 |
| Phase 2 | Growth | Sep → Dec 2026 |
| Phase 3 | Expansion | 2027 |

---

## Phase 0 — Validation (Now → Jun 6, 2026)

**Goal**: Prove demand before building

### Tasks
- [x] Define product concept
- [x] Write product brief
- [ ] Submit hackathon application (deadline: Jun 2)
- [ ] Build waitlist landing page (Tally.so — 1 hour)
- [ ] Record TikTok video (3 variants)
- [ ] Publish TikTok — collect reactions
- [ ] Build basic prototype (Lovable or Bolt)

### Success Criteria
- 500+ waitlist signups before Jun 6
- TikTok video: 50k+ views OR 500+ comments
- Working clickable prototype ready for hackathon demo

### Deliverables for Hackathon (Jun 6–7)
- Live prototype (Lovable/Bolt)
- Waitlist page with real signups
- TikTok traction screenshots
- This product brief
- 5-minute pitch deck

---

## Phase 1 — MVP (Jun 6 → Aug 31, 2026)

**Goal**: Functional app with core safety features, 500 MAU in Seoul

### Sprint 1 (Jun 8–21) — Foundation
- [ ] Project setup: React Native + Node.js + PostgreSQL
- [ ] Auth: phone verification + selfie verification
- [ ] User profile: basic CRUD
- [ ] Trusted contact setup flow
- [ ] GPS consent flow

### Sprint 2 (Jun 22 – Jul 5) — Core Features
- [ ] Activity wish list (create, edit, delete, toggle visibility)
- [ ] Basic matching algorithm (category + city + timeframe)
- [ ] Match notification (push)
- [ ] In-app chat (per match)
- [ ] Match confirmation with GPS gate

### Sprint 3 (Jul 6–19) — Safety System
- [ ] GPS tracking during meetup
- [ ] GPS auto-start / auto-stop
- [ ] Trusted contact auto-notification
- [ ] Mismatch detector (zone logic: green/yellow/red/black)
- [ ] SOS button (press + hold)
- [ ] Post-activity mandatory rating

### Sprint 4 (Jul 20 – Aug 2) — Trust & Polish
- [ ] Trust Score calculation + display
- [ ] Account restrictions by Trust Score
- [ ] Chat AI moderation (basic keyword + OpenAI)
- [ ] Onboarding flow (3 slides)
- [ ] Empty states, error states, loading states

### Sprint 5 (Aug 3–16) — QA + Beta
- [ ] Internal testing (20 users)
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] App Store / Play Store submission prep

### Sprint 6 (Aug 17–31) — Soft Launch
- [ ] Launch in Hongdae/Itaewon area only
- [ ] Invite waitlist users (Seoul only)
- [ ] Monitor safety system in real conditions
- [ ] Collect feedback

### MVP Success Criteria
- 500 registered users
- 200 MAU
- 50+ completed activities
- 0 serious safety incidents
- 4.0+ average store rating

---

## Phase 2 — Growth (Sep → Dec 2026)

**Goal**: 5,000 MAU, Seoul-wide, product-market fit confirmed

### Features
- [ ] Advanced matching (neighborhood-level, not just city)
- [ ] Group activity creation (user-initiated)
- [ ] Companions list (recurring activity partners)
- [ ] Activity photo sharing post-meetup
- [ ] Document verification (optional, free)
- [ ] Freemium: premium filters + unlimited matches
- [ ] Venue partnership pilot (3–5 Seoul venues)

### Growth
- [ ] TikTok organic content (weekly)
- [ ] University partnership: 1–2 Seoul universities
- [ ] Referral program: invite a friend → bonus matches
- [ ] PR: pitch to Korean tech media (Platum, The PR)

### Success Criteria
- 5,000 MAU
- 3 university partnerships
- 2 venue partnerships
- Revenue: first ₩1M MRR from premium subscriptions

---

## Phase 3 — Expansion (2027)

**Goal**: Multi-city Korea → Southeast Asia

### Markets
1. Seoul (established)
2. Busan + Jeju
3. Tokyo, Japan
4. Bangkok, Thailand
5. Jakarta, Indonesia

### Features
- [ ] Multi-language support (Korean, English, Japanese, Thai)
- [ ] Corporate/B2B team-building package
- [ ] API for venue partners
- [ ] Advanced AI matching (personality signals from activity history)

---

## Team Requirements

### MVP Team (minimum)
| Role | Responsibility |
|---|---|
| Founder/PM | Product, strategy, TikTok, community |
| React Native Developer | Mobile app |
| Backend Developer | APIs, matching, safety |
| (Optional) Designer | UI polish beyond spec |

### Phase 2 Team
Add: Growth marketer, Customer support, 2nd mobile developer

---

## Budget Estimate (MVP)

| Item | Monthly Cost |
|---|---|
| AWS (EC2 + RDS + S3) | ~$150 |
| OpenAI API (matching + moderation) | ~$100 |
| Twilio (SMS verification) | ~$50 |
| Firebase (push notifications) | Free tier |
| Google Maps API | ~$50 |
| AWS Rekognition (selfie verify) | ~$30 |
| **Total** | **~$380/month** |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cold start (not enough users) | High | High | Launch in 1 district only, force density |
| Safety incident (press) | Low | Critical | Safety system + PR crisis plan ready |
| Apple/Google platform risk | Low | Medium | Safety moat + network effects = hard to replace |
| Developer capacity | Medium | High | Start with no-code prototype, hire post-hackathon |
| User retention | Medium | High | Companions feature, activity streaks, reminders |
