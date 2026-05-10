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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { validateDisplayName, sanitizeText } from '../lib/sanitize';
import { userFacingError, reportError } from '../lib/errorReport';

export default function EditDisplayNameScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    const clean = sanitizeText(displayName);
    const validation = validateDisplayName(clean);
    if (!validation.ok) {
      Alert.alert('Invalid display name', validation.error!);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: clean })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      Alert.alert('Error', userFacingError(error));
      reportError('EditDisplayNameScreen.save', error);
      return;
    }

    Alert.alert('Success', 'Display name updated!', [
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Display Name</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Display Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              autoCorrect={false}
              placeholder="Enter display name"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {displayName.length > 0 && (
              <Pressable onPress={() => setDisplayName('')} style={styles.clearBtn} hitSlop={8}>
                <Text style={styles.clearIcon}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.75 }, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
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
  clearBtn: { position: 'absolute', right: 14 },
  clearIcon: { fontSize: 14, color: '#9CA3AF' },
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
