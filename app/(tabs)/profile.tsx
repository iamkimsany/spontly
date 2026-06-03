import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { TrustScoreRing } from '@/components/ui/TrustScoreRing';
import { GPSIndicator } from '@/components/ui/GPSIndicator';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';

const COMPANIONS_DEMO = [
  { name: 'Jung', activity: 'Hiking', initials: 'JK' },
  { name: 'Sara', activity: 'Sketching', initials: 'SM' },
];

const HISTORY_DEMO = [
  { id: '1', title: 'Bukhansan Hike', date: 'Jun 1, 2026', rating: 5, participants: 2 },
  { id: '2', title: 'Salsa Night', date: 'May 28, 2026', rating: 4, participants: 6 },
  { id: '3', title: 'Photography Walk', date: 'May 20, 2026', rating: 5, participants: 3 },
];

export default function ProfileScreen() {
  const { profile, gpsActive, setAuthenticated, setOnboardingComplete } = useAppStore();

  const handleSignOut = () => {
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setAuthenticated(false);
          setOnboardingComplete(false);
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const trustLabels = [
    { label: 'Phone verified', done: true },
    { label: 'Selfie verified', done: profile?.selfieVerified ?? false },
    { label: 'Trusted contact', done: !!profile?.trustedContact },
    { label: 'GPS consent', done: profile?.gpsConsent ?? false },
    { label: 'Completed activities', done: HISTORY_DEMO.length > 0 },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.pageTitle}>Profile</Text>
            <TouchableOpacity onPress={handleSignOut}>
              <Text style={styles.signOut}>Sign out</Text>
            </TouchableOpacity>
          </View>

          {/* Profile card */}
          <GlassCard variant="strong" padding={24} style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.avatarLarge}>
                {profile?.photoUrl ? (
                  <Image source={{ uri: profile.photoUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitial}>{profile?.name?.[0] ?? '?'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{profile?.name ?? 'User'}</Text>
                <Text style={styles.profileAge}>{profile?.age ? `Age ${profile.age}` : ''}</Text>
                <GPSIndicator active={gpsActive} />
              </View>
              <TrustScoreRing score={profile?.trustScore ?? 0} size={72} />
            </View>

            <View style={styles.divider} />

            <View style={styles.trustLabels}>
              {trustLabels.map((t) => (
                <View key={t.label} style={styles.trustRow}>
                  <Text style={styles.trustDot}>{t.done ? '✅' : '○'}</Text>
                  <Text style={[styles.trustLabel, !t.done && styles.trustLabelOff]}>{t.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { value: String(HISTORY_DEMO.length), label: 'Activities' },
              { value: '4.8', label: 'Avg rating' },
              { value: String(COMPANIONS_DEMO.length), label: 'Companions' },
            ].map((stat) => (
              <GlassCard key={stat.label} variant="regular" padding={16} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Companions */}
          <Text style={styles.sectionTitle}>Companions</Text>
          <View style={styles.companionsRow}>
            {COMPANIONS_DEMO.map((c) => (
              <GlassCard key={c.name} variant="regular" padding={16} style={styles.companionCard}>
                <View style={styles.companionAvatar}>
                  <Text style={styles.companionInitial}>{c.initials}</Text>
                </View>
                <Text style={styles.companionName}>{c.name}</Text>
                <Text style={styles.companionActivity}>{c.activity}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Activity history */}
          <Text style={styles.sectionTitle}>Activity History</Text>
          <View style={styles.historyList}>
            {HISTORY_DEMO.map((h) => (
              <GlassCard key={h.id} variant="subtle" padding={{ vertical: 14, horizontal: 18 }} style={styles.historyItem}>
                <View style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyTitle}>{h.title}</Text>
                    <Text style={styles.historyDate}>{h.date} · {h.participants} people</Text>
                  </View>
                  <View style={styles.historyRating}>
                    {'⭐'.repeat(h.rating).split('').map((s, i) => (
                      <Text key={i} style={styles.star}>⭐</Text>
                    ))}
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Settings */}
          <Text style={styles.sectionTitle}>Settings</Text>
          <GlassCard variant="regular" padding={0} style={styles.settingsCard}>
            {[
              { label: 'Trusted contact', value: profile?.trustedContact ?? 'Not set', route: '/auth/trusted-contact' },
              { label: 'Notifications', value: 'On', route: null },
              { label: 'GPS preferences', value: profile?.gpsConsent ? 'Allowed' : 'Not allowed', route: '/auth/gps-consent' },
              { label: 'Privacy & data', value: '', route: null },
            ].map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => item.route && router.push(item.route as any)}
                style={[styles.settingsRow, i > 0 && styles.settingsBorder]}
              >
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <View style={styles.settingsRight}>
                  {item.value ? <Text style={styles.settingsValue}>{item.value}</Text> : null}
                  <Text style={styles.settingsArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </GlassCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary },
  signOut: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.danger },
  profileCard: { width: '100%' },
  profileRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.glass.strong,
    borderWidth: 2, borderColor: Colors.border.accent,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarInitial: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary },
  profileName: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  profileAge: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2, marginBottom: 8 },
  divider: { height: 1, backgroundColor: Colors.border.subtle, marginVertical: 16 },
  trustLabels: { gap: 8 },
  trustRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  trustDot: { fontSize: 14, width: 20 },
  trustLabel: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  trustLabelOff: { color: Colors.text.tertiary },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.accent },
  statLabel: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 4 },
  sectionTitle: { fontFamily: Fonts.displayMedium, fontSize: FontSize.base, color: Colors.text.primary },
  companionsRow: { flexDirection: 'row', gap: 10 },
  companionCard: { flex: 1, alignItems: 'center', gap: 6 },
  companionAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.glass.strong,
    borderWidth: 1.5, borderColor: Colors.border.regular,
    alignItems: 'center', justifyContent: 'center',
  },
  companionInitial: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  companionName: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  companionActivity: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary },
  historyList: { gap: 8 },
  historyItem: { width: '100%' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  historyDate: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 2 },
  historyRating: { flexDirection: 'row' },
  star: { fontSize: 12 },
  settingsCard: { width: '100%', overflow: 'hidden', borderRadius: 20 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18 },
  settingsBorder: { borderTopWidth: 1, borderTopColor: Colors.border.subtle },
  settingsLabel: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.primary },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsValue: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  settingsArrow: { fontFamily: Fonts.body, fontSize: FontSize.lg, color: Colors.text.tertiary },
});
