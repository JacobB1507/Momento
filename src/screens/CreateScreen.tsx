import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { MainTabParamList } from '../navigation/types';
import type { GalleryPrivacy } from '../types/database';
import { getDraft, setDraft } from '../lib/createGalleryDraft';

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

export default function CreateScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [title, setTitle] = useState<string>(getDraft().title);
  const [privacy, setPrivacy] = useState<GalleryPrivacy>(getDraft().privacy ?? 'friends');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const draft = getDraft();
      setTitle(draft.title);
      setPrivacy(draft.privacy ?? 'friends');
    }, [])
  );
  const handleCreate = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    (navigation as any).navigate('GalleryInviteNew', {
      galleryTitle: trimmed,
      privacy,
      pendingCreate: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>+</Text>
          </View>
        </View>

        <Text style={styles.heading}>New Gallery</Text>
        <Text style={styles.subheading}>Give your gallery a name to get started.</Text>

        <TextInput
          style={styles.input}
          placeholder="Gallery name"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={(text) => { setTitle(text); setDraft({ title: text }); }}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          maxLength={60}
        />

        <Text style={styles.privacyLabel}>Who can see this gallery?</Text>
        <View style={styles.privacyRow}>
          {PRIVACY_OPTIONS.map((opt) => {
            const selected = privacy === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.privacyOption,
                  selected && styles.privacyOptionSelected,
                  pressed && !selected && styles.privacyOptionPressed,
                ]}
                onPress={() => { setPrivacy(opt.value); setDraft({ privacy: opt.value }); }}
              >
                <Text style={[styles.privacyOptionLabel, selected && styles.privacyOptionLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={[styles.privacyOptionDesc, selected && styles.privacyOptionDescSelected]}>
                  {opt.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (!title.trim() || loading) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleCreate}
          disabled={!title.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Gallery</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  iconWrap: { marginBottom: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  iconText: { fontSize: 36, color: '#fff', fontWeight: '300', lineHeight: 44 },

  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },

  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  privacyLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  privacyRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  privacyOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  privacyOptionSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  privacyOptionPressed: { opacity: 0.7 },
  privacyOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  privacyOptionLabelSelected: { color: '#FF6B6B' },
  privacyOptionDesc: { fontSize: 11, color: '#9CA3AF' },
  privacyOptionDescSelected: { color: '#FF6B6B' },

  errorText: { color: '#EF4444', fontSize: 14, marginBottom: 12, textAlign: 'center' },

  button: {
    width: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
