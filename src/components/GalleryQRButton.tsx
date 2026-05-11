import React from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export function GalleryQRButton() {
  return (
    <Pressable
      style={({ pressed }) => [styles.qrBtn, pressed && { opacity: 0.7 }]}
      onPress={() => Alert.alert('Coming soon', 'QR code invites are coming soon!')}
    >
      <Ionicons name="qr-code-outline" size={22} color="#FF6B6B" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  qrBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
