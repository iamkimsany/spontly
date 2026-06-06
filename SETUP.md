# Gachi — Setup Guide

## Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Xcode) or Android Emulator, or Expo Go app

## 1. Install dependencies
```bash
npm install
```

## 2. Configure environment variables
Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | [supabase.com](https://supabase.com) → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as above |
| `EXPO_PUBLIC_OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| `EXPO_PUBLIC_SOCKET_URL` | Your Node.js backend URL |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) |

## 3. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/schema.sql`
3. **Enable Anonymous sign-in** — Authentication → Providers → Anonymous → Enable (required for activities to save)
4. Enable Phone Auth — Authentication → Providers → Phone (for production SMS later)

## 4. Firebase — already configured ✅
Firebase project `labs-f936a` is wired up:
- `GoogleService-Info.plist` → iOS config (project root)
- `google-services.json` → Android config (project root)
- Phone Auth (SMS OTP) uses `expo-firebase-recaptcha` + Firebase JS SDK

**Important:** The Firebase apps are currently registered under bundle IDs from a previous app:
- iOS: `com.example.myitemsCrud`
- Android: `com.example.myitems_crud`

To use your own bundle ID (e.g. `com.gachi.app`):
1. Go to Firebase Console → Project Settings → Add app
2. Register with `com.gachi.app` (iOS) and `com.gachi.app` (Android)
3. Download the new config files and replace the ones in the project root
4. Update `ios.bundleIdentifier` and `android.package` in `app.json`

For development/testing, the current config works fine.

## 5. Run the app
```bash
npx expo start
```

Then scan the QR code with Expo Go, or press `i` for iOS Simulator / `a` for Android.

## 6. Build for production
```bash
npx eas build --platform ios
npx eas build --platform android
```

## Project Structure
```
app/
  _layout.tsx          — Root navigation
  index.tsx            — Entry redirect
  onboarding/          — Onboarding slides
  auth/                — Registration flow (5 steps)
  (tabs)/              — Main tab screens
  match/               — Match flow screens
components/
  ui/                  — Design system components
  AddActivitySheet     — Bottom sheet for adding activities
constants/             — Colors, typography, categories
lib/                   — Supabase, Socket.io, OpenAI, notifications
store/                 — Zustand state management
supabase/              — Database schema
```

## Safety Note
SOS functionality sends push notifications to the trusted contact only.
No real phone calls or emergency service calls are made by the app.
Always instruct users to call 112 (Korea) / 911 (US) directly if in danger.
