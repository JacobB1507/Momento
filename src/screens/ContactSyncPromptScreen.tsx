import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { requestContactsPermission } from '../lib/contacts';

export default function ContactSyncPromptScreen() {
  const { session, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const userId = session?.user.id;

  const handleAllow = async () => {
    setLoading(true);
    try {
      await requestContactsPermission();
    } catch (e) {
      console.warn('[ContactSyncPrompt] update failed:', e);
    }
    try {
      await supabase
        .from('profiles')
        .update({
          contacts_prompt_shown_at: new Date().toISOString(),
          contacts_skipped_at: null,
        })
        .eq('id', userId);
    } catch (e) {
      console.warn('[ContactSyncPrompt] update failed:', e);
    }
    await refreshProfile();
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="people-outline" size={80} color="#FF6B6B" />
        </View>

        <Text style={styles.heading}>Find your friends on Momento</Text>
        <Text style={styles.body}>
          Allow access to your contacts so we can show you which friends are
          already using Momento. Your contacts are matched privately and never
          stored on our servers.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.88 },
              loading && styles.btnDisabled,
            ]}
            onPress={handleAllow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,107,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  body: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 48,
  },
  actions: { width: '100%', alignItems: 'center', gap: 16 },
  primaryBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: '#888888', fontSize: 15, fontWeight: '500' },
});
