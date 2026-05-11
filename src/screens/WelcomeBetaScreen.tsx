import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { userFacingError, reportError } from '../lib/errorReport';

export default function WelcomeBetaScreen() {
  const { session, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = async () => {
    const userId = session?.user.id;
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ welcome_seen: true })
        .eq('id', userId);
      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      Alert.alert('Something went wrong', userFacingError(err as any));
      reportError('WelcomeBetaScreen.completeWelcome', err as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.middle}>
          <Text style={styles.logo}>📸</Text>
          <Text style={styles.welcomeTo}>Welcome to</Text>
          <Text style={styles.appName}>Momento.</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>PRIVATE BETA</Text>
          </View>
          <Text style={styles.body}>
            {"You're one of the first to try Momento.\nThings may not be perfect yet — your feedback\nhelps us build something real."}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleGetStarted}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Let's get started</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 32, paddingBottom: 32, paddingTop: 16 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 56, marginBottom: 20 },
  welcomeTo: { fontSize: 22, color: '#6B7280', fontWeight: '400', marginBottom: 4 },
  appName: { fontSize: 48, fontWeight: '800', color: '#FF6B6B', letterSpacing: -1, marginBottom: 16 },
  pill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 28,
  },
  pillText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1.5 },
  body: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26 },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
