import React from 'react';
import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('ChangeUsername' as never)}
          >
            <Text style={styles.rowLabel}>Change Username</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('ChangeEmail' as never)}
          >
            <Text style={styles.rowLabel}>Change Email</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('ChangePassword' as never)}
          >
            <Text style={styles.rowLabel}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('EditBio' as never)}
          >
            <Text style={styles.rowLabel}>Edit Bio</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('EditDisplayName' as never)}
          >
            <Text style={styles.rowLabel}>Edit Display Name</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, { marginTop: 16 }]}>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate('TrustedFriends' as never)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Ionicons name="star-outline" size={18} color="#111827" />
              <View>
                <Text style={styles.rowLabel}>Trusted Friends</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>Auto-accept gallery invites from trusted friends</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.signOutSection}>
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.7 }]}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 60, marginHorizontal: 16 }}>
        <View style={{ height: 1, backgroundColor: '#333' }} />
        <TouchableOpacity
          style={{ marginTop: 40, alignItems: 'center' }}
          onPress={() =>
            Alert.alert(
              'Delete Account',
              'This will permanently delete your account and all your data. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Continue',
                  style: 'destructive',
                  onPress: () => navigation.navigate('DeleteAccount' as never),
                },
              ],
            )
          }
        >
          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  section: { paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowPressed: { backgroundColor: '#F3F4F6' },
  rowLabel: { fontSize: 16, color: '#111827' },
  chevron: { fontSize: 20, color: '#C7C7CC', lineHeight: 24 },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },

  signOutSection: { paddingHorizontal: 16, marginTop: 24 },
  signOutButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});
