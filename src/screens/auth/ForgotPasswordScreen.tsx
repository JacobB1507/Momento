import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthBackButton from '../../components/AuthBackButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AuthBackButton onPress={() => navigation.goBack()} top={16} />
      <View style={styles.wipContainer}>
        <Ionicons name="time-outline" size={64} color="#9CA3AF" />
        <Text style={styles.wipTitle}>Coming soon</Text>
        <Text style={styles.wipBody}>
          Password reset isn't available yet in the beta. For now, please contact us if you've lost access to your account.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  wipContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  wipTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  wipBody: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
