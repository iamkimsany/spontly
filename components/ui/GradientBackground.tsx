import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GradientBackground({ children, style }: Props) {
  return (
    <LinearGradient
      colors={[Colors.bg.start, Colors.bg.mid1, Colors.bg.mid2, Colors.bg.end]}
      locations={[0, 0.3, 0.6, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Decorative blobs — pointerEvents none so they never intercept touches */}
      <View style={[styles.blob1, { backgroundColor: Colors.blob1 }]} pointerEvents="none" />
      <View style={[styles.blob2, { backgroundColor: Colors.blob2 }]} pointerEvents="none" />
      <View style={[styles.blob3, { backgroundColor: Colors.blob3 }]} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99,102,241,0.18)',
    top: -100,
    right: -100,
    // React Native doesn't support CSS filter, but we approximate with opacity+color
  },
  blob2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139,92,246,0.12)',
    bottom: 100,
    left: -80,
  },
  blob3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(200,241,53,0.04)',
    top: '40%',
    right: 20,
  },
});
