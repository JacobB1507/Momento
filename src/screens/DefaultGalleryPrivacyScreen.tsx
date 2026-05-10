import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { getDefaultGalleryPrivacy, setDefaultGalleryPrivacy } from '../lib/galleries';

type Privacy = 'private' | 'friends' | 'public';

const OPTIONS: { value: Privacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

export default function DefaultGalleryPrivacyScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [selected, setSelected] = useState<Privacy>('friends');
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getDefaultGalleryPrivacy(userId).then((pref) => {
      setSelected(pref);
      setLoadingInitial(false);
    });
  }, [userId]);

  const handleSelect = async (value: Privacy) => {
    setSelected(value);
    await setDefaultGalleryPrivacy(userId, value);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Default Gallery Privacy</Text>
      </View>

      <Text style={styles.explainer}>
        Choose the default privacy setting for new galleries. You can still change it on a per-gallery basis when creating one.
      </Text>

      {loadingInitial ? (
        <ActivityIndicator color="#FF6B6B" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.card}>
          {OPTIONS.map((opt, idx) => (
            <View key={opt.value}>
              {idx > 0 && <View style={styles.separator} />}
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => handleSelect(opt.value)}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  <Text style={styles.rowDesc}>{opt.description}</Text>
                </View>
                {selected === opt.value && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </Pressable>
            </View>
          ))}
        </View>
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

  explainer: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 16,
    marginBottom: 20,
    lineHeight: 20,
  },

  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowPressed: { backgroundColor: '#F3F4F6' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, color: '#111827', fontWeight: '500' },
  rowDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
});
