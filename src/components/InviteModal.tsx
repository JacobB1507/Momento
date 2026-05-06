import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { inviteUserToGallery } from '../lib/galleries';

type Props = {
  visible: boolean;
  galleryId: string;
  onClose: () => void;
};

export function InviteModal({ visible, galleryId, onClose }: Props) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [noAccountVisible, setNoAccountVisible] = useState(false);

  const close = () => { onClose(); setInviteEmail(''); setNoAccountVisible(false); };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    try {
      const result = await inviteUserToGallery(galleryId, email);
      if (result === 'no_account') { setNoAccountVisible(true); return; }
      close();
      Alert.alert('Invited', `${email} has been added to this gallery.`);
    } catch (e: any) {
      Alert.alert('Could not invite', e?.message ?? 'Something went wrong.');
    } finally {
      setInviting(false);
    }
  };

  const handleTextInvite = () => {
    Linking.openURL(`sms:?body=${encodeURIComponent("Hey! I've been using Momento to share photos privately with friends and family. Download the app and I'll add you to my gallery!")}`);
    close();
  };

  const handleEmailInvite = () => {
    const subject = encodeURIComponent('Join me on Momento');
    const body = encodeURIComponent(`Hey!\n\nI've been using Momento to share photos privately with friends and family. Download the app and I'll add you to my gallery!\n\nSee you there!`);
    Linking.openURL(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`);
    close();
  };

  return (
    <>
      <Modal
        visible={visible && !noAccountVisible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.card}>
            <Text style={styles.title}>Invite by email</Text>
            <TextInput
              style={styles.input}
              placeholder="friend@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              value={inviteEmail}
              onChangeText={setInviteEmail}
              onSubmitEditing={handleInvite}
              returnKeyType="send"
            />
            <View style={styles.buttons}>
              <Pressable style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]} onPress={close}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.send, (!inviteEmail.trim() || inviting) && styles.sendDisabled, pressed && { opacity: 0.8 }]}
                onPress={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
              >
                {inviting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Send</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={noAccountVisible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.noAccountIcon}>👋</Text>
            <Text style={styles.title}>This person isn't on Momento yet!</Text>
            <Text style={styles.noAccountSubtitle}>
              Invite {inviteEmail} to join and you'll be able to add them to your gallery.
            </Text>
            <Pressable style={({ pressed }) => [styles.noAccountBtn, pressed && { opacity: 0.8 }]} onPress={handleTextInvite}>
              <Text style={styles.noAccountBtnText}>Send Text Invite</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.noAccountBtnOutline, pressed && { opacity: 0.8 }]} onPress={handleEmailInvite}>
              <Text style={styles.noAccountBtnOutlineText}>Send Email Invite</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.6 }]} onPress={close}>
              <Text style={styles.dismissText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  buttons: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  send: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendDisabled: { opacity: 0.45, shadowOpacity: 0 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noAccountIcon: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  noAccountSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  noAccountBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  noAccountBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noAccountBtnOutline: { borderWidth: 1.5, borderColor: '#FF6B6B', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  noAccountBtnOutlineText: { color: '#FF6B6B', fontWeight: '600', fontSize: 15 },
  dismiss: { alignItems: 'center', paddingVertical: 4 },
  dismissText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
