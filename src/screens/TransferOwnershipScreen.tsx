import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { verifyCurrentUserPassword, transferGalleryOwnership } from '../lib/galleries';
import { TransferPasswordStage } from '../components/transfer/TransferPasswordStage';
import { TransferSelectStage } from '../components/transfer/TransferSelectStage';
import type { TransferMember } from '../components/transfer/TransferSelectStage';
import { TransferConfirmStage } from '../components/transfer/TransferConfirmStage';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'TransferOwnership'>;
type RouteProps = RouteProp<RootStackParamList, 'TransferOwnership'>;

export default function TransferOwnershipScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId, galleryTitle } = route.params;
  const { session } = useAuth();

  const [stage, setStage] = useState<'password' | 'select' | 'confirm'>('password');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<TransferMember | null>(null);
  const [transferring, setTransferring] = useState(false);

  const handleContinue = async () => {
    setVerifying(true);
    setPasswordError(null);
    const { valid } = await verifyCurrentUserPassword(password);
    setVerifying(false);
    if (!valid) {
      setPasswordError('Incorrect password');
      return;
    }
    setStage('select');
  };

  const handleSelect = (member: TransferMember) => {
    setSelectedNewOwner(member);
    setStage('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedNewOwner) return;
    setTransferring(true);
    const { error } = await transferGalleryOwnership(galleryId, selectedNewOwner.user_id);
    setTransferring(false);
    if (error) {
      Alert.alert('Transfer failed', error.message);
      return;
    }
    const name = selectedNewOwner.display_name || selectedNewOwner.username;
    Alert.alert(
      'Ownership transferred',
      `${name} is now the owner of this gallery.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>
      {stage === 'password' && (
        <TransferPasswordStage
          galleryTitle={galleryTitle}
          password={password}
          onPasswordChange={setPassword}
          passwordError={passwordError}
          verifying={verifying}
          onContinue={handleContinue}
        />
      )}
      {stage === 'select' && (
        <TransferSelectStage
          galleryId={galleryId}
          currentUserId={session?.user?.id ?? ''}
          onSelect={handleSelect}
        />
      )}
      {stage === 'confirm' && selectedNewOwner && (
        <TransferConfirmStage
          selectedNewOwner={selectedNewOwner}
          transferring={transferring}
          onConfirm={handleConfirm}
          onCancel={() => { setSelectedNewOwner(null); setStage('select'); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
});
