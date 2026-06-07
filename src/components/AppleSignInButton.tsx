import React, { useEffect, useState } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { isAppleAuthAvailable, signInWithApple } from '../lib/appleAuth';

type Props = {
  onSuccess?: () => void;
  onError?: (reason: string) => void;
  style?: ViewStyle;
};

export function AppleSignInButton({ onSuccess, onError, style }: Props) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isAppleAuthAvailable().then(setAvailable);
  }, []);

  if (!available) return null;

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    const result = await signInWithApple();
    setLoading(false);
    if (result.ok) {
      onSuccess?.();
    } else if (result.reason !== 'cancelled') {
      onError?.(result.reason);
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={StyleSheet.flatten([styles.btn, style])}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  btn: { width: '100%', height: 50 },
});
