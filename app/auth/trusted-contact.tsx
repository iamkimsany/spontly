import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';

export default function TrustedContactScreen() {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const { profile, setProfile } = useAppStore();

  const handleContinue = () => {
    if (contact.replace(/\s/g, '').length < 8) {
      setError('Enter a valid phone number');
      return;
    }
    if (profile) {
      setProfile({ ...profile, trustedContact: contact });
    }
    router.push('/auth/gps-consent');
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Image source={require("@/assets/gachi-logo-removebg-preview.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.step}>Step 4 of 5</Text>

          <GlassCard variant="strong" style={styles.card}>
            <Text style={styles.title}>Trusted contact</Text>
            <Text style={styles.sub}>
              This person receives an alert with your location when you confirm a meetup — and an
              emergency alert if the safety system is triggered.
            </Text>

            <GlassCard variant="subtle" padding={16} style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔒 Their number is encrypted and only used for safety alerts. They won't be notified
                of your activities.
              </Text>
            </GlassCard>

            <GlassInput
              label="Trusted contact phone number"
              value={contact}
              onChangeText={setContact}
              placeholder="+82 10 9876 5432"
              keyboardType="phone-pad"
              autoFocus
              style={{ marginTop: 16 }}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label="Continue →"
              onPress={handleContinue}
              disabled={contact.length < 6}
              fullWidth
              style={{ marginTop: 24 }}
            />
          </GlassCard>
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
  logo: { width: 200, height: 80, alignSelf: 'center' },
  step: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary, textAlign: 'center' },
  card: { width: '100%' },
  title: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary, marginBottom: 8 },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  infoBox: { marginTop: 16, borderRadius: 14 },
  infoText: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  error: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.danger, marginTop: 8 },
});
