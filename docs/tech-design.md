# Gachi — Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                Mobile App                    │
│           React Native (iOS + Android)       │
└──────────────────────┬──────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────┐
│                  API Gateway                  │
│              (Rate limiting, Auth)            │
└──────┬───────────────┬───────────────┬───────┘
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Auth API   │ │ Matching API │ │  Safety API  │
│  (Node.js)  │ │  (Python)   │ │  (Node.js)  │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
┌──────▼───────────────▼───────────────▼──────┐
│                  Data Layer                   │
│     PostgreSQL    │    Redis    │    S3       │
└─────────────────────────────────────────────┘
```

## Tech Stack

### Mobile
| Layer | Technology | Reason |
|---|---|---|
| Framework | React Native | Single codebase for iOS + Android |
| Navigation | React Navigation v6 | Industry standard |
| State | Zustand | Lightweight, simple |
| Real-time | Socket.io client | Chat + live matching |
| Maps | Google Maps SDK | GPS + location display |
| Push | Firebase Cloud Messaging | Cross-platform notifications |
| Storage | AsyncStorage | Local preferences |

### Backend
| Service | Technology | Reason |
|---|---|---|
| Auth API | Node.js + Express | Fast, familiar |
| Matching API | Python + FastAPI | AI/ML integration friendly |
| Safety API | Node.js + Express | Real-time event handling |
| Real-time | Socket.io | WebSocket with fallback |
| Task Queue | Bull (Redis-backed) | Background jobs (GPS checks, alerts) |

### Data
| Store | Technology | Used For | Cost |
|---|---|---|---|
| Primary DB | Supabase (PostgreSQL) | Users, activities, matches, ratings | Free up to 500MB |
| Cache | Redis (Railway) | Active sessions, real-time match pool | Free tier |
| File Storage | Supabase Storage | Profile photos | Free up to 1GB |
| Search | PostgreSQL + PostGIS | Geo-based activity matching | Included in Supabase |

### AI / ML
| Feature | Technology | Cost |
|---|---|---|
| Activity matching | OpenAI Embeddings API | ~$0.02 per 1M tokens |
| Chat moderation | OpenAI GPT-4o with custom safety prompt | ~$0.01 per chat check |
| Mismatch detection | Rule-based + Haversine distance (no API needed) | Free |
| Selfie verification | OpenAI Vision API (GPT-4o) | Already included |

### Infrastructure
| Component | Technology | Cost |
|---|---|---|
| Hosting | Railway or Render | Free tier → ~$5/mo |
| SMS Verification | Firebase Phone Auth | Free up to 10k/month |
| Push Notifications | Firebase Cloud Messaging | Free |
| CI/CD | GitHub Actions | Free |
| Monitoring | Sentry | Free tier |
| Analytics | PostHog | Free up to 1M events |

---

## Cost Summary (MVP)

| Service | Monthly Cost |
|---|---|
| OpenAI API (matching + moderation + selfie) | ~$50–100 |
| Google Maps API | Free ($200 credit/month) |
| Firebase (SMS + push) | Free |
| Supabase (DB + storage) | Free |
| Railway / Render (hosting) | Free → $5 |
| **Total** | **~$50–105/month** |

> Everything except OpenAI is free at MVP scale. Costs only grow when users grow.

---

## Database Schema (Core Tables)

### users
```sql
id              UUID PRIMARY KEY
phone           VARCHAR UNIQUE NOT NULL
name            VARCHAR NOT NULL
age             INTEGER NOT NULL
photo_url       VARCHAR
trust_score     INTEGER DEFAULT 0
selfie_verified BOOLEAN DEFAULT FALSE
doc_verified    BOOLEAN DEFAULT FALSE
trusted_contact VARCHAR
created_at      TIMESTAMP
last_active     TIMESTAMP
```

### activities
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
category    VARCHAR NOT NULL
title       VARCHAR NOT NULL
timeframe   ENUM('today', 'this_week', 'someday')
is_public   BOOLEAN DEFAULT FALSE
location    POINT (PostGIS)
city        VARCHAR
district    VARCHAR
created_at  TIMESTAMP
expires_at  TIMESTAMP
```

