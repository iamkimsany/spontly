import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GlassButton } from '@/components/ui/GlassButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore, Match } from '@/store';

const DEMO_MATCH: Match = {
  id: 'match_001',
  activityId: 'act_001',
  activityTitle: 'Hiking at Bukhansan',
  activityCategory: 'sports',
  format: 'solo',
  status: 'pending',
  location: 'Bukhansan National Park, Seoul',
  meetupTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  participants: [
    { userId: 'user_jung', name: 'Jung', photoUrl: null, confirmed: true, gpsActive: false },
  ],
  createdAt: new Date().toISOString(),
};

export default function MatchFoundScreen() {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const { setActiveMatch, addOrUpdateActiveMatch } = useAppStore();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    ).start();
  }, []);

  const handleAccept = () => {
    setActiveMatch(DEMO_MATCH);
    addOrUpdateActiveMatch(DEMO_MATCH);
    router.push('/match/confirm');
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] });

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Lime glow pulse */}
        <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]} />

        <Animated.View
          style={[styles.content, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}
        >
          <Text style={styles.matchBadge}>✨ Match Found</Text>

          <GlassCard variant="active" padding={28} style={styles.card}>
            {/* Matched user */}
            <View style={styles.matchRow}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarInitial}>J</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchName}>Jung K.</Text>
                <Text style={styles.matchDetail}>Also wants to go hiking today</Text>
                <View style={styles.trustRow}>
                  <Text style={styles.trustScore}>Trust score: </Text>
                  <Text style={styles.trustValue}>72</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Activity info */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Activity</Text>
                <Text style={styles.infoValue}>🏃 {DEMO_MATCH.activityTitle}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Format</Text>
                <Text style={styles.infoValue}>
                  {DEMO_MATCH.format === 'solo' ? '1:1 Meetup' : 'Small Group'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{DEMO_MATCH.location}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>When</Text>
                <Text style={styles.infoValue}>
                  {new Date(DEMO_MATCH.meetupTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            <GlassCard variant="subtle" padding={14} style={styles.safetyNote}>
              <Text style={styles.safetyText}>
                🛡️ GPS protection and trusted contact alert will activate when you confirm.
              </Text>
            </GlassCard>
          </GlassCard>

          <View style={styles.actions}>
            <PrimaryButton
              label="Accept & Continue →"
              onPress={handleAccept}
              fullWidth
            />
            <GlassButton
              label="Not now"
              onPress={() => router.back()}
              fullWidth
            />
          </View>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  glowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.accentGlow,
    alignSelf: 'center',
    top: '25%',
  },
  content: { gap: 20 },
  matchBadge: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xxl,
    color: Colors.accent,
    textAlign: 'center',
  },
  card: { width: '100%' },
  matchRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatarLarge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.glass.strong,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary },
  matchName: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  matchDetail: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3 },
  trustRow: { flexDirection: 'row', marginTop: 6 },
  trustScore: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary },
  trustValue: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.xs, color: Colors.accent },
  divider: { height: 1, backgroundColor: Colors.border.accent, marginVertical: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoItem: { width: '47%' },
  infoLabel: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 3 },
  infoValue: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  safetyNote: { marginTop: 16, borderRadius: 14 },
  safetyText: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  actions: { gap: 12 },
});
