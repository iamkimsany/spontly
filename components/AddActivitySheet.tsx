import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ScrollView,
  TouchableWithoutFeedback, Switch, Alert, TextInput, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
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
  const slideAnim = useRef(new Animated.Value(700)).current;
  const { addActivity, profile, setActiveMatch, setPendingMatches, pendingMatches } = useAppStore();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 130,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 700,
        duration: 260,
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

  const placeholder = CATEGORIES.find((c) => c.id === category)?.examples ?? 'e.g. Hiking at Bukhansan';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <BlurView intensity={50} tint="dark" style={styles.blurSheet}>
          {/* Inner dark tint overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.darkOverlay} />
          </View>

          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <Text style={styles.title}>Add Activity</Text>
            <Text style={styles.sub}>What do you want to do?</Text>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                  style={[styles.chip, category === cat.id && styles.chipActive]}
                >
                  <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.chipLabel, category === cat.id && styles.chipLabelActive]} numberOfLines={1}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Input */}
            <Text style={styles.label}>What specifically?</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={placeholder}
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
              multiline={false}
              returnKeyType="done"
            />

            {/* Timeframe */}
            <Text style={styles.label}>When?</Text>
            <View style={styles.timeRow}>
              {TIMEFRAMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTimeframe(t.id)}
                  activeOpacity={0.7}
                  style={[styles.timeChip, timeframe === t.id && styles.timeChipActive]}
                >
                  <Text style={[styles.timeLabel, timeframe === t.id && styles.timeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Visibility toggle */}
            <View style={styles.visibilityCard}>
              <View style={styles.visibilityText}>
                <Text style={styles.visTitle}>Seeking company</Text>
                <Text style={styles.visSub}>Public — AI will find you a match</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(37,99,235,0.6)' }}
                thumbColor={isPublic ? '#2563EB' : 'rgba(255,255,255,0.5)'}
                ios_backgroundColor="rgba(255,255,255,0.15)"
              />
            </View>

            {/* Add button */}
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.85}
              disabled={loading}
              style={[styles.addButton, loading && { opacity: 0.6 }]}
            >
              <Text style={styles.addButtonText}>
                {loading ? 'Adding…' : 'Add to my list +'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,15,30,0.70)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '92%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
  },
  blurSheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,15,30,0.72)',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl ?? 26,
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 24,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Category chips
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: 'rgba(37,99,235,0.22)',
    borderColor: 'rgba(37,99,235,0.55)',
  },
  chipEmoji: { fontSize: 15 },
  chipLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  chipLabelActive: {
    color: '#ffffff',
    fontFamily: Fonts.bodyMedium,
  },

  // Input
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
  },

  // Timeframe
  timeRow: { flexDirection: 'row', gap: 10 },
  timeChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: 'rgba(37,99,235,0.22)',
    borderColor: 'rgba(37,99,235,0.55)',
  },
  timeLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.55)',
  },
  timeLabelActive: {
    color: '#ffffff',
  },

  // Visibility toggle card
  visibilityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  visibilityText: { flex: 1, marginRight: 16 },
  visTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.base,
    color: '#ffffff',
  },
  visSub: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },

  // Add button
  addButton: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 9999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  addButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.base,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
