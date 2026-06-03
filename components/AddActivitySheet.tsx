import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ScrollView,
  TouchableWithoutFeedback, Switch, Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassCard } from './ui/GlassCard';
import { GlassInput } from './ui/GlassInput';
import { PrimaryButton } from './ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { CATEGORIES, CategoryId } from '@/constants/categories';
import { useAppStore, Activity, Match } from '@/store';
import { createActivity as createActivityInDB, supabase, getMatchWithParticipants } from '@/lib/supabase';
import { runMatching } from '@/lib/matching';
import { scheduleLocalNotification } from '@/lib/notifications';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TIMEFRAMES = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'someday', label: 'Someday' },
] as const;

export function AddActivitySheet({ visible, onClose }: Props) {
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState<'today' | 'this_week' | 'someday'>('today');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const { addActivity, profile, setActiveMatch, setPendingMatches, pendingMatches } = useAppStore();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const reset = () => {
    setCategory(null);
    setTitle('');
    setTimeframe('today');
    setIsPublic(true);
  };

  const handleAdd = async () => {
    if (!category) { Alert.alert('Select a category'); return; }
    if (!title.trim()) { Alert.alert('Enter a title'); return; }
    setLoading(true);
    try {
      // 1. Log current auth session for debugging
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user?.id ?? null;
      console.log('[AddActivity] auth.uid():', authUid);
      console.log('[AddActivity] profile.id:', profile?.id);

      const userId = profile?.id ?? authUid;
      if (!userId) {
        Alert.alert('Not signed in', 'Please complete registration before adding activities.');
        return;
      }

      const payload = {
        user_id: userId,
        category,
        title: title.trim(),
        timeframe,
        is_public: isPublic,
      };
      console.log('[AddActivity] Inserting into Supabase:', JSON.stringify(payload, null, 2));

      // 2. Insert activity into Supabase
      let savedId: string;
      try {
        const saved = await createActivityInDB(payload);
        savedId = saved.id;
        console.log('[AddActivity] Insert SUCCESS — id:', savedId);
      } catch (dbErr: any) {
        console.error(
          '[AddActivity] Insert FAILED — message:', dbErr?.message,
          '| code:', dbErr?.code,
          '| details:', dbErr?.details,
          '| hint:', dbErr?.hint
        );
        Alert.alert(
          'Could not save to database',
          `${dbErr?.message ?? 'Unknown error'}\n\nActivity saved locally only.`
        );
        savedId = `local_${Date.now()}`;
      }

      // 3. Add to local Zustand state immediately so UI updates
      const activity: Activity = {
        id: savedId,
        userId,
        category,
        title: title.trim(),
        timeframe,
        isPublic,
        createdAt: new Date().toISOString(),
      };
      addActivity(activity);
      reset();
      onClose();

      // 4. Run matching in background for public activities (non-blocking)
      if (isPublic && !savedId.startsWith('local_')) {
        const activityTitle = title.trim();
        console.log('[AddActivity] Activity is public — running matching for id:', savedId);
        runMatching(savedId)
          .then(async (result) => {
            if (!result) {
              console.log('[AddActivity] Matching: no candidates yet');
              return;
            }
            console.log('[AddActivity] Matching: MATCH CREATED —', JSON.stringify(result));

            // Fetch full match + participants and push into store
            try {
              const raw = await getMatchWithParticipants(result.matchId);
              if (raw) {
                const storeMatch: Match = {
                  id: raw.id,
                  activityId: (raw.activities as any)?.id ?? savedId,
                  activityTitle: (raw.activities as any)?.title ?? activityTitle,
                  activityCategory: (raw.activities as any)?.category ?? category ?? '',
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
                };
                setActiveMatch(storeMatch);
                console.log('[AddActivity] Store updated with active match');
              }
            } catch (fetchErr: any) {
              // RLS policy not yet deployed — match still exists in DB, just can't read it yet
              console.warn('[AddActivity] Could not load match details (RLS policy may be missing):', fetchErr?.message);
            }

            scheduleLocalNotification(
              '🔥 Match found!',
              `Someone nearby also wants to: ${activityTitle}. Tap to view.`
            );
          })
          .catch((err) => {
            console.error('[AddActivity] Matching RPC error:', err?.message, err?.code, err?.hint);
          });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <BlurView intensity={40} tint="dark" style={styles.blurSheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Add Activity</Text>
            <Text style={styles.sub}>What do you want to do?</Text>

            {/* Category grid */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[styles.catItem, category === cat.id && styles.catItemActive]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]} numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <GlassInput
              label="What specifically?"
              value={title}
              onChangeText={setTitle}
              placeholder={CATEGORIES.find((c) => c.id === category)?.examples ?? 'e.g. Hiking at Bukhansan'}
              style={{ marginTop: 4 }}
            />

            {/* Timeframe */}
            <Text style={styles.label}>When?</Text>
            <View style={styles.timeRow}>
              {TIMEFRAMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTimeframe(t.id)}
                  style={[styles.timeChip, timeframe === t.id && styles.timeChipActive]}
                >
                  <Text style={[styles.timeLabel, timeframe === t.id && styles.timeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Visibility */}
            <View style={styles.visibilityRow}>
              <View>
                <Text style={styles.visLabel}>Seeking company</Text>
                <Text style={styles.visSub}>Public — AI will find you a match</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: Colors.glass.regular, true: Colors.accentSoft }}
                thumbColor={isPublic ? Colors.accent : Colors.text.tertiary}
              />
            </View>

            <PrimaryButton
              label="Add to my list +"
              onPress={handleAdd}
              loading={loading}
              fullWidth
              style={{ marginTop: 8, marginBottom: 32 }}
            />
          </ScrollView>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  blurSheet: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.regular,
    backgroundColor: 'rgba(10,10,26,0.85)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.regular,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary, marginBottom: 6 },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, marginBottom: 20 },
  label: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 10, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.glass.subtle,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  catItemActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.border.accent,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  catLabelActive: { color: Colors.accent },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.glass.subtle,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
  },
  timeChipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.border.accent },
  timeLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary },
  timeLabelActive: { color: Colors.accent },
  visibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.glass.subtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  visLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  visSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
});
