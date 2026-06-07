import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  size?: number;
  pulse?: boolean;
}

export function BubbleIcon({ size = 32, pulse = false }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (pulse) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      scaleAnim.setValue(1);
    }
  }, [pulse]);

  const innerSize = size * 0.45;
  const highlightW = size * 0.25;
  const highlightH = size * 0.15;

  return (
    <Animated.View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Core dot */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: '#2563EB',
        }}
      />
      {/* Glossy highlight */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.13,
          left: size * 0.2,
          width: highlightW,
          height: highlightH,
          borderRadius: highlightH / 2,
          backgroundColor: 'rgba(255,255,255,0.45)',
          transform: [{ rotate: '-30deg' }],
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'rgba(37,99,235,0.13)',
    borderWidth: 1.5,
    borderColor: 'rgba(37,99,235,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
