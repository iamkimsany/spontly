import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { Fonts, FontSize } from '@/constants/typography';

// 'black' / 'sos' kept in the type for store compatibility but never rendered
export type SafetyZone = 'green' | 'yellow' | 'red' | 'black' | 'sos';

interface Props {
  zone: SafetyZone;
}

type VisibleZone = 'green' | 'yellow' | 'red';

const ZONE_CONFIG: Record<VisibleZone, {
  label: string;
  bg: string;
  border: string;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string; fill?: string; strokeWidth?: number }>;
  iconFill?: string;
}> = {
  green: {
    label: 'Safe',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.30)',
    color: '#22C55E',
    Icon: Shield,
    iconFill: 'rgba(34,197,94,0.15)',
  },
  yellow: {
    label: 'Check In',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.30)',
    color: '#EAB308',
    Icon: CheckCircle,
  },
  red: {
    label: 'Alert',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.30)',
    color: '#EF4444',
    Icon: AlertTriangle,
  },
};

function toVisible(zone: SafetyZone): VisibleZone {
  if (zone === 'yellow') return 'yellow';
  if (zone === 'red') return 'red';
  return 'green'; // green, black, sos all render as green/safe
}

export function SafetyZoneBadge({ zone }: Props) {
  const cfg = ZONE_CONFIG[toVisible(zone)];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <cfg.Icon size={14} color={cfg.color} fill={cfg.iconFill ?? 'none'} strokeWidth={2} />
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
  },
});