### matches
```sql
id          UUID PRIMARY KEY
activity_id UUID REFERENCES activities(id)
format      ENUM('solo', 'small_group', 'large_group')
status      ENUM('pending', 'confirmed', 'completed', 'cancelled')
location    VARCHAR
meetup_time TIMESTAMP
created_at  TIMESTAMP
```

### match_participants
```sql
match_id    UUID REFERENCES matches(id)
user_id     UUID REFERENCES users(id)
confirmed   BOOLEAN DEFAULT FALSE
gps_active  BOOLEAN DEFAULT FALSE
PRIMARY KEY (match_id, user_id)
```

### ratings
```sql
id          UUID PRIMARY KEY
match_id    UUID REFERENCES matches(id)
rater_id    UUID REFERENCES users(id)
ratee_id    UUID REFERENCES users(id)
score       INTEGER CHECK (score BETWEEN 1 AND 5)
comment     TEXT
created_at  TIMESTAMP
```

### safety_events
```sql
id          UUID PRIMARY KEY
match_id    UUID REFERENCES matches(id)
user_id     UUID REFERENCES users(id)
zone        ENUM('yellow', 'red', 'black', 'sos')
triggered_at TIMESTAMP
resolved_at  TIMESTAMP
gps_snapshot POINT
```

---

## Matching Algorithm

```python
def find_matches(activity: Activity) -> List[Match]:
    # 1. Get all public activities in same city
    candidates = db.query("""
        SELECT * FROM activities
        WHERE is_public = true
        AND city = %s
        AND timeframe = %s
        AND user_id != %s
        AND expires_at > NOW()
    """, [activity.city, activity.timeframe, activity.user_id])

    # 2. Compute semantic similarity
    query_embedding = openai.embed(activity.title + activity.category)
    scored = []
    for candidate in candidates:
        candidate_embedding = openai.embed(candidate.title + candidate.category)
        score = cosine_similarity(query_embedding, candidate_embedding)
        if score > 0.75:  # threshold
            scored.append((candidate, score))

    # 3. Sort by score + proximity
    scored.sort(key=lambda x: x[1], reverse=True)

    # 4. Determine format
    count = len(scored)
    if count == 1:
        format = 'solo'
    elif count <= 4:
        format = 'small_group'
    else:
        format = 'large_group'

    return scored, format
```

---

## Safety System — GPS Flow

```
Meetup confirmed
      │
      ▼ T-10 min
GPS tracking starts
      │
      ▼ Every 5 min
Compare: app_location vs chat_location vs gps_location
      │
      ├─ All match ──────────────────► Green (silent)
      │
      ├─ Minor deviation ────────────► Yellow: push notification
      │                                "Did you change location?"
      │                                Wait 5 min for response
      │                                No response → Red
      │
      ├─ Major deviation + no resp ──► Red: alert trusted contact
      │                                Wait 10 min
      │                                No response → Black
      │
      ├─ Black ──────────────────────► Auto-call emergency services
      │                                Notify trusted contact
      │                                Save GPS snapshot
      │
      └─ SOS button ─────────────────► Instant emergency call
                                       Notify trusted contact
                                       Save full GPS history
```

---

## API Endpoints (MVP)

### Auth
```
POST /auth/register          Register new user
POST /auth/verify-phone      Verify SMS code
POST /auth/verify-selfie     Upload + verify selfie
```

### Activities
```
GET  /activities             Get user's activity list
POST /activities             Create new activity
PUT  /activities/:id         Update activity
DELETE /activities/:id       Delete activity
POST /activities/:id/public  Toggle visibility
```

### Matching
```
GET  /matches                Get active matches for user
POST /matches/:id/confirm    Confirm participation (requires GPS)
POST /matches/:id/complete   Mark activity as done
```

### Safety
```
POST /safety/gps             Send GPS update
POST /safety/sos             Trigger SOS
GET  /safety/status/:matchId Get current safety zone
```

### Ratings
```
POST /ratings                Submit post-activity rating
```

---

## Security Considerations
- JWT tokens with 24h expiry + refresh token rotation
- Phone verification via Firebase Phone Auth (free up to 10k/month)
- All GPS data AES-256 encrypted at rest
- GPS data auto-purged after 48 hours via cron job
- Chat content moderated before storage
- Rate limiting: 100 req/min per user
- GDPR: data export + deletion endpoint available
