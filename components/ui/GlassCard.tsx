import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';

type Variant = 'strong' | 'regular' | 'subtle' | 'active';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  style?: ViewStyle;
  padding?: number | { vertical: number; horizontal: number };
}

const variantConfig: Record<Variant, { bg: string; border: string; blur: number }> = {
  strong: { bg: Colors.glass.strong, border: Colors.border.strong, blur: 24 },
  regular: { bg: Colors.glass.regular, border: Colors.border.regular, blur: 16 },
  subtle: { bg: Colors.glass.subtle, border: Colors.border.subtle, blur: 8 },
  active: { bg: Colors.glass.active, border: Colors.border.accent, blur: 16 },
};

export function GlassCard({ children, variant = 'regular', style, padding }: Props) {
  const config = variantConfig[variant];
  const pad = padding !== undefined
    ? typeof padding === 'number'
      ? { paddingVertical: padding, paddingHorizontal: padding }
      : { paddingVertical: padding.vertical, paddingHorizontal: padding.horizontal }
    : { paddingVertical: 20, paddingHorizontal: 24 };

  return (
    <BlurView intensity={config.blur} tint="light" style={[styles.blur, style]}>
      <View
        style={[
          styles.inner,
          pad,
          {
            backgroundColor: config.bg,
            borderColor: config.border,
          },
        ]}
      >
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  inner: {
    borderWidth: 1,
    borderRadius: 24,
  },
});
