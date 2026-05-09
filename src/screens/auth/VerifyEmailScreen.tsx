import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';
import styles from '../../styles/verifyEmailStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function VerifyEmailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'VerifyEmail'>>();
  const email = route.params.email;

  const [checking, setChecking] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleCheckVerified = async () => {
    setChecking(true);
    setNotVerified(false);
    const { data } = await supabase.auth.getSession();
    const confirmed = data?.session?.user?.email_confirmed_at;
    setChecking(false);
    if (confirmed) {
      navigation.reset({ index: 0, routes: [{ name: 'UsernameSetup' }] });
    } else {
      setNotVerified(true);
    }
  };

  const handleResend = async () => {
    setResending(true);
    await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    setResent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.container}>
        <MaterialCommunityIcons name="email-outline" size={64} color="#FF6B6B" style={styles.icon} />
        <Text style={styles.heading}>Verify your email</Text>
        <Text style={styles.sub}>
          We sent a verification link to{' '}
          <Text style={styles.email}>{email}</Text>
          {'. Check your inbox and verify before continuing.'}
        </Text>
        <Pressable
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={handleCheckVerified}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>I've verified my email</Text>
          }
        </Pressable>
        {notVerified && (
          <Text style={styles.notVerifiedText}>Email not verified yet — check your inbox</Text>
        )}
        {resent
          ? <Text style={styles.resendSentText}>Verification email resent!</Text>
          : <Pressable onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color="#FF6B6B" />
                : <Text style={styles.resendText}>Resend email</Text>
              }
            </Pressable>
        }
      </View>
    </SafeAreaView>
  );
}
