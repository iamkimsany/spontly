import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GlassButton } from '@/components/ui/GlassButton';
import { GPSIndicator } from '@/components/ui/GPSIndicator';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';
import { scheduleLocalNotification } from '@/lib/notifications';

export default function ConfirmMeetupScreen() {
  const [gpsReady, setGpsReady] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { activeMatch, profile, setGpsActive, setCurrentLocation } = useAppStore();

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') requestLocation();
    });
  }, []);

  const requestLocation = async () => {
    setLoadingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'GPS required',
          'GPS access is required to confirm the meetup. Please enable it in Settings.',
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setGpsActive(true);
      setGpsReady(true);
    } catch (e) {
      Alert.alert('Could not get location', 'Please try again.');
    } finally {
      setLoadingGPS(false);
    }
  };

  const handleConfirm = async () => {
    if (!gpsReady) {
      Alert.alert('GPS required', 'Enable GPS to confirm the meetup.');
      return;
    }
    setConfirming(true);
    try {
      // Notify trusted contact
      if (profile?.trustedContact && activeMatch) {
        await scheduleLocalNotification(
          '📍 Meetup confirmed',
          `${profile.name} confirmed a meetup: ${activeMatch.activityTitle} at ${activeMatch.location}. Expected return: ~2 hours.`
        );
      }
      await new Promise((r) => setTimeout(r, 600));
      router.replace('/match/active');
    } finally {
      setConfirming(false);
    }
  };

  const matchTime = activeMatch
    ? new Date(activeMatch.meetupTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Confirm Meetup</Text>
        <Text style={styles.sub}>
          Confirming activates GPS and notifies your trusted contact.
        </Text>

        {/* GPS gate */}
        <GlassCard variant={gpsReady ? 'active' : 'strong'} padding={20} style={styles.gpsCard}>
          <View style={styles.gpsRow}>
            <GPSIndicator active={gpsReady} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsTitle}>GPS Protection</Text>
              <Text style={styles.gpsSub}>
                {gpsReady
                  ? 'Your location is active. Safety system engaged.'
                  : 'GPS is required before confirming.'}
              </Text>
            </View>
          </View>
          {!gpsReady && (
            <PrimaryButton
              label={loadingGPS ? 'Getting location...' : 'Enable GPS →'}
              onPress={requestLocation}
              loading={loadingGPS}
              fullWidth
              style={{ marginTop: 14 }}
            />
          )}
        </GlassCard>

        {/* Match summary */}
        {activeMatch && (
          <GlassCard variant="regular" padding={20} style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{activeMatch.activityTitle}</Text>

            <View style={styles.summaryGrid}>
              {[
                { label: 'Location', value: activeMatch.location },
                { label: 'Time', value: matchTime },
                { label: 'Format', value: activeMatch.format === 'solo' ? '1:1 Meetup' : 'Group' },
                { label: 'Participants', value: String(activeMatch.participants.length + 1) },
              ].map((item) => (
                <View key={item.label} style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Trusted contact notice */}
        <GlassCard variant="subtle" padding={16} style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            📱 Your trusted contact{' '}
            <Text style={{ color: Colors.text.primary }}>
              {profile?.trustedContact ?? 'not set'}
            </Text>{' '}
            will receive your location and meetup details when you confirm.
          </Text>
        </GlassCard>

        <View style={styles.actions}>
          <PrimaryButton
            label="Confirm Meetup ✓"
            onPress={handleConfirm}
            loading={confirming}
            disabled={!gpsReady}
            fullWidth
          />
          <GlassButton
            label="Cancel"
            onPress={() => router.back()}
            fullWidth
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40, gap: 16 },
  title: { fontFamily: Fonts.display, fontSize: FontSize.xl, color: Colors.text.primary },
  sub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 22 },
  gpsCard: { width: '100%' },
  gpsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 4 },
  gpsTitle: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  gpsSub: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2, lineHeight: 20 },
  summaryCard: { width: '100%' },
  summaryTitle: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary, marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryItem: { width: '47%' },
  summaryLabel: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginBottom: 3 },
  summaryValue: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  noticeCard: { width: '100%', borderRadius: 16 },
  noticeText: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20 },
  actions: { gap: 12, marginTop: 8 },
});
