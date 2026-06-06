import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  /** Optional icon rendered after the label */
  iconAfter?: React.ReactNode;
}

export function PrimaryButton({ label, onPress, loading, disabled, style, fullWidth, iconAfter }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        fullWidth && styles.full,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.text.dark} />
      ) : (
        <View style={styles.inner}>
          <Text style={styles.label}>{label}</Text>
          {iconAfter ? <View style={styles.iconWrap}>{iconAfter}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    alignSelf: 'flex-start',
  },
  full: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.text.dark,
    letterSpacing: 0.2,
  },
  iconWrap: {
    marginTop: 1,
  },
});
