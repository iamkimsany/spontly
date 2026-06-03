import { create } from 'zustand';

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  age: number;
  photoUrl: string | null;
  trustScore: number;
  selfieVerified: boolean;
  trustedContact: string | null;
  gpsConsent: boolean;
}

export interface Activity {
  id: string;
  userId: string;
  category: string;
  title: string;
  timeframe: 'today' | 'this_week' | 'someday';
  isPublic: boolean;
  location?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  activityId: string;
  activityTitle: string;
  activityCategory: string;
  format: 'solo' | 'small_group' | 'large_group';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  location: string;
  meetupTime: string;
  participants: MatchParticipant[];
  createdAt: string;
}

export interface MatchParticipant {
  userId: string;
  name: string;
  photoUrl: string | null;
  confirmed: boolean;
  gpsActive: boolean;
}

export type SafetyZone = 'green' | 'yellow' | 'red' | 'black' | 'sos';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  registrationStep: 'phone' | 'otp' | 'profile' | 'trusted_contact' | 'gps' | 'complete';
  tempPhone: string;

  // User
  profile: UserProfile | null;

  // Activities
  activities: Activity[];

  // Matches
  activeMatch: Match | null;
  pendingMatches: Match[];
  completedActivityIds: string[];

  // Safety
  gpsActive: boolean;
  safetyZone: SafetyZone;
  currentLocation: { latitude: number; longitude: number } | null;

  // Actions
  setAuthenticated: (v: boolean) => void;
  setOnboardingComplete: (v: boolean) => void;
  setRegistrationStep: (step: AppState['registrationStep']) => void;
  setTempPhone: (phone: string) => void;
  setProfile: (profile: UserProfile) => void;
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  setActiveMatch: (match: Match | null) => void;
  setPendingMatches: (matches: Match[]) => void;
  markActivityCompleted: (activityId: string) => void;
  setGpsActive: (v: boolean) => void;
  setSafetyZone: (zone: SafetyZone) => void;
  setCurrentLocation: (loc: { latitude: number; longitude: number } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  onboardingComplete: false,
  registrationStep: 'phone',
  tempPhone: '',
  profile: null,
  activities: [],
  activeMatch: null,
  pendingMatches: [],
  completedActivityIds: [],
  gpsActive: false,
  safetyZone: 'green',
  currentLocation: null,

  setAuthenticated: (v) => set({ isAuthenticated: v }),
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),
  setRegistrationStep: (step) => set({ registrationStep: step }),
  setTempPhone: (phone) => set({ tempPhone: phone }),
  setProfile: (profile) => set({ profile }),
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) => set((s) => ({ activities: [...s.activities, activity] })),
  removeActivity: (id) => set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),
  setActiveMatch: (match) => set({ activeMatch: match }),
  setPendingMatches: (matches) => set({ pendingMatches: matches }),
  markActivityCompleted: (activityId) => set((s) => ({
    completedActivityIds: s.completedActivityIds.includes(activityId)
      ? s.completedActivityIds
      : [...s.completedActivityIds, activityId],
  })),
  setGpsActive: (v) => set({ gpsActive: v }),
  setSafetyZone: (zone) => set({ safetyZone: zone }),
  setCurrentLocation: (loc) => set({ currentLocation: loc }),
}));
