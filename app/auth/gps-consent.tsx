import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GlassButton } from '@/components/ui/GlassButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';
import { supabase, upsertUser } from '@/lib/supabase';

const POINTS = [
  { icon: '🔐', text: 'GPS only activates 10 min before a confirmed meetup' },
  { icon: '🗑️', text: 'Location data is auto-deleted after 48 hours' },
  { icon: '📵', text: 'Never shared with third parties or used for ads' },
  { icon: '🛡️', text: 'Required for the Confirm Meetup button to work' },
];

async function createSupabaseSession(phone: string): Promise<string> {
  // Sign in anonymously so auth.uid() is real and RLS policies work.
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Supabase] Anonymous sign-in failed:', error.message);
    throw error;
  }
  const uid = data.user!.id;
  console.log('[Supabase] Anonymous session created, uid:', uid);
  return uid;
}

export default function GPSConsentScreen() {
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.45, 240);
  const logoHeight = logoWidth * 0.4;
  const { profile, setProfile, setAuthenticated } = useAppStore();

  const finishRegistration = async (gpsGranted: boolean) => {
    setLoading(true);
    try {
      // Create a real Supabase auth session so auth.uid() is non-null for RLS
      const uid = await createSupabaseSession(profile?.phone ?? '');

      const updatedProfile = {
        ...profile!,
        id: uid,
        gpsConsent: gpsGranted,
      };
      setProfile(updatedProfile);

      // Persist the user row so foreign-key references work
      await upsertUser({
        id: uid,
        phone: updatedProfile.phone,
        name: updatedProfile.name,
        age: updatedProfile.age,
        trusted_contact: updatedProfile.trustedContact ?? undefined,
        selfie_verified: updatedProfile.selfieVerified,
        trust_score: updatedProfile.trustScore,
      });
      console.log('[Supabase] User row upserted, id:', uid);

      setAuthenticated(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[Registration] finishRegistration error:', e);
      Alert.alert('Setup error', e.message ?? 'Could not complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAllow = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    await finishRegistration(status === 'granted');
  };

  const handleSkip = () => finishRegistration(false);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Image source={require("@/assets/gachi-logo-removebg-preview.png")} style={[styles.logo, { width: logoWidth, height: logoHeight }]} resizeMode="contain" />
        <Text style={styles.step}>Step 5 of 5</Text>

        <View style={styles.shieldWrap}>
          <Text style={styles.shieldIcon}>📍</Text>
        </View>

        <GlassCard variant="strong" style={styles.card}>
          <Text style={styles.title}>GPS consent</Text>
          <Text style={styles.sub}>
            Gachi uses your location to keep you safe during meetups — and only during meetups.
          </Text>

          <View style={styles.points}>
            {POINTS.map((p, i) => (
              <View key={i} style={styles.point}>
                <Text style={styles.pointIcon}>{p.icon}</Text>
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton
            label="Allow GPS access"
            onPress={handleAllow}
            loading={loading}
            fullWidth
            style={{ marginTop: 24 }}
          />
        </GlassCard>

        <GlassButton
          label="Skip for now (limits features)"
          onPress={handleSkip}
          fullWidth
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 16,
    justifyContent: 'center',
  },
  logo: { alignSelf: 'center' },
  step: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary, textAlign: 'center' },
  shieldWrap: { alignItems: 'center' },
  shieldIcon: { fontSize: 64 },
  card: { width: '100%' },
  title: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary, marginBottom: 8 },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  points: { gap: 14, marginTop: 20 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pointIcon: { fontSize: 20, width: 28 },
  pointText: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, flex: 1, lineHeight: 22 },
});
