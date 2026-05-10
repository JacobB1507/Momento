import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
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
import { useTutorial } from '../context/TutorialContext';
import { createInviteLink } from '../lib/friends';
import { searchUsers } from '../lib/search';
import { checkRateLimit } from '../lib/rateLimit';
import { userFacingError, reportError } from '../lib/errorReport';
import { SearchPersonRow } from '../components/SearchPersonRow';
import SuggestedFriendsSection from '../components/SuggestedFriendsSection';

type ShareType = 'message' | 'whatsapp' | 'email' | 'more';

const SHARE_BUTTONS: { type: ShareType; icon: React.ReactNode; label: string }[] = [
  { type: 'message',  icon: <MaterialCommunityIcons name="message-text" size={28} color="#34C759" />, label: 'Message'  },
  { type: 'whatsapp', icon: <FontAwesome name="whatsapp" size={28} color="#25D366" />,                label: 'WhatsApp' },
  { type: 'email',    icon: <MaterialCommunityIcons name="email" size={28} color="#007AFF" />,        label: 'Email'    },
  { type: 'more',     icon: <Entypo name="dots-three-horizontal" size={28} color="#8E8E93" />,        label: 'More'     },
];

export default function AddFriendScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const tutorial = useTutorial();
  const tutorialActive = tutorial.active;
  const currentUserId = session?.user.id ?? '';

  useEffect(() => {
    if (tutorial.active && tutorial.currentStep?.id === 'nav_add_friend') {
      setTimeout(() => tutorial.nextStep(), 300);
    }
  }, [tutorial.active, tutorial.currentStep?.id]);

  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<any[]>([]);
  const [sharingType, setSharingType] = useState<ShareType | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPeople([]); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchUsers(text, currentUserId);
      setPeople(results);
    }, 300);
  };

  const handleShare = async (type: ShareType) => {
    const allowed = await checkRateLimit('friend_request');
    if (!allowed) {
      Alert.alert('Slow down', 'Please wait a few minutes before trying again.');
      return;
    }
    setSharingType(type);
    const link = await createInviteLink(currentUserId);
    setSharingType(null);
    if (!link) { Alert.alert('Error', 'Could not create invite link. Please try again.'); return; }
    const msg = `Join me on Momento! ${link}`;
    try {
      switch (type) {
        case 'message':  await Linking.openURL(`sms:?body=${encodeURIComponent(msg)}`); break;
        case 'whatsapp': await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`); break;
        case 'email':    await Linking.openURL(`mailto:?subject=${encodeURIComponent('Join me on Momento')}&body=${encodeURIComponent(msg)}`); break;
        case 'more':     await Share.share({ message: msg }); break;
      }
    } catch (err) {
      Alert.alert('Error', userFacingError(err));
      reportError('AddFriendScreen.share', err);
    }
  };

  const listHeader = (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <Text style={styles.sectionLabel}>Search by name or username</Text>
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(text) => { setQuery(text); runSearch(text); }}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={!tutorialActive}
          placeholder="Search people..."
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  const listFooter = (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Invite via</Text>
      <View style={styles.shareCard}>
        {SHARE_BUTTONS.map(({ type, icon, label }) => (
          <Pressable
            key={type}
            style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
            onPress={() => handleShare(type)}
            disabled={sharingType !== null}
          >
            <View style={styles.shareIconCircle}>
              {sharingType === type ? <ActivityIndicator color="#fff" size="small" /> : icon}
            </View>
            <Text style={styles.shareLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.sectionLabel, { marginTop: 32, paddingTop: 12 }]}>People you may know</Text>
      <SuggestedFriendsSection onFriendAdded={() => {}} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Add Friend</Text>
        </View>
        <FlatList
          data={query.trim() === '' ? [] : people}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SearchPersonRow user={item} currentUserId={currentUserId} />}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            query.trim() !== ''
              ? <Text style={{ textAlign: 'center', padding: 16, color: '#9ca3af', fontSize: 14 }}>No users found</Text>
              : null
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        />
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
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionLabelSpaced: { marginTop: 28 },
  inputCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  input: { paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#111827' },
  shareCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 20, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  shareButton: { alignItems: 'center', gap: 8 },
  shareIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  shareLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
});
