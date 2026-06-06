import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';
import { supabase, getUser } from '@/lib/supabase';

export default function PhoneScreen() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setTempPhone, setProfile, setAuthenticated, setOnboardingComplete } = useAppStore();

  const handleRegister = async () => {
    const cleaned = phone.trim();
    if (cleaned.length < 6) { setError('Enter a valid phone number'); return; }
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setTempPhone(cleaned);
    setLoading(false);
    router.push('/auth/otp');
  };

  const handleLogin = async () => {
    const cleaned = phone.trim();
    if (cleaned.length < 6) { setError('Enter a valid phone number'); return; }
    setError('');
    setLoading(true);
    try {
      // Create a fresh anonymous session to get a valid auth.uid()
      const { data: sessionData, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;
      const uid = sessionData.user!.id;

      // Look up user row by phone number
      const { data: rows, error: lookupError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleaned)
        .limit(1);

      if (lookupError) throw lookupError;

      if (!rows || rows.length === 0) {
        setError('No account found with this number. Please register first.');
        setLoading(false);
        return;
      }

      const existing = rows[0];

      // Restore profile into store
      setProfile({
        id: uid,
        phone: existing.phone,
        name: existing.name ?? '',
        age: existing.age ?? undefined,
        photoUrl: existing.photo_url ?? undefined,
        trustedContact: existing.trusted_contact ?? undefined,
        selfieVerified: existing.selfie_verified ?? false,
        trustScore: existing.trust_score ?? 0,
        gpsConsent: false,
      });

      setOnboardingComplete(true);
      setAuthenticated(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[Login] error:', e?.message);
      setError(e?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <View style={styles.container}>
          <Image source={require("@/assets/gachi-logo-removebg-preview.png")} style={styles.logo} resizeMode="contain" />

          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              onPress={() => { setMode('register'); setError(''); }}
              style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                New here
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMode('login'); setError(''); }}
              style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>

          <GlassCard variant="strong" style={styles.card}>
            {mode === 'register' ? (
              <>
                <Text style={styles.title}>Enter your phone</Text>
                <Text style={styles.sub}>We'll send a verification code via SMS.</Text>
                <Text style={styles.step}>Step 1 of 5</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.sub}>Enter the phone number you registered with.</Text>
              </>
            )}

            <GlassInput
              label="Phone number (with country code)"
              value={phone}
              onChangeText={setPhone}
              placeholder="+82 10 1234 5678"
              keyboardType="phone-pad"
              autoFocus
              style={{ marginTop: 24 }}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label={mode === 'register' ? 'Send code →' : 'Sign in →'}
              onPress={mode === 'register' ? handleRegister : handleLogin}
              loading={loading}
              disabled={phone.length < 6}
              fullWidth
              style={{ marginTop: 24 }}
            />
          </GlassCard>

          <Text style={styles.legal}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, justifyContent: 'center', gap: 16 },
  logo: { width: 120, height: 40, alignSelf: 'center' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.glass.subtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.accentSoft, borderWidth: 1, borderColor: Colors.border.accent },
  toggleText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary },
  toggleTextActive: { color: Colors.accent },
  step: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary, marginTop: 6 },
  card: { width: '100%' },
  title: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary, marginBottom: 8 },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary },
  error: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.danger, marginTop: 8 },
  legal: {
    fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary,
    textAlign: 'center', paddingHorizontal: 16,
  },
});
