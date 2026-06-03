import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

interface Props {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function GlassButton({ label, onPress, style, fullWidth }: Props) {
  return (
    <BlurView intensity={10} tint="dark" style={[styles.blur, fullWidth && styles.full, style]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: 9999,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  full: {
    alignSelf: 'stretch',
  },
  inner: {
    backgroundColor: Colors.glass.regular,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
});
