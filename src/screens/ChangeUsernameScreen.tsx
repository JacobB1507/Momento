import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { validateUsername, sanitizeText } from '../lib/sanitize';
import { userFacingError, reportError } from '../lib/errorReport';

const DAYS_LOCK = 30;

export default function ChangeUsernameScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [username, setUsername] = useState('');
  const [lastChange, setLastChange] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('username, last_username_change')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
        if (data?.last_username_change) setLastChange(data.last_username_change);
        setLoading(false);
      });
  }, [userId]);

  const lastChangeMs = lastChange ? new Date(lastChange).getTime() : null;
  const daysSinceChange = lastChangeMs !== null ? Math.floor((Date.now() - lastChangeMs) / 86400000) : null;
  const isLocked = daysSinceChange !== null && daysSinceChange < DAYS_LOCK;
  const daysRemaining = isLocked ? DAYS_LOCK - daysSinceChange! : 0;
  const lastChangedText = daysSinceChange === null ? '' : (() => {
    const base = daysSinceChange === 0 ? 'Last changed today'
      : daysSinceChange === 1 ? 'Last changed yesterday'
      : `Last changed ${daysSinceChange} days ago`;
    return isLocked ? `${base} · unlocks in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : base;
  })();

  const handleSave = async () => {
    const clean = sanitizeText(username);
    const validation = validateUsername(clean);
    if (!validation.ok) {
      Alert.alert('Invalid username', validation.error!);
      return;
    }

    if (lastChange) {
      const daysSince = (Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        const nextAllowed = new Date(new Date(lastChange).getTime() + 30 * 24 * 60 * 60 * 1000);
        const formatted = nextAllowed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        Alert.alert('Too soon', `You can next change your username on ${formatted}.`);
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: clean, last_username_change: new Date().toISOString() })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      Alert.alert('Error', userFacingError(error));
      reportError('ChangeUsernameScreen.save', error);
      return;
    }

    Alert.alert('Success', 'Username updated!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Change Username</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.warningRow}>
            <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
            <Text style={styles.warningText}>You can only change your username once every 30 days.</Text>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Username</Text>
            {isLocked && <Ionicons name="lock-closed" size={14} color="#9CA3AF" />}
          </View>
          <TextInput
            style={[styles.input, isLocked && styles.inputLocked]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter username"
            placeholderTextColor="#9CA3AF"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!isLocked}
          />
          {lastChange && daysSinceChange !== null && (
            <Text style={styles.lastChanged}>{lastChangedText}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (isLocked || saving) && styles.saveButtonDisabled,
              !isLocked && !saving && pressed && { opacity: 0.75 },
            ]}
            onPress={handleSave}
            disabled={isLocked || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{isLocked ? 'Locked' : 'Save'}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  cancelButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  cancelText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  section: { paddingHorizontal: 16 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  warningText: { fontSize: 13, color: '#9CA3AF', flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLocked: { opacity: 0.5, backgroundColor: '#F3F4F6' },
  lastChanged: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  footer: { paddingHorizontal: 16, marginTop: 24 },
  saveButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
