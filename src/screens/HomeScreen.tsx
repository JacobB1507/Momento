import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>📸</Text>
        <Text style={styles.appName}>Momento</Text>
        <Text style={styles.welcome}>Signed in as</Text>
        <Text style={styles.email}>{session?.user.email}</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
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
    paddingHorizontal: 24,
  },
  logo: { fontSize: 56, marginBottom: 12 },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
    marginBottom: 32,
  },
  welcome: { fontSize: 15, color: '#6B7280', marginBottom: 4 },
  email: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 48,
  },
  button: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonPressed: { opacity: 0.65 },
  buttonText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
});
