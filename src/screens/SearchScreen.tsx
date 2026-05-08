import React, { useCallback, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { searchUsers, searchGalleries } from '../lib/search';
import { PeopleSearchResults } from '../components/PeopleSearchResults';
import { GallerySearchResults } from '../components/GallerySearchResults';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'people' | 'galleries';

export default function SearchScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NavProp>();
  const currentUserId = session?.user.id ?? '';

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('people');
  const [people, setPeople] = useState<any[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setPeople([]);
      setGalleries([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const [userResults, galleryResults] = await Promise.all([
        searchUsers(text, currentUserId),
        searchGalleries(text, currentUserId),
      ]);
      setPeople(userResults);
      setGalleries(galleryResults as Gallery[]);
    }, 300);
  }, [currentUserId]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    runSearch(text);
  };

  const handleAddFriend = (_userId: string, _username: string) => {};
  const handleNavigate = (userId: string, username: string) => {
    navigation.navigate('FriendProfile', { userId, username });
  };
  const handleGalleryPress = (galleryId: string, galleryTitle: string) => {
    navigation.navigate('GalleryDetail', { galleryId, galleryTitle });
  };

  const isEmpty = query.trim() === '';
  const hasNoResults = !isEmpty && (activeTab === 'people' ? people.length === 0 : galleries.length === 0);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search people or galleries..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleChangeText}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <View style={styles.tabs}>
        {(['people', 'galleries'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'people' ? 'People' : 'Galleries'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.hint}>Search for people or galleries...</Text>
        </View>
      ) : hasNoResults ? (
        <View style={styles.center}>
          <Text style={styles.hint}>No results found</Text>
        </View>
      ) : activeTab === 'people' ? (
        <PeopleSearchResults
          results={people}
          onAddFriend={handleAddFriend}
          onNavigate={handleNavigate}
        />
      ) : (
        <GallerySearchResults
          results={galleries}
          onPress={handleGalleryPress}
          currentUserId={currentUserId}
          friendIds={[]}
        />
      )}
    </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 14, color: '#9CA3AF' },
});
