import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function AvatarCircle({ label }: { label: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{label.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { session } = useAuth();
  const email = session?.user.email ?? '';
  const userId = session?.user.id;

  const [username, setUsername] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
      })
      .finally(() => setLoadingProfile(false));
  }, [userId]);

  const handleEdit = () => {
    setDraftUsername(username);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraftUsername('');
  };

  const handleSave = async () => {
    const trimmed = draftUsername.trim();
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', userId);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setUsername(trimmed);
    setEditing(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const avatarLabel = username || email;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.card}>
        <AvatarCircle label={avatarLabel} />

        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.fieldValue}>{email}</Text>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Display name</Text>

        {loadingProfile ? (
          <ActivityIndicator color="#FF6B6B" style={{ marginTop: 6 }} />
        ) : editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={draftUsername}
              onChangeText={setDraftUsername}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              maxLength={30}
              placeholder="Enter display name"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.editButtons}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  (!draftUsername.trim() || saving) && { opacity: 0.45 },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleSave}
                disabled={!draftUsername.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.usernameRow}>
            <Text style={[styles.fieldValue, !username && styles.fieldValueEmpty]}>
              {username || 'Not set'}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
              onPress={handleEdit}
              hitSlop={8}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.65 }]}
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

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

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
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.3, marginBottom: 4 },
  fieldValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  fieldValueEmpty: { color: '#D1D5DB', fontWeight: '400' },

  divider: { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: '#F3F4F6', marginVertical: 16 },

  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editBtn: { borderWidth: 1.5, borderColor: '#FF6B6B', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
  editBtnText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },

  editRow: { width: '100%', marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  editButtons: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  section: { paddingHorizontal: 16, marginTop: 24 },
  signOutButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
});
