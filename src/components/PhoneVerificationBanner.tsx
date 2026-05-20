import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PhoneVerificationBanner() {
  const { profile, session, refreshProfile } = useAuth();
  const navigation = useNavigation<Nav>();
  const [dismissing, setDismissing] = useState(false);

  if (!profile || !session) return null;
  if (profile.phone_verified_at) return null;
  const dismissedUntil = profile.phone_verify_dismissed_until
    ? new Date(profile.phone_verify_dismissed_until)
    : null;
  if (dismissedUntil && dismissedUntil.getTime() > Date.now()) return null;

  const handleVerify = () => {
    navigation.navigate('PhoneVerification', {});
  };

  const handleRemindLater = async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      const fourteenDays = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const { error } = await supabase
        .from('profiles')
        .update({ phone_verify_dismissed_until: fourteenDays.toISOString() })
        .eq('id', session.user.id);
      if (!error) {
        await refreshProfile();
      }
    } finally {
      setDismissing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Verify your phone number</Text>
        <Text style={styles.subtitle}>Helps us keep your account secure.</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleVerify} style={styles.verifyBtn}>
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRemindLater} disabled={dismissing} style={styles.laterBtn}>
          <Text style={styles.laterBtnText}>Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#9CA3AF', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  verifyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyBtnText: { color: '#000000', fontSize: 13, fontWeight: '600' },
  laterBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  laterBtnText: { color: '#9CA3AF', fontSize: 13 },
});
