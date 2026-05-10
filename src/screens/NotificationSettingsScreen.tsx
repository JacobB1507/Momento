import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getNotificationPreferences, updateNotificationPreference } from '../lib/notifications';
import type { NotificationPreferences } from '../lib/notifications';

type Row = { key: keyof NotificationPreferences; label: string; description: string };
type Section = { header: string; rows: Row[] };

const SECTIONS: Section[] = [
  {
    header: 'SOCIAL',
    rows: [
      { key: 'friend_request', label: 'Friend Requests', description: 'When someone sends you a friend request' },
      { key: 'friend_accepted', label: 'Friend Accepted', description: 'When someone accepts your friend request' },
    ],
  },
  {
    header: 'GALLERIES',
    rows: [
      { key: 'gallery_invite', label: 'Gallery Invites', description: "When you're added to a gallery" },
      { key: 'gallery_photo_added', label: 'New Photos', description: 'When someone adds a photo to a shared gallery' },
      { key: 'comment', label: 'Comments', description: "When someone comments on a gallery you're in" },
      { key: 'comment_reply', label: 'Replies', description: 'When someone replies to your comment' },
      { key: 'removal_request', label: 'Photo Removal Requests', description: 'When someone requests to remove your photo' },
      { key: 'removal_vote', label: 'Removal Votes', description: 'When someone votes on your removal request' },
    ],
  },
  {
    header: 'MESSAGES',
    rows: [
      { key: 'message', label: 'Messages', description: 'When you receive a new message' },
      { key: 'message_request', label: 'Message Requests', description: "When someone who isn't a friend wants to message you" },
    ],
  },
];

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (!userId) return;
    getNotificationPreferences(userId).then(setPrefs);
  }, [userId]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const prev = prefs[key];
    setPrefs({ ...prefs, [key]: value });
    try {
      await updateNotificationPreference(userId, key, value);
    } catch {
      setPrefs({ ...prefs, [key]: prev });
      Alert.alert('Error', 'Could not save preference. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {!prefs ? (
        <ActivityIndicator color="#FF6B6B" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {SECTIONS.map((section) => (
            <View key={section.header} style={styles.section}>
              <Text style={styles.sectionHeader}>{section.header}</Text>
              <View style={styles.card}>
                {section.rows.map((row, idx) => (
                  <View key={row.key}>
                    {idx > 0 && <View style={styles.separator} />}
                    <View style={styles.row}>
                      <View style={styles.rowText}>
                        <Text style={styles.rowLabel}>{row.label}</Text>
                        <Text style={styles.rowDesc}>{row.description}</Text>
                      </View>
                      <Switch
                        value={prefs[row.key]}
                        onValueChange={(val) => handleToggle(row.key, val)}
                        trackColor={{ false: '#E5E7EB', true: '#FF6B6B' }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16 },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
