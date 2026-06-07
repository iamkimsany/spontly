import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
    timeout: 30000,
  },
});

// ---- Users ----

export async function getUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertUser(user: {
  id: string;
  phone: string;
  name?: string;
  age?: number;
  photo_url?: string;
  trusted_contact?: string;
  selfie_verified?: boolean;
  trust_score?: number;
}) {
  const { data, error } = await supabase.from('users').upsert(user).select().single();
  if (error) throw error;
  return data;
}

// ---- Activities ----

export async function getUserActivities(userId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createActivity(activity: {
  user_id: string;
  category: string;
  title: string;
  timeframe: string;
  is_public: boolean;
  meeting_type?: 'solo' | 'group';
  max_group_size?: number | null;
  city?: string;
  district?: string;
}) {
  const { data, error } = await supabase.from('activities').insert(activity).select().single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleActivityVisibility(id: string, isPublic: boolean) {
  const { data, error } = await supabase
    .from('activities')
    .update({ is_public: isPublic })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- Matches ----

export async function getUserMatches(userId: string) {
  const { data, error } = await supabase
    .from('match_participants')
    .select(`
      match_id,
      confirmed,
      gps_active,
      matches (
        id, format, status, location, meetup_time, created_at,
        activities (id, title, category, user_id)
      )
    `)
    .eq('user_id', userId)
    .neq('matches.status', 'cancelled');
  if (error) throw error;
  return data ?? [];
}

export async function getMatchWithParticipants(matchId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, format, status, location, meetup_time, created_at,
      activities ( id, title, category ),
      match_participants ( user_id, confirmed, gps_active,
        users ( id, name, photo_url, trust_score )
      )
    `)
    .eq('id', matchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMatchStatus(matchId: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
  const { error } = await supabase.from('matches').update({ status }).eq('id', matchId);
  if (error) throw error;
}

export async function confirmMatch(matchId: string, userId: string) {
  const { error } = await supabase
    .from('match_participants')
    .update({ confirmed: true })
    .eq('match_id', matchId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateGpsActive(matchId: string, userId: string, gpsActive: boolean) {
  const { error } = await supabase
    .from('match_participants')
    .update({ gps_active: gpsActive })
    .eq('match_id', matchId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ---- Chat messages ----

export interface DbChatMessage {
  id: string;
  match_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export async function getChatMessages(matchId: string): Promise<DbChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendChatMessage(
  matchId: string,
  userId: string,
  content: string
): Promise<DbChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ match_id: matchId, user_id: userId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- Shared match loader (used by home screen + subscription hook) ----

import type { Match } from '@/store';

export async function loadActiveMatchForUser(userId: string): Promise<Match | null> {
  const rows = await getUserMatches(userId);
  const pending = rows.find((r: any) => {
    const m = r.matches;
    return m && (m.status === 'pending' || m.status === 'confirmed');
  });
  if (!pending) return null;

  const raw = await getMatchWithParticipants(pending.match_id);
  if (!raw) return null;

  return {
    id: raw.id,
    activityId: (raw.activities as any)?.id ?? '',
    activityTitle: (raw.activities as any)?.title ?? 'Activity',
    activityCategory: (raw.activities as any)?.category ?? '',
    format: raw.format as Match['format'],
    status: raw.status as Match['status'],
    location: raw.location ?? '',
    meetupTime: raw.meetup_time ?? new Date().toISOString(),
    participants: ((raw.match_participants as any[]) ?? []).map((p: any) => ({
      userId: p.user_id,
      name: p.users?.name ?? 'User',
      photoUrl: p.users?.photo_url ?? null,
      confirmed: p.confirmed,
      gpsActive: p.gps_active,
      trustScore: p.users?.trust_score ?? 40,
    })),
    createdAt: raw.created_at,
  };
}

function rawToMatch(raw: any): Match {
  return {
    id: raw.id,
    activityId: (raw.activities as any)?.id ?? '',
    activityTitle: (raw.activities as any)?.title ?? 'Activity',
    activityCategory: (raw.activities as any)?.category ?? '',
    format: raw.format as Match['format'],
    status: raw.status as Match['status'],
    location: raw.location ?? '',
    meetupTime: raw.meetup_time ?? new Date().toISOString(),
    participants: ((raw.match_participants as any[]) ?? []).map((p: any) => ({
      userId: p.user_id,
      name: p.users?.name ?? 'User',
      photoUrl: p.users?.photo_url ?? null,
      confirmed: p.confirmed,
      gpsActive: p.gps_active,
      trustScore: p.users?.trust_score ?? 40,
    })),
    createdAt: raw.created_at,
  };
}

export async function loadAllActiveMatchesForUser(userId: string): Promise<Match[]> {
  const rows = await getUserMatches(userId);
  const activeRows = (rows as any[]).filter((r) => {
    const m = r.matches;
    return m && (m.status === 'pending' || m.status === 'confirmed');
  });
  if (activeRows.length === 0) return [];
  const results = await Promise.all(
    activeRows.map((r) => getMatchWithParticipants(r.match_id))
  );
  return results
    .filter(Boolean)
    .map(rawToMatch)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ---- Ratings ----

export async function submitRating(rating: {
  match_id: string;
  rater_id: string;
  ratee_id: string;
  score: number;
  comment?: string;
}) {
  const { data, error } = await supabase.from('ratings').insert(rating).select().single();
  if (error) throw error;
  return data;
}

export async function incrementTrustScore(userId: string, points: number): Promise<void> {
  if (points <= 0) return;
  const { error } = await supabase.rpc('increment_trust_score', { user_id: userId, points });
  if (error) throw error;
}

// ---- Safety events ----

export async function logSafetyEvent(event: {
  match_id: string;
  user_id: string;
  zone: string;
  gps_lat?: number;
  gps_lng?: number;
}) {
  const { error } = await supabase.from('safety_events').insert({
    ...event,
    triggered_at: new Date().toISOString(),
  });
  if (error) throw error;
}
