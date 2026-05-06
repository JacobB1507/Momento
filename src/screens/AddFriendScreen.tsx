import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Entypo from '@expo/vector-icons/Entypo';
import { useAuth } from '../context/AuthContext';
import { sendFriendRequest, createInviteLink } from '../lib/friends';

type ShareType = 'message' | 'whatsapp' | 'email' | 'more';

const SHARE_BUTTONS: { type: ShareType; icon: React.ReactNode; label: string }[] = [
  { type: 'message',  icon: <MaterialCommunityIcons name="message-text" size={28} color="#34C759" />, label: 'Message'  },
  { type: 'whatsapp', icon: <FontAwesome name="whatsapp" size={28} color="#25D366" />,                label: 'WhatsApp' },
  { type: 'email',    icon: <MaterialCommunityIcons name="email" size={28} color="#007AFF" />,        label: 'Email'    },
  { type: 'more',     icon: <Entypo name="dots-three-horizontal" size={28} color="#8E8E93" />,        label: 'More'     },
];

export default function AddFriendScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const [sharingType, setSharingType] = useState<ShareType | null>(null);

  const handleSend = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Enter a username', 'Please type a username to search for.');
      return;
    }
    setSending(true);
    const result = await sendFriendRequest(userId, trimmed);
    setSending(false);
    switch (result) {
      case 'sent':
        Alert.alert('Request sent!', 'Friend request sent!');
        setUsername('');
        break;
      case 'not_found':
        Alert.alert('Not found', 'No user found with that username.');
        break;
      case 'already_friends':
        Alert.alert('Already connected', "You're already connected with this user.");
        break;
      case 'error':
        Alert.alert('Error', 'Something went wrong, please try again.');
        break;
    }
  };

  const handleShare = async (type: ShareType) => {
    setSharingType(type);
    const link = await createInviteLink(userId);
    setSharingType(null);

    if (!link) {
      Alert.alert('Error', 'Could not create invite link. Please try again.');
      return;
    }

    const text = `Join me on Momento! ${link}`;

    try {
      switch (type) {
        case 'message':
          await Linking.openURL(`sms:?body=${encodeURIComponent(text)}`);
          break;
        case 'whatsapp':
          await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
          break;
        case 'email':
          await Linking.openURL(
            `mailto:?subject=${encodeURIComponent('Join me on Momento')}&body=${encodeURIComponent(text)}`,
          );
          break;
        case 'more':
          await Share.share({ message: text });
          break;
      }
    } catch {
      Alert.alert('Error', 'Could not open share. Please try again.');
    }
  };

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
          <Text style={styles.headerTitle}>Add Friend</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Add by username</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="Enter username"
              placeholderTextColor="#9CA3AF"
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && { opacity: 0.75 },
              sending && styles.buttonDisabled,
            ]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send Request</Text>
            )}
          </Pressable>

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Invite via</Text>
          <View style={styles.shareCard}>
            {SHARE_BUTTONS.map(({ type, icon, label }) => (
              <Pressable
                key={type}
                style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
                onPress={() => handleShare(type)}
                disabled={sharingType !== null}
              >
                <View style={styles.shareIconCircle}>
                  {sharingType === type ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    icon
                  )}
                </View>
                <Text style={styles.shareLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  cancelButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  cancelText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionLabelSpaced: { marginTop: 28 },

  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  sendButton: {
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
  buttonDisabled: { opacity: 0.6 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  shareCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  shareButton: { alignItems: 'center', gap: 8 },
  shareIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
});
