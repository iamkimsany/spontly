import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { Settings } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GPSIndicator, GPSStatus } from '@/components/ui/GPSIndicator';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore, Match } from '@/store';
import { AddActivitySheet } from '@/components/AddActivitySheet';
import { MatchFoundPopup } from '@/components/MatchFoundPopup';
import { CATEGORIES } from '@/constants/categories';
import { loadAllActiveMatchesForUser } from '@/lib/supabase';
import { useMatchSubscription } from '@/hooks/useMatchSubscription';

const NEARBY_DEMO = [
  { id: '1', name: 'Jung', activity: 'Hiking at Bukhansan', category: '🏃', time: 'Today' },
  { id: '2', name: 'Sara', activity: 'Sketching in the park', category: '🎨', time: 'Today' },
  { id: '3', name: 'Mia', activity: 'Salsa dance class', category: '🎵', time: 'This week' },
];

async function checkGPSStatus(setGpsActive: (v: boolean) => void): Promise<GPSStatus> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      if (loc) { setGpsActive(true); return 'ready'; }
    }
  } catch { /* permission denied or hardware unavailable */ }
  setGpsActive(false);
  return 'off';
}

// ─── Match stack component ────────────────────────────────────────────────────

function formatMatchTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'NOW';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatBadge(match: Match): string {
  if (match.format === 'solo') return '1:1';
  const count = match.participants.length;
  return `Group · ${count}`;
}

interface MatchCardProps {
  match: Match;
  index: number;
  expanded: boolean;
  onView: () => void;
}

