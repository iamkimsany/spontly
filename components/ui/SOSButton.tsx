import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

interface Props {
  onSOS: () => void;
}

const SIZE = 72;
const RADIUS = SIZE / 2 - 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HOLD_DURATION = 2000;

export function SOSButton({ onSOS }: Props) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const startHold = () => {
    setHolding(true);
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(pct);
      if (pct < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        triggerSOS();
      }
    };
    animRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    setHolding(false);
    setProgress(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const triggerSOS = () => {
    setHolding(false);
    setProgress(0);
    onSOS();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: startHold,
    onPanResponderRelease: cancelHold,
    onPanResponderTerminate: cancelHold,
  });

  const strokeDash = progress * CIRCUMFERENCE;

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.svg}>
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="rgba(239,68,68,0.2)"
          stroke="rgba(239,68,68,0.5)"
          strokeWidth={1.5}
        />
        {holding && (
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={Colors.sos}
            strokeWidth={3}
            strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.icon}>🆘</Text>
        <Text style={styles.label}>{holding ? 'Hold...' : 'SOS'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    color: '#F87171',
    marginTop: 1,
  },
});
