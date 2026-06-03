import React from 'react';
import { TextInput, Text, View, StyleSheet, ViewStyle, KeyboardTypeOptions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  style?: ViewStyle;
  multiline?: boolean;
}

export function GlassInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoFocus,
  maxLength,
  style,
  multiline,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <BlurView intensity={10} tint="dark" style={styles.blur}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.tertiary}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoFocus={autoFocus}
          maxLength={maxLength}
          multiline={multiline}
          style={[styles.input, multiline && styles.multiline]}
        />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  blur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: Colors.glass.regular,
    borderWidth: 1,
    borderColor: Colors.border.regular,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontFamily: Fonts.body,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
