import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';
import { getDefaultGalleryPrivacy } from '../lib/galleries';

function Row({ label, subtitle, icon, onPress }: {
  label: string; subtitle?: string; icon?: React.ReactNode; onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      {icon ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {icon}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{label}</Text>
            {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const Sep = () => <View style={styles.separator} />;

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [defaultPrivacy, setDefaultPrivacy] = useState<string>('friends');

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      getDefaultGalleryPrivacy(userId).then(setDefaultPrivacy);
    }, [userId])
  );

  const { startTutorial } = useTutorial();
  const go = (screen: string) => () => navigation.navigate(screen as never);
  const privacyLabel = defaultPrivacy.charAt(0).toUpperCase() + defaultPrivacy.slice(1);

  const handleReplayTutorial = async () => {
    try {
      await supabase.from('profiles').update({ tutorial_completed: false }).eq('id', userId);
      navigation.goBack();
      startTutorial();
    } catch {
      Alert.alert('Error', 'Could not reset tutorial.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>PROFILE</Text>
        <View style={styles.card}>
          <Row label="Change Username" onPress={go('ChangeUsername')} />
          <Sep />
          <Row label="Change Email" onPress={go('ChangeEmail')} />
          <Sep />
          <Row label="Change Password" onPress={go('ChangePassword')} />
          <Sep />
          <Row label="Edit Display Name" onPress={go('EditDisplayName')} />
          <Sep />
          <Row label="Edit Bio" onPress={go('EditBio')} />
        </View>

        <Text style={styles.sectionLabel}>GALLERIES</Text>
        <View style={styles.card}>
          <Row label="Default Gallery Privacy" subtitle={privacyLabel} onPress={go('DefaultGalleryPrivacy')} />
          <Sep />
          <Row
            label="Trusted Friends"
            subtitle="Auto-accept gallery invites from trusted friends"
            icon={<Ionicons name="star-outline" size={18} color="#111827" />}
            onPress={go('TrustedFriends')}
          />
        </View>

        <Text style={styles.sectionLabel}>OTHER</Text>
        <View style={styles.card}>
          <Row label="Notifications" subtitle="Manage what you get notified about" onPress={go('NotificationSettings')} />
        </View>

        {__DEV__ && (
          <>
            <Text style={styles.sectionLabel}>DEVELOPER</Text>
            <View style={styles.card}>
              <Row label="Replay Tutorial" onPress={handleReplayTutorial} />
            </View>
          </>
        )}

        <View style={styles.signOutSection}>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.7 }]}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={styles.deleteSection}>
          <View style={styles.deleteDivider} />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all your data. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Continue', style: 'destructive', onPress: () => navigation.navigate('DeleteAccount' as never) },
                ],
              )
            }
          >
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.betaFooter}>
          <Text style={styles.betaFooterText}>Momento · Private Beta · v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  scrollContent: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  card: {
    marginHorizontal: 16,
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
  rowSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
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
  deleteSection: { marginTop: 60, marginHorizontal: 16 },
  deleteDivider: { height: 1, backgroundColor: '#333' },
  deleteButton: { marginTop: 40, alignItems: 'center' },
  deleteText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  betaFooter: { marginTop: 24, paddingBottom: 40, alignItems: 'center' },
  betaFooterText: { fontSize: 12, color: '#9CA3AF', letterSpacing: 0.3 },
});
