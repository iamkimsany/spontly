import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ScrollView,
  TouchableWithoutFeedback, Switch, Alert, TextInput,
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

const GROUP_SIZES = [3, 4, 5, 6, 8, '10+'] as const;
type GroupSize = typeof GROUP_SIZES[number];

export function AddActivitySheet({ visible, onClose }: Props) {
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState<'today' | 'this_week' | 'someday'>('today');
  const [isPublic, setIsPublic] = useState(true);
  const [meetingType, setMeetingType] = useState<'solo' | 'group'>('solo');
  const [maxGroupSize, setMaxGroupSize] = useState<GroupSize>(5);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(700)).current;
  const { addActivity, profile, setActiveMatch, addOrUpdateActiveMatch } = useAppStore();

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
    setMeetingType('solo');
    setMaxGroupSize(5);
  };

  const handleAdd = async () => {
    if (!category) { Alert.alert('Select a category'); return; }
    if (!title.trim()) { Alert.alert('Enter a title'); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData.session?.user?.id ?? null;
      const userId = profile?.id ?? authUid;
      if (!userId) {
        Alert.alert('Not signed in', 'Please complete registration before adding activities.');
        return;
      }

      const resolvedMaxSize = meetingType === 'group'
        ? (maxGroupSize === '10+' ? 10 : Number(maxGroupSize))
        : null;

      const payload = {
        user_id: userId,
        category,
        title: title.trim(),
        timeframe,
        is_public: isPublic,
        meeting_type: meetingType,
        max_group_size: resolvedMaxSize,
      };
      console.log('[AddActivity] Inserting:', JSON.stringify(payload, null, 2));

      let savedId: string;
      try {
        const saved = await createActivityInDB(payload);
        savedId = saved.id;
        console.log('[AddActivity] Insert SUCCESS — id:', savedId);
      } catch (dbErr: any) {
        console.error('[AddActivity] Insert FAILED:', dbErr?.message);
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

      // Only run 1:1 matching for solo activities
      if (isPublic && meetingType === 'solo' && !savedId.startsWith('local_')) {
        const activityTitle = title.trim();
        runMatching(savedId)
          .then(async (result) => {
            if (!result) return;
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
                addOrUpdateActiveMatch(storeMatch);
              }
            } catch (fetchErr: any) {
              console.warn('[AddActivity] Could not load match details:', fetchErr?.message);
            }
            scheduleLocalNotification(
              '🔥 Match found!',
              `Someone nearby also wants to: ${activityTitle}. Tap to view.`
            );
          })
          .catch((err) => {
            console.error('[AddActivity] Matching RPC error:', err?.message);
          });
      }
    } finally {
      setLoading(false);
    }
  };

  const placeholder = CATEGORIES.find((c) => c.id === category)?.examples ?? 'e.g. Hiking at Bukhansan';
  const isGroup = meetingType === 'group';
  const buttonLabel = loading
    ? (isGroup ? 'Creating…' : 'Adding…')
    : (isGroup ? 'Create Group Activity 🎉' : 'Add to my list +');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <BlurView intensity={60} tint="light" style={styles.blurSheet}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.lightOverlay} />
          </View>

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

            {/* Title input */}
            <Text style={styles.label}>What specifically?</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={placeholder}
              placeholderTextColor={Colors.text.tertiary}
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

            {/* ── MEET AS ── */}
            <Text style={styles.label}>Meet as</Text>
            <View style={styles.segmentRow}>
              {/* 1:1 Match */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setMeetingType('solo')}
                style={[styles.segmentBtn, !isGroup && styles.segmentBtnActive]}
              >
                <Text style={styles.segmentEmoji}>👤</Text>
                <Text style={[styles.segmentBtnLabel, !isGroup && styles.segmentBtnLabelActive]}>
                  1:1 Match
                </Text>
                <Text style={[styles.segmentDesc, !isGroup && styles.segmentDescActive]}>
                  AI finds you one person
                </Text>
              </TouchableOpacity>

              {/* Group */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setMeetingType('group')}
                style={[styles.segmentBtn, isGroup && styles.segmentBtnActive]}
              >
                <Text style={styles.segmentEmoji}>🎉</Text>
                <Text style={[styles.segmentBtnLabel, isGroup && styles.segmentBtnLabelActive]}>
                  Group
                </Text>
                <Text style={[styles.segmentDesc, isGroup && styles.segmentDescActive]}>
                  Anyone nearby can join
                </Text>
              </TouchableOpacity>
            </View>

            {/* Max group size — only shown when Group is selected */}
            {isGroup && (
              <>
                <Text style={styles.label}>Max people</Text>
                <View style={styles.sizeRow}>
                  {GROUP_SIZES.map((s) => (
                    <TouchableOpacity
                      key={String(s)}
                      activeOpacity={0.7}
                      onPress={() => setMaxGroupSize(s)}
                      style={[styles.sizeChip, maxGroupSize === s && styles.sizeChipActive]}
                    >
                      <Text style={[styles.sizeLabel, maxGroupSize === s && styles.sizeLabelActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Visibility toggle */}
            <View style={styles.visibilityCard}>
              <View style={styles.visibilityText}>
                <Text style={styles.visTitle}>Seeking company</Text>
                <Text style={styles.visSub}>Public — AI will find you a match</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: 'rgba(0,0,0,0.10)', true: 'rgba(37,99,235,0.6)' }}
                thumbColor={isPublic ? '#2563EB' : 'rgba(0,0,0,0.3)'}
                ios_backgroundColor="rgba(0,0,0,0.10)"
              />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.85}
              disabled={loading}
              style={[styles.addButton, loading && { opacity: 0.6 }]}
            >
              <Text style={styles.addButtonText}>{buttonLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '92%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  blurSheet: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  lightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginTop: 14, marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Category chips
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderColor: 'rgba(37,99,235,0.40)',
  },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  chipLabelActive: { color: Colors.accent, fontFamily: Fonts.bodyMedium },

  // Text input
  input: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)',
    borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 16,
    color: Colors.text.primary,
    fontFamily: Fonts.body, fontSize: FontSize.base,
  },

  // Timeframe
  timeRow: { flexDirection: 'row', gap: 10 },
  timeChip: {
    flex: 1, paddingVertical: 11, borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderColor: 'rgba(37,99,235,0.40)',
  },
  timeLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary },
  timeLabelActive: { color: Colors.accent },

  // ── MEET AS segmented control ──
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    gap: 4,
  },
  segmentBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  segmentEmoji: { fontSize: 20 },
  segmentBtnLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },
  segmentBtnLabelActive: { color: '#ffffff' },
  segmentDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  segmentDescActive: { color: 'rgba(255,255,255,0.85)' },

  // Max group size
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    minWidth: 44,
    alignItems: 'center',
  },
  sizeChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sizeLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary },
  sizeLabelActive: { color: '#ffffff' },

  // Visibility
  visibilityCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, padding: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  visibilityText: { flex: 1, marginRight: 16 },
  visTitle: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  visSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },

  // Submit button
  addButton: {
    marginTop: 28, paddingVertical: 16, borderRadius: 9999,
    backgroundColor: '#2563EB', alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 20,
    elevation: 10,
  },
  addButtonText: {
    fontFamily: Fonts.bodyMedium, fontSize: FontSize.base,
    color: '#ffffff', fontWeight: '600', letterSpacing: 0.2,
  },
});
