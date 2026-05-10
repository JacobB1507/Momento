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
import { getProfile } from '../lib/galleries';
import { validateBio, sanitizeText } from '../lib/sanitize';
import { userFacingError, reportError } from '../lib/errorReport';

const BIO_LIMIT = 150;

export default function EditBioScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId).then((profile) => {
      if (profile?.bio) setBio(profile.bio);
    });
  }, [userId]);

  const handleSave = async () => {
    const clean = sanitizeText(bio);
    const validation = validateBio(clean);
    if (!validation.ok) {
      Alert.alert('Invalid bio', validation.error!);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bio: clean })
      .eq('id', userId);
    setLoading(false);

    if (error) {
      Alert.alert('Error', userFacingError(error));
      reportError('EditBioScreen.save', error);
      return;
    }
    Alert.alert('Bio updated!', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Edit Bio</Text>
          <View style={styles.cancelButton} />
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, BIO_LIMIT))}
            placeholder="Write a short bio..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={BIO_LIMIT}
            autoFocus
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{bio.length}/{BIO_LIMIT}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingHorizontal: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  cancelButton: { minWidth: 60 },
  cancelText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
  },
  counter: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },

  saveButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
