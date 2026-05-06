import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { getProfile, uploadAvatar } from '../lib/galleries';
import { getFriends } from '../lib/friends';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const email = session?.user.email ?? '';

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [friendCount, setFriendCount] = useState(0);

  const loadProfile = async () => {
    if (!userId) return;
    const [profile, friends] = await Promise.all([
      getProfile(userId),
      getFriends(userId),
    ]);
    setFriendCount((friends as unknown[]).length);
    if (profile) {
      if (profile.username) setUsername(profile.username);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (data?.username) setUsername(data.username);
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
  };

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    const url = await uploadAvatar(userId, uri);
    setUploading(false);

    if (url) {
      setAvatarUrl(url);
    } else {
      Alert.alert('Upload failed', 'Could not update your avatar. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const placeholderLetter = (username || email).charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: 60, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadProfile();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.card}>
          <Pressable onPress={handleAvatarPress} style={styles.avatarWrapper}>
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{placeholderLetter}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>✎</Text>
            </View>
          </Pressable>

          <Text style={styles.username}>@{username || 'unknown'}</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.friendCount}>{friendCount} Friends</Text>
        </View>

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.friendsButton, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate('Friends')}
          >
            <Text style={styles.friendsText}>Friends</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.65 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 96;
const BADGE_SIZE = 28;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, alignSelf: 'stretch' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },

  card: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginBottom: 20,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },

  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editBadgeIcon: { color: '#fff', fontSize: 13, lineHeight: 16 },

  username: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280' },
  friendCount: { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  section: { alignSelf: 'stretch', paddingHorizontal: 16, marginTop: 24, gap: 12 },
  friendsButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  friendsText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  settingsButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  settingsText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOutButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '600' },
});
