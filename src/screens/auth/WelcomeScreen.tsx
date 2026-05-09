import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'> };

export default function WelcomeScreen({ navigation }: Props) {
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (url.includes('access_token') || url.includes('type=signup')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigation.reset({ index: 0, routes: [{ name: 'SetupProfile' }] });
        }
      }
    };

    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>

        <View style={styles.upper}>
          <Text style={styles.logo}>📸</Text>
          <Text style={styles.wordmark}>Momento</Text>
          <Text style={styles.tagline}>Your memories, together.</Text>
        </View>

        <View style={styles.lower}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnPressed]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.btnOutlineText}>Sign In</Text>
          </Pressable>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FF6B6B' },
  container: { flex: 1, paddingHorizontal: 32 },

  backBtn: {
    position: 'absolute',
    top: 12,
    left: 0,
    zIndex: 10,
    padding: 4,
  },

  upper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 64, marginBottom: 16 },
  wordmark: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '400',
  },

  lower: {
    paddingBottom: 48,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#FF6B6B',
    fontSize: 17,
    fontWeight: '700',
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  btnPressed: { opacity: 0.85 },

});
