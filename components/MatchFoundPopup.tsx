import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { Fonts, FontSize } from '@/constants/typography';
import { Colors } from '@/constants/colors';

const { width: SW, height: SH } = Dimensions.get('window');

const PARTICLE_COLORS = ['#2563EB', '#ADD9E5', '#ffffff'];
const N_PARTICLES = 8;

interface Particle {
  angle: number;
  distance: number;
  size: number;
  color: string;
  x: Animated.Value;
  y: Animated.Value;
  op: Animated.Value;
}

interface Props {
  visible: boolean;
  activityTitle: string;
  participants: { name: string }[];
  onDismiss: () => void;
}

export function MatchFoundPopup({ visible, activityTitle, participants, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const bubbleOp = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;
  const contentOp = useRef(new Animated.Value(0)).current;
  const rotateVal = useRef(new Animated.Value(0)).current;
  const poppingRef = useRef(false);
  const autoPopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introRef = useRef<Animated.CompositeAnimation | null>(null);

  // Deterministic particle layout (no Math.random at render time)
  const particles = useRef<Particle[]>(
    Array.from({ length: N_PARTICLES }).map((_, i) => ({
      angle: ((Math.PI * 2) / N_PARTICLES) * i,
      distance: 70 + (i % 4) * 12,
      size: 8 + (i % 3) * 3,
      color: PARTICLE_COLORS[i % 3],
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      op: new Animated.Value(0),
    }))
  ).current;

  const rotate = rotateVal.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  const triggerPop = useCallback(() => {
    if (poppingRef.current) return;
    poppingRef.current = true;
    if (autoPopTimer.current) { clearTimeout(autoPopTimer.current); autoPopTimer.current = null; }
    introRef.current?.stop();

    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.timing(bubbleOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentOp, { toValue: 0, duration: 150, useNativeDriver: true }),
      ...particles.map((p) =>
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: Math.cos(p.angle) * p.distance,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: Math.sin(p.angle) * p.distance,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.op, { toValue: 1, duration: 50, useNativeDriver: true }),
            Animated.timing(p.op, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]),
        ])
      ),
    ]).start(() => onDismiss());
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) return;

    // Reset
    scale.setValue(0);
    bubbleOp.setValue(0);
    overlayOp.setValue(0);
    contentOp.setValue(0);
    rotateVal.setValue(0);
    poppingRef.current = false;
    particles.forEach((p) => { p.x.setValue(0); p.y.setValue(0); p.op.setValue(0); });

    // Intro: bubble appears → content fades in → wobble
    introRef.current = Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }),
        Animated.timing(bubbleOp, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayOp, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(contentOp, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]),
      ]),
      // Wobble
      Animated.sequence([
        Animated.timing(rotateVal, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(rotateVal, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(rotateVal, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]);
    introRef.current.start();

    // Auto-pop after 3 s
    autoPopTimer.current = setTimeout(triggerPop, 3000);

    return () => {
      introRef.current?.stop();
      if (autoPopTimer.current) clearTimeout(autoPopTimer.current);
    };
  }, [visible, triggerPop]);

  const others = participants.slice(0, 2);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={triggerPop}>
        <View style={styles.root}>
          {/* Dark overlay */}
          <Animated.View style={[styles.overlay, { opacity: overlayOp }]} />

          {/* Particles — centered, each offset by transform */}
          <View style={styles.particleAnchor} pointerEvents="none">
            {particles.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: p.color,
                    opacity: p.op,
                    transform: [{ translateX: p.x }, { translateY: p.y }],
                  },
                ]}
              />
            ))}
          </View>

          {/* Main bubble */}
          <Animated.View
            style={[
              styles.bubble,
              {
                opacity: bubbleOp,
                transform: [{ scale }, { rotate }],
              },
            ]}
          >
            <Animated.View style={[styles.content, { opacity: contentOp }]}>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.matchTitle}>It's a Match!</Text>
              <Text style={styles.activityName} numberOfLines={2}>
                {activityTitle}
              </Text>
              {others.length > 0 && (
                <View style={styles.avatarRow}>
                  {others.map((p, i) => (
                    <View
                      key={i}
                      style={[styles.avatar, i > 0 && styles.avatarOverlap]}
                    >
                      <Text style={styles.avatarInitial}>{p.name[0]}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.tapHint}>Tap to continue →</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const BUBBLE_SIZE = 280;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  // Particle anchor sits at the center of screen so transforms radiate outward
  particleAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(37,99,235,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    // Soft shadow to lift it above the overlay
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  matchTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text.dark,
    textAlign: 'center',
  },
  activityName: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  avatarInitial: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.base,
    color: '#ffffff',
  },
  tapHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
});
