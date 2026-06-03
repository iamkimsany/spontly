import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

type Zone = 'green' | 'yellow' | 'red' | 'black' | 'sos';

interface Props {
  zone: Zone;
}

const ZONE_LABELS: Record<Zone, string> = {
  green: '🟢 Safe',
  yellow: '🟡 Check In',
  red: '🔴 Alert',
  black: '⚫ Emergency',
  sos: '🆘 SOS',
};

export function SafetyZoneBadge({ zone }: Props) {
  const config = Colors.zone[zone];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.label, { color: config.text }]}>{ZONE_LABELS[zone]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
  },
});
