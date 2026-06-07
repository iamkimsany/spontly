import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Settings } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GPSIndicator, GPSStatus } from '@/components/ui/GPSIndicator';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore, Match } from '@/store';
import { AddActivitySheet } from '@/components/AddActivitySheet';
import { MatchFoundPopup } from '@/components/MatchFoundPopup';
import { CATEGORIES } from '@/constants/categories';
import { getMatchWithParticipants, getUserMatches } from '@/lib/supabase';
import { useMatchSubscription } from '@/hooks/useMatchSubscription';

const NEARBY_DEMO = [
  { id: '1', name: 'Jung', activity: 'Hiking at Bukhansan', category: '🏃', time: 'Today' },
  { id: '2', name: 'Sara', activity: 'Sketching in the park', category: '🎨', time: 'Today' },
  { id: '3', name: 'Mia', activity: 'Salsa dance class', category: '🎵', time: 'This week' },
];

async function loadActiveMatch(
  userId: string,
  setActiveMatch: (m: Match | null) => void
) {
  try {
    const rows = await getUserMatches(userId);
    const pending = rows.find((r: any) => {
      const m = r.matches;
      return m && (m.status === 'pending' || m.status === 'confirmed');
    });
    if (!pending) return;
    const raw = await getMatchWithParticipants(pending.match_id);
    if (!raw) return;
    setActiveMatch({
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
      })),
      createdAt: raw.created_at,
    });
  } catch (e: any) {
    console.warn('[Home] Could not load active match:', e?.message);
  }
}

async function checkGPSStatus(setGpsActive: (v: boolean) => void): Promise<GPSStatus> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      // Confirm GPS is actually working (low-accuracy, fast)
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      if (loc) {
        setGpsActive(true);
        return 'ready';
      }
    }
  } catch {
    // permission denied or hardware unavailable
  }
  setGpsActive(false);
  return 'off';
}

