import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import styles from '../styles/usernameSetupStyles';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,}$/;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function UsernameSetupScreen() {
  const navigation = useNavigation<NavProp>();
  const { session } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = username.trim().toLowerCase();
    if (!USERNAME_RE.test(trimmed)) {
      setError('Username must be at least 3 characters and only contain letters, numbers, or underscores.');
      return;
    }
    setLoading(true);
    setError('');
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .maybeSingle();
    if (existing) {
      setError('That username is already taken. Try another.');
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', session!.user.id);
    setLoading(false);
    if (updateError) {
      setError('Something went wrong. Please try again.');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup' }] });
  };

  const isValid = USERNAME_RE.test(username.trim());

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={styles.logo}>Momento</Text>
        <Text style={styles.heading}>Choose your username</Text>
        <Text style={styles.sub}>This is how others will find and mention you.</Text>
        <TextInput
          style={[styles.input, !!error && styles.inputError]}
          placeholder="username"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={v => { setUsername(v); setError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <Pressable
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Continue</Text>
          }
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
