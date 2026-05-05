import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function AvatarCircle({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { session } = useAuth();
  const email = session?.user.email ?? '';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.card}>
        <AvatarCircle email={email} />
        <Text style={styles.emailLabel}>Signed in as</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },

  emailLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  email: { fontSize: 16, fontWeight: '600', color: '#111827' },

  section: { paddingHorizontal: 16, marginTop: 24 },

  signOutButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressed: { opacity: 0.65 },
  signOutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
});
