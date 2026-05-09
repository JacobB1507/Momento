import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'SetupProfile'> };

export default function SetupProfileScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setDisplayNameError('');
    setUsernameError('');
    setError('');

    let valid = true;
    if (!displayName.trim()) {
      setDisplayNameError('Please enter your display name.');
      valid = false;
    }
    if (!username.trim()) {
      setUsernameError('Please enter a username.');
      valid = false;
    } else if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({
        id: user?.id,
        email: user?.email,
        username: username.toLowerCase().trim().replace('@', ''),
        display_name: displayName.trim(),
        last_username_change: new Date().toISOString(),
      }, { onConflict: 'id' });
    setLoading(false);

    if (saveError) {
      if (saveError.code === '23505') {
        setUsernameError('That username is already taken. Try another.');
      } else {
        setError(saveError.message);
      }
      return;
    }

    navigation.navigate('ProfilePhotoSetup');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.logo}>📸</Text>
            <Text style={styles.appName}>Momento</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              Choose a username and display name to get started.
            </Text>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Your Name</Text>
                <Text style={styles.labelHint}>This can be changed at any time</Text>
              </View>
              {!!displayNameError && <Text style={styles.fieldError}>{displayNameError}</Text>}
              <TextInput
                style={styles.input}
                placeholder="Jane Smith"
                placeholderTextColor="#9CA3AF"
                value={displayName}
                onChangeText={v => { setDisplayName(v); setDisplayNameError(''); }}
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.labelHint}>Can only be updated every 30 days</Text>
              </View>
              {!!usernameError && <Text style={styles.fieldError}>{usernameError}</Text>}
              <TextInput
                  style={styles.input}
                  placeholder="@username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={v => {
                    setUsername(v.toLowerCase().replace(/\s/g, ''));
                    setUsernameError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Get Started</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FF6B6B' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  hero: {
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logo: { fontSize: 48, marginBottom: 12 },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 28,
    lineHeight: 22,
  },

  field: { marginBottom: 20 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  labelHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  errorText: { color: '#FF3B30', fontSize: 13, marginBottom: 12 },
  fieldError: { color: '#FF3B30', fontSize: 13, marginBottom: 6 },
});