export default function HomeScreen() {
  const { profile, activities, activeMatch, gpsActive, setActiveMatch, setGpsActive } = useAppStore();
  useMatchSubscription();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('off');
  const [matchPopup, setMatchPopup] = useState<{ title: string; participants: Match['participants'] } | null>(null);
  const seenMatchId = useRef<string | null>(null);

  // Check real GPS status on mount
  useEffect(() => {
    checkGPSStatus(setGpsActive).then(setGpsStatus);
  }, []);

  // Re-check GPS status every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      checkGPSStatus(setGpsActive).then(setGpsStatus);
    }, [])
  );

  // Load active match on mount and on manual refresh
  useEffect(() => {
    if (profile?.id) loadActiveMatch(profile.id, setActiveMatch);
  }, [profile?.id]);

  // Show match popup when a new match arrives
  useEffect(() => {
    if (activeMatch && activeMatch.id !== seenMatchId.current) {
      seenMatchId.current = activeMatch.id;
      setMatchPopup({
        title: activeMatch.activityTitle,
        participants: activeMatch.participants.filter((p) => p.userId !== profile?.id),
      });
    }
    if (!activeMatch) seenMatchId.current = null;
  }, [activeMatch?.id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.id) await loadActiveMatch(profile.id, setActiveMatch);
    setRefreshing(false);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        >
          {/* Header */}
          <GlassCard variant="regular" padding={{ vertical: 16, horizontal: 20 }} style={styles.header}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.greeting}>{greeting()}, {profile?.name ?? 'there'} 👋</Text>
                <Text style={styles.date}>{dateStr}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.settingsBtn} activeOpacity={0.5}>
                <Settings size={22} color="rgba(0,0,0,0.4)" />
              </TouchableOpacity>
            </View>
            <GPSIndicator status={gpsStatus} />
          </GlassCard>

          {/* Active match banner */}
          {activeMatch ? (
            <GlassCard variant="active" padding={20} style={styles.matchBanner}>
              {/* Top row: label + NOW badge */}
              <View style={styles.matchTopRow}>
                <Text style={styles.matchLabel}>🔥 Active Match</Text>
                <View style={styles.matchNow}>
                  <Text style={styles.nowText}>NOW</Text>
                </View>
              </View>
              <Text style={styles.matchTitle}>{activeMatch.activityTitle}</Text>
              {/* Bottom row: avatars + View button */}
              <View style={styles.matchBottomRow}>
                <View style={styles.matchParticipants}>
                  {activeMatch.participants.slice(0, 3).map((p, i) => (
                    <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0 }]}>
                      <Text style={styles.avatarText}>{p.name[0]}</Text>
                    </View>
                  ))}
                  {activeMatch.participants.length > 3 && (
                    <Text style={styles.moreText}>+{activeMatch.participants.length - 3}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewMatchBtn}
                  onPress={() => router.push('/match/active')}
                >
                  <Text style={styles.viewMatchText}>View →</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <GlassCard variant="subtle" padding={20} style={styles.noMatchBanner}>
              <Text style={styles.noMatchTitle}>No active match</Text>
              <Text style={styles.noMatchSub}>Add an activity to get matched with someone nearby.</Text>
            </GlassCard>
          )}

          {/* My activities */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Activities</Text>
            <TouchableOpacity onPress={() => setShowAddSheet(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityRow}>
            {activities.length === 0 && (
              <TouchableOpacity onPress={() => setShowAddSheet(true)}>
                <GlassCard variant="subtle" padding={16} style={styles.emptyChip}>
                  <Text style={styles.emptyChipText}>+ Add your first activity</Text>
                </GlassCard>
              </TouchableOpacity>
            )}
            {activities.slice(0, 6).map((a) => {
              const cat = CATEGORIES.find((c) => c.id === a.category);
              return (
                <GlassCard key={a.id} variant={a.isPublic ? 'active' : 'subtle'} padding={16} style={styles.activityChip}>
                  <Text style={styles.chipEmoji}>{cat?.emoji ?? '📌'}</Text>
                  <Text style={styles.chipTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.chipTime}>{a.timeframe.replace('_', ' ')}</Text>
                  {a.isPublic && <Text style={styles.publicDot}>●</Text>}
                </GlassCard>
              );
            })}
          </ScrollView>

          {/* Nearby right now */}
          <Text style={styles.sectionTitle}>Nearby Right Now</Text>
          <View style={styles.nearbyList}>
            {NEARBY_DEMO.map((item) => (
              <TouchableOpacity key={item.id} style={styles.nearbyTouchable} onPress={() => router.push('/match/found')}>
                <GlassCard variant="regular" padding={{ vertical: 0, horizontal: 18 }} style={styles.nearbyCard}>
                  <View style={styles.nearbyRow}>
                    <Text style={styles.nearbyEmoji}>{item.category}</Text>
                    <View style={styles.nearbyMiddle}>
                      <Text style={styles.nearbyName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.nearbyActivity} numberOfLines={1}>{item.activity}</Text>
                    </View>
                    <View style={styles.nearbyRight}>
                      <Text style={styles.nearbyTime}>{item.time}</Text>
                      <Text style={styles.nearbyArrow}>→</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <AddActivitySheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} />
      </SafeAreaView>

      <MatchFoundPopup
        visible={!!matchPopup}
        activityTitle={matchPopup?.title ?? ''}
        participants={matchPopup?.participants ?? []}
        onDismiss={() => setMatchPopup(null)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 16, alignItems: 'stretch', width: '100%' },
  header: { width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  date: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  settingsBtn: { padding: 8 },
  matchBanner: { width: '100%' },
  matchTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  matchBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  matchLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.accent },
  matchTitle: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  matchParticipants: { flexDirection: 'row' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.glass.strong,
    borderWidth: 1.5, borderColor: Colors.border.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.text.primary },
  moreText: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.secondary, marginLeft: 8, alignSelf: 'center' },
  viewMatchBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 9999,
  },
  viewMatchText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, color: Colors.text.dark },
  matchNow: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.border.accent,
  },
  nowText: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.accent, letterSpacing: 1 },
  noMatchBanner: { width: '100%' },
  noMatchTitle: { fontFamily: Fonts.displayMedium, fontSize: FontSize.base, color: Colors.text.primary, marginBottom: 4 },
  noMatchSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: Fonts.displayMedium, fontSize: FontSize.base, color: Colors.text.primary },
  addBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.border.accent,
  },
  addBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, color: Colors.accent },
  activityRow: { flexDirection: 'row' },
  activityChip: { width: 120, marginRight: 12, borderRadius: 16 },
  emptyChip: { borderRadius: 16, marginRight: 12 },
  emptyChipText: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary },
  chipEmoji: { fontSize: 24, marginBottom: 6 },
  chipTitle: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  chipTime: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  publicDot: { fontSize: 8, color: Colors.accent, marginTop: 6 },
  nearbyList: { gap: 10, width: '100%', alignSelf: 'stretch' },
  nearbyTouchable: { width: '100%', alignSelf: 'stretch' },
  // GlassCard wrapper — full width, fixed height so all cards are identical
  nearbyCard: { width: '100%', height: 76 },
  // Inner row fills the fixed-height card
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    height: 76,
    overflow: 'hidden',
  },
  nearbyEmoji: { fontSize: 22, width: 34, textAlign: 'center', flexShrink: 0 },
  nearbyMiddle: { flex: 1, overflow: 'hidden' },
  nearbyName: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  nearbyActivity: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  nearbyRight: { alignItems: 'flex-end', flexShrink: 0 },
  nearbyTime: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary },
  nearbyArrow: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.accent, marginTop: 4 },
});
