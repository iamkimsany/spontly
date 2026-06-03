import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

interface Props {
  active: boolean;
}

export function GPSIndicator({ active }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.4, duration: 750, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [active]);

  return (
    <View style={[styles.pill, active ? styles.active : styles.off]}>
      <Animated.View
        style={[styles.dot, active ? styles.dotActive : styles.dotOff, { transform: [{ scale: pulse }] }]}
      />
      <Text style={[styles.label, active ? styles.labelActive : styles.labelOff]}>
        {active ? 'GPS Active' : 'GPS Off'}
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
  active: {
    backgroundColor: Colors.accentSoft,
    borderColor: 'rgba(200,241,53,0.3)',
  },
  off: {
    backgroundColor: Colors.glass.subtle,
    borderColor: Colors.border.subtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.accent,
  },
  dotOff: {
    backgroundColor: Colors.text.tertiary,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
  },
  labelActive: {
    color: Colors.accent,
  },
  labelOff: {
    color: Colors.text.tertiary,
  },
});
