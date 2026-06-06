import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Animated,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';
import { submitRating } from '@/lib/supabase';

interface ParticipantRating {
  userId: string;
  name: string;
  score: number;
  comment: string;
}

/** Single animated star button */
function StarButton({
  filled,
  onPress,
}: {
  filled: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 6 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Star
          size={36}
          color={filled ? '#2563EB' : 'rgba(0,0,0,0.18)'}
          fill={filled ? '#2563EB' : 'transparent'}
          strokeWidth={1.6}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function RatingScreen() {
  const { activeMatch, profile } = useAppStore();

  React.useEffect(() => {
    if (!activeMatch) {
      router.replace('/(tabs)');
    }
  }, []);

  const defaultRatings: ParticipantRating[] =
    (activeMatch?.participants ?? [])
      .map((p) => ({ userId: p.userId, name: p.name, score: 0, comment: '' }));

  const [ratings, setRatings] = useState<ParticipantRating[]>(defaultRatings);
  const [submitting, setSubmitting] = useState(false);

  const setScore = (userId: string, score: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.userId === userId ? { ...r, score } : r))
    );
  };

  const setComment = (userId: string, comment: string) => {
    setRatings((prev) =>
      prev.map((r) => (r.userId === userId ? { ...r, comment } : r))
    );
  };

  const { markActivityCompleted } = useAppStore();

  const handleSubmit = async () => {
    if (ratings.length === 0) {
      if (activeMatch?.activityId) markActivityCompleted(activeMatch.activityId);
      useAppStore.setState({ activeMatch: null });
      router.replace('/(tabs)');
      return;
    }
    const unrated = ratings.filter((r) => r.score === 0);
    if (unrated.length > 0) {
      Alert.alert('Rate everyone', 'Please rate all participants before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      if (activeMatch?.id && profile?.id) {
        for (const r of ratings) {
          await submitRating({
            match_id: activeMatch.id,
            rater_id: profile.id,
            ratee_id: r.userId,
            score: r.score,
            comment: r.comment || undefined,
          }).catch((e: any) => console.warn('[Rating] submitRating error:', e?.message));
        }
      }
      if (activeMatch?.activityId) markActivityCompleted(activeMatch.activityId);
      useAppStore.setState({ activeMatch: null });
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header icon — large star */}
        <View style={styles.headerIcon}>
          <Star size={52} color="#2563EB" fill="#2563EB" strokeWidth={1.4} />
        </View>

        <Text style={styles.title}>Rate your meetup</Text>
        <Text style={styles.sub}>
          {ratings.length === 0
            ? 'You met up solo this time — no participants to rate.'
            : 'Your ratings help build a safe, trustworthy community. This step cannot be skipped.'}
        </Text>

        {ratings.map((r) => (
          <GlassCard key={r.userId} variant="strong" padding={24} style={styles.ratingCard}>
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>{r.name[0]}</Text>
              </View>
              <Text style={styles.personName}>{r.name}</Text>
            </View>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  filled={r.score >= star}
                  onPress={() => setScore(r.userId, star)}
                />
              ))}
            </View>

            {r.score > 0 && (
              <View style={styles.commentArea}>
                <GlassCard variant="subtle" padding={0} style={styles.commentCard}>
                  <TextInput
                    value={r.comment}
                    onChangeText={(t) => setComment(r.userId, t)}
                    placeholder="Add a comment (optional)"
                    placeholderTextColor={Colors.text.tertiary}
                    style={styles.commentInput}
                    multiline
                    maxLength={200}
                  />
                </GlassCard>
              </View>
            )}

            {r.score > 0 && (
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>
                  {['', '😕 Poor', '😐 Okay', '🙂 Good', '😊 Great', '🤩 Excellent'][r.score]}
                </Text>
              </View>
            )}
          </GlassCard>
        ))}

        <GlassCard variant="subtle" padding={16} style={styles.noteCard}>
          <Text style={styles.noteText}>
            🔒 Ratings are anonymous to participants but visible to moderators. Patterns of low
            ratings trigger an account review.
          </Text>
        </GlassCard>

        <PrimaryButton
          label={ratings.length === 0 ? 'Done →' : 'Submit Ratings →'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={ratings.length > 0 && ratings.some((r) => r.score === 0)}
          fullWidth
          style={{ marginTop: 8 }}
        />

        <View style={{ height: 60 }} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 64, gap: 16 },
  headerIcon: { alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: Fonts.display, fontSize: FontSize.xl, color: Colors.text.primary, textAlign: 'center' },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  ratingCard: { width: '100%' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.glass.strong,
    borderWidth: 1.5, borderColor: Colors.border.regular,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: Fonts.displayMedium, fontSize: FontSize.md, color: Colors.text.primary },
  personName: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  starsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 4 },
  commentArea: { marginTop: 16 },
  commentCard: { borderRadius: 14 },
  commentInput: {
    backgroundColor: Colors.glass.subtle,
    borderWidth: 1, borderColor: Colors.border.subtle,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.primary,
    minHeight: 72, textAlignVertical: 'top',
  },
  scorePill: {
    alignSelf: 'center', marginTop: 12,
    backgroundColor: Colors.glass.subtle,
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 9999,
  },
  scoreText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  noteCard: { borderRadius: 16 },
  noteText: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
});