function MatchCard({ match, index, expanded, onView }: MatchCardProps) {
  const isNow = formatMatchTime(match.createdAt) === 'NOW';
  const others = match.participants.slice(0, 3);
  const extra = match.participants.length - 3;

  // Stacked visual for non-first cards when collapsed
  const stackOpacity = expanded ? 1 : index === 0 ? 1 : index === 1 ? 0.85 : 0.7;
  const stackScale = expanded ? 1 : index === 0 ? 1 : index === 1 ? 0.97 : 0.94;
  const stackMarginTop = (!expanded && index > 0) ? -14 : 0;

  return (
    <View
      style={[
        stackStyles.wrapper,
        { marginTop: stackMarginTop, opacity: stackOpacity, transform: [{ scale: stackScale }] },
      ]}
    >
      <GlassCard variant="active" padding={18} style={stackStyles.card}>
        {/* Top row */}
        <View style={stackStyles.topRow}>
          <Text style={stackStyles.label}>🔥 Active Match</Text>
          <View style={[stackStyles.timeBadge, isNow && stackStyles.timeBadgeNow]}>
            <Text style={[stackStyles.timeText, isNow && stackStyles.timeTextNow]}>
              {formatMatchTime(match.createdAt)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={stackStyles.title} numberOfLines={1}>{match.activityTitle}</Text>

        {/* Bottom row */}
        <View style={stackStyles.bottomRow}>
          <View style={stackStyles.avatarRow}>
            {others.map((p, i) => (
              <View key={i} style={[stackStyles.avatar, i > 0 && { marginLeft: -8 }]}>
                <Text style={stackStyles.avatarText}>{p.name[0]}</Text>
              </View>
            ))}
            {extra > 0 && (
              <Text style={stackStyles.extra}>+{extra}</Text>
            )}
          </View>
          <View style={stackStyles.rightRow}>
            <View style={stackStyles.formatBadge}>
              <Text style={stackStyles.formatText}>{formatBadge(match)}</Text>
            </View>
            <TouchableOpacity style={stackStyles.viewBtn} onPress={onView} activeOpacity={0.8}>
              <Text style={stackStyles.viewBtnText}>View →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

interface MatchStackProps {
  matches: Match[];
  onView: (match: Match) => void;
}

function MatchStack({ matches, onView }: MatchStackProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? matches : matches.slice(0, 3);

  if (matches.length === 0) {
    return (
      <GlassCard variant="subtle" padding={20} style={{ width: '100%' }}>
        <Text style={stackStyles.noMatchTitle}>No active match</Text>
        <Text style={stackStyles.noMatchSub}>Add an activity to get matched with someone nearby.</Text>
      </GlassCard>
    );
  }

  return (
    <View style={stackStyles.stackOuter}>
      {/* Section title + counter */}
      <TouchableOpacity
        style={stackStyles.stackHeader}
        onPress={() => matches.length > 1 && setExpanded((e) => !e)}
        activeOpacity={matches.length > 1 ? 0.6 : 1}
      >
        <Text style={stackStyles.stackTitle}>
          {matches.length === 1 ? 'Active Match' : `Active Matches`}
        </Text>
        {matches.length > 1 && (
          <View style={stackStyles.countBadge}>
            <Text style={stackStyles.countText}>{matches.length}</Text>
          </View>
        )}
        {matches.length > 1 && (
          <Text style={stackStyles.expandHint}>{expanded ? '↑ collapse' : '↓ expand'}</Text>
        )}
      </TouchableOpacity>

      {/* Cards */}
      <TouchableOpacity
        activeOpacity={matches.length > 1 && !expanded ? 0.9 : 1}
        onPress={() => matches.length > 1 && !expanded && setExpanded(true)}
        style={stackStyles.stackCards}
      >
        {visible.map((m, i) => (
          <MatchCard
            key={m.id}
            match={m}
            index={i}
            expanded={expanded}
            onView={() => onView(m)}
          />
        ))}
        {!expanded && matches.length > 3 && (
          <Text style={stackStyles.moreHint}>+{matches.length - 3} more · tap to expand</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Home screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const {
    profile, activities, activeMatches, gpsActive,
    setActiveMatch, setActiveMatches, setGpsActive,
  } = useAppStore();
  useMatchSubscription();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('off');
  const [matchPopup, setMatchPopup] = useState<{ title: string; participants: Match['participants'] } | null>(null);
  const seenMatchIds = useRef<Set<string>>(new Set());

  useEffect(() => { checkGPSStatus(setGpsActive).then(setGpsStatus); }, []);
  useFocusEffect(useCallback(() => { checkGPSStatus(setGpsActive).then(setGpsStatus); }, []));

  // Load all active matches on mount
  useEffect(() => {
    if (profile?.id) {
      loadAllActiveMatchesForUser(profile.id)
        .then(setActiveMatches)
        .catch((e: any) => console.warn('[Home] Could not load matches:', e?.message));
    }
  }, [profile?.id]);

  // Show popup for any new match
  useEffect(() => {
    for (const m of activeMatches) {
      if (!seenMatchIds.current.has(m.id)) {
        seenMatchIds.current.add(m.id);
        setMatchPopup({
          title: m.activityTitle,
          participants: m.participants.filter((p) => p.userId !== profile?.id),
        });
        break; // show one popup at a time
      }
    }
  }, [activeMatches.map((m) => m.id).join(',')]);

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
    if (profile?.id) {
      const matches = await loadAllActiveMatchesForUser(profile.id).catch(() => []);
      setActiveMatches(matches);
    }
    setRefreshing(false);
  };

  const handleViewMatch = (match: Match) => {
    setActiveMatch(match);
    router.push('/match/active');
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

          {/* Active matches stack */}
          <MatchStack matches={activeMatches} onView={handleViewMatch} />

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

// ─── Stack styles ─────────────────────────────────────────────────────────────

const stackStyles = StyleSheet.create({
  stackOuter: { width: '100%', gap: 0 },
  stackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  stackTitle: { fontFamily: Fonts.displayMedium, fontSize: FontSize.base, color: Colors.text.primary },
  countBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: '#ffffff' },
  expandHint: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginLeft: 'auto' as any },
  stackCards: { width: '100%' },
  wrapper: { width: '100%' },
  card: { width: '100%' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.accent },
  timeBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 9999, borderWidth: 1, borderColor: Colors.border.accent,
  },
  timeBadgeNow: { backgroundColor: Colors.accent },
  timeText: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.accent, letterSpacing: 0.8 },
  timeTextNow: { color: '#ffffff' },
  title: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary, marginBottom: 14 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.glass.strong,
    borderWidth: 1.5, borderColor: Colors.border.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.text.primary },
  extra: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.secondary, marginLeft: 8 },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formatBadge: {
    backgroundColor: Colors.glass.subtle,
    borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border.subtle,
  },
  formatText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.text.secondary },
  viewBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 9999,
  },
  viewBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, color: Colors.text.dark },
  moreHint: {
    fontFamily: Fonts.body, fontSize: FontSize.xs,
    color: Colors.text.tertiary, textAlign: 'center',
    paddingTop: 6,
  },
  noMatchTitle: { fontFamily: Fonts.displayMedium, fontSize: FontSize.base, color: Colors.text.primary, marginBottom: 4 },
  noMatchSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 16, alignItems: 'stretch', width: '100%' },
  header: { width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  date: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  settingsBtn: { padding: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: Fonts.displayMedium, fontSize: FontSize.base, color: Colors.text.primary },
  addBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 9999, borderWidth: 1, borderColor: Colors.border.accent,
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
  nearbyCard: { width: '100%', height: 76 },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', height: 76, overflow: 'hidden' },
  nearbyEmoji: { fontSize: 22, width: 34, textAlign: 'center', flexShrink: 0 },
  nearbyMiddle: { flex: 1, overflow: 'hidden' },
  nearbyName: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  nearbyActivity: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  nearbyRight: { alignItems: 'flex-end', flexShrink: 0 },
  nearbyTime: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary },
  nearbyArrow: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.accent, marginTop: 4 },
});
