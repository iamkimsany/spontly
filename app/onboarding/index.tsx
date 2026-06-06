import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'problem',
    headline: 'Want to do something.\nNo one to do it with.',
    sub: "You're not alone — 100,000 people said the same thing. Gachi fixes that.",
    cta: 'See how it works →',
    badge: null,
  },
  {
    key: 'solution',
    headline: 'Add what you want to do',
    sub: 'AI finds people nearby who want the same thing right now. No swiping. No awkward DMs.',
    cta: 'And stay safe →',
    badge: null,
    preview: true,
  },
  {
    key: 'safety',
    headline: 'Built safe\nfrom day one',
    sub: 'Every meetup is protected by GPS tracking, trusted contact alerts, and AI monitoring.',
    cta: 'Get started',
    chips: ['GPS protection', 'Trusted contact', 'AI detector'],
  },
];

export default function OnboardingScreen() {
  const [slide, setSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: W * index, animated: true });
    setSlide(index);
  };

  const handleCTA = () => {
    if (slide < 2) {
      goTo(slide + 1);
    } else {
      setOnboardingComplete(true);
      router.replace('/auth/phone');
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.slide, { width: W }]}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <Text style={styles.logo}>⚡ Gachi</Text>
            </View>

            <View style={styles.content}>
              {s.key === 'solution' && (
                <GlassCard variant="strong" style={styles.previewCard} padding={16}>
                  <View style={styles.previewRow}>
                    <View style={styles.previewChip}>
                      <Text style={styles.previewChipText}>🏃 Hiking — Today</Text>
                    </View>
                  </View>
                  <View style={[styles.previewRow, { marginTop: 10 }]}>
                    <GlassCard variant="active" padding={12} style={{ flex: 1 }}>
                      <Text style={styles.previewMatchLabel}>Match found!</Text>
                      <Text style={styles.previewMatchSub}>Jung also wants to hike today</Text>
                    </GlassCard>
                  </View>
                </GlassCard>
              )}

              {s.key === 'safety' && (
                <View style={styles.shieldContainer}>
                  <Text style={styles.shieldIcon}>🛡️</Text>
                  <View style={styles.shieldGlow} />
                </View>
              )}

              <GlassCard variant="strong" style={styles.card} padding={{ vertical: 32, horizontal: 28 }}>
                <Text style={styles.headline}>{s.headline}</Text>
                <Text style={styles.sub}>{s.sub}</Text>

                {s.chips && (
                  <View style={styles.chips}>
                    {s.chips.map((chip) => (
                      <GlassCard key={chip} variant="subtle" padding={8} style={styles.chip}>
                        <Text style={styles.chipText}>{chip}</Text>
                      </GlassCard>
                    ))}
                  </View>
                )}

                <PrimaryButton
                  label={s.cta}
                  onPress={handleCTA}
                  fullWidth
                  style={{ marginTop: 28 }}
                />
              </GlassCard>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === slide && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.accent,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  card: {
    width: '100%',
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
    lineHeight: 36,
    marginBottom: 14,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  chip: {
    borderRadius: 10,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  shieldContainer: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  shieldIcon: {
    fontSize: 72,
  },
  shieldGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accentGlow,
    top: -20,
  },
  previewCard: {
    width: '100%',
  },
  previewRow: {
    flexDirection: 'row',
  },
  previewChip: {
    backgroundColor: Colors.glass.subtle,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  previewChipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  previewMatchLabel: {
    fontFamily: Fonts.displayMedium,
    fontSize: FontSize.base,
    color: Colors.accent,
  },
  previewMatchSub: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 4,
  },
});
