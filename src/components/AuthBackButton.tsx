import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  onPress: () => void;
  /** Vertical offset from the top of the screen. Defaults to 12. The auth screens currently use 12 (Login/SignUp) or 16 (ForgotPassword). */
  top?: number;
  /** Icon color. Defaults to '#111827' to match the existing auth screens. */
  color?: string;
};

export default function AuthBackButton({ onPress, top = 12, color = '#111827' }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={[
        styles.backButton,
        { top, left: 20 + insets.left },
      ]}
    >
      <Ionicons name="chevron-back" size={26} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    zIndex: 10,
    padding: 4,
  },
});
