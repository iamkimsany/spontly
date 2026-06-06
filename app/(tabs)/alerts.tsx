import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

const DEMO_ALERTS = [
  {
    id: '1',
    type: 'match',
    title: 'Match found!',
    body: 'Jung also wants to go hiking today. Tap to view.',
    time: '2 min ago',
    emoji: '🔥',
  },
  {
    id: '2',
    type: 'safety',
    title: 'GPS activated',
    body: 'Your meetup starts in 10 minutes. GPS is now tracking.',
    time: '1 hr ago',
    emoji: '📍',
  },
  {
    id: '3',
    type: 'rating',
    title: 'Rate your meetup',
    body: 'How was your hike with Jung? Your rating helps the community.',
    time: '3 hrs ago',
    emoji: 'star',
  },
  {
    id: '4',
    type: 'match',
    title: 'New match nearby',
    body: 'Sara wants to sketch in Hongdae this week.',
    time: 'Yesterday',
    emoji: '✨',
  },
];

export default function AlertsScreen() {
  const handleAlert = (alert: (typeof DEMO_ALERTS)[0]) => {
    if (alert.type === 'match') router.push('/match/found');
    if (alert.type === 'rating') router.push('/match/rating');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Alerts</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{DEMO_ALERTS.length}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {DEMO_ALERTS.map((alert) => (
            <GlassCard
              key={alert.id}
              variant={alert.type === 'match' ? 'active' : 'regular'}
              padding={{ vertical: 16, horizontal: 18 }}
              style={styles.alertItem}
            >
              <View style={styles.alertRow}>
                {alert.emoji === 'star' ? (
                  <View style={styles.alertIconWrap}>
                    <Star size={20} color="#2563EB" fill="#2563EB" strokeWidth={1.6} />
                  </View>
                ) : (
                  <Text style={styles.alertEmoji}>{alert.emoji}</Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertBody}>{alert.body}</Text>
                </View>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
            </GlassCard>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary },
  badge: { backgroundColor: Colors.accentSoft, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border.accent },
  badgeText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.xs, color: Colors.accent },
  scroll: { paddingHorizontal: 20, gap: 10 },
  alertItem: { width: '100%' },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertEmoji: { fontSize: 22, width: 32 },
  alertIconWrap: { width: 32, alignItems: 'flex-start', paddingTop: 2 },
  alertTitle: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  alertBody: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary, marginTop: 3, lineHeight: 20 },
  alertTime: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginLeft: 8, marginTop: 2 },
});
