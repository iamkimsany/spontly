import React, { useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GlassButton } from '@/components/ui/GlassButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';

const CODE_LENGTH = 6;

export default function OTPScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.45, 240);
  const logoHeight = logoWidth * 0.4;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef<(TextInput | null)[]>([]);
  const phone = useAppStore((s) => s.tempPhone);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      digits.forEach((d, i) => { if (index + i < CODE_LENGTH) newCode[index + i] = d; });
      setCode(newCode);
      refs.current[Math.min(index + digits.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const newCode = [...code];
    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);
    if (text && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const full = code.join('');
    if (full.length < CODE_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      // Test mode: any 6-digit code is accepted
      await new Promise((r) => setTimeout(r, 700));
      router.push('/auth/profile-setup');
    } finally {
      setLoading(false);
    }
  };

  const full = code.join('');

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Image source={require("@/assets/gachi-logo-removebg-preview.png")} style={[styles.logo, { width: logoWidth, height: logoHeight }]} resizeMode="contain" />
          <Text style={styles.step}>Step 2 of 5</Text>

          <View style={styles.testBanner}>
            <Text style={styles.testBannerText}>🧪 Test mode — any 6-digit code works</Text>
          </View>

          <GlassCard variant="strong" style={styles.card}>
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.sub}>
              Enter any 6 digits to continue.{'\n'}
              <Text style={{ color: Colors.text.tertiary, fontSize: FontSize.sm }}>
                Phone: {phone}
              </Text>
            </Text>

            <View style={styles.codeRow}>
              {code.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { refs.current[i] = r; }}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[styles.codeInput, digit && styles.codeInputFilled]}
                  autoFocus={i === 0}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label="Verify →"
              onPress={handleVerify}
              loading={loading}
              disabled={full.length < CODE_LENGTH}
              fullWidth
              style={{ marginTop: 24 }}
            />
          </GlassCard>

          <GlassButton
            label="← Wrong number? Go back"
            onPress={() => router.back()}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    justifyContent: 'center',
    gap: 16,
  },
  testBanner: {
    backgroundColor: 'rgba(250,204,21,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  testBannerText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.warning,
  },
  logo: { alignSelf: 'center' },
  step: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary, textAlign: 'center' },
  card: { width: '100%' },
  title: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary, marginBottom: 8 },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  codeRow: {
    flexDirection: 'row', gap: 10, marginTop: 28, justifyContent: 'center',
  },
  codeInput: {
    width: 46, height: 56, borderRadius: 14,
    backgroundColor: Colors.glass.regular,
    borderWidth: 1, borderColor: Colors.border.regular,
    textAlign: 'center',
    fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary,
  },
  codeInputFilled: {
    borderColor: Colors.accent, backgroundColor: Colors.accentSoft,
  },
  error: {
    fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.danger,
    marginTop: 8, textAlign: 'center',
  },
});
