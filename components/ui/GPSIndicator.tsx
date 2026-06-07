import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

// 'ready'  — permission granted, not in an active meetup (green, no pulse)
// 'active' — in an active meetup, live tracking (green, pulsing)
// 'off'    — permission denied or unavailable (grey)
export type GPSStatus = 'ready' | 'active' | 'off';

interface Props {
  /** Legacy boolean (converted internally) OR explicit GPSStatus */
  active?: boolean;
  status?: GPSStatus;
}

function resolveStatus(active?: boolean, status?: GPSStatus): GPSStatus {
  if (status !== undefined) return status;
  return active ? 'active' : 'off';
}

export function GPSIndicator({ active, status }: Props) {
  const resolved = resolveStatus(active, status);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (resolved === 'active') {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.4, duration: 750, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulse.setValue(1);
    }
  }, [resolved]);

  const isGreen = resolved === 'ready' || resolved === 'active';
  const label = resolved === 'active' ? 'GPS Active' : resolved === 'ready' ? 'GPS Ready' : 'GPS Off';

  return (
    <View style={[styles.pill, isGreen ? styles.pillGreen : styles.pillOff]}>
      <Animated.View
        style={[
          styles.dot,
          isGreen ? styles.dotGreen : styles.dotOff,
          { transform: [{ scale: pulse }] },
        ]}
      />
      <Text style={[styles.label, isGreen ? styles.labelGreen : styles.labelOff]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillGreen: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  pillOff: {
    backgroundColor: Colors.glass.subtle,
    borderColor: Colors.border.subtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#16a34a',
  },
  dotOff: {
    backgroundColor: Colors.text.tertiary,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
  },
  labelGreen: {
    color: '#16a34a',
  },
  labelOff: {
    color: Colors.text.tertiary,
  },
});
