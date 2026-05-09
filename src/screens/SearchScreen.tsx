import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { searchUsers, searchGalleries } from '../lib/search';
import { PeopleSearchResults } from '../components/PeopleSearchResults';
import { GallerySearchResults } from '../components/GallerySearchResults';
import { SearchRecentPeople } from '../components/SearchRecentPeople';
import type { RecentSearch } from '../components/SearchRecentPeople';
import { SearchRecentGalleries } from '../components/SearchRecentGalleries';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';

const MAX_RECENT = 8;

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
  const [popularGalleries, setPopularGalleries] = useState<Gallery[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recentGalleries, setRecentGalleries] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchKeyRef = useRef('');
  const galleriesKeyRef = useRef('');

  const friendIds: string[] = [];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('galleries')
        .select('id, title, cover_photo_url, created_by, created_at, privacy, pinned, comment_count')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(20);
      setPopularGalleries(data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const searchKey = `momento_recent_searches_${user.id}`;
      const galleriesKey = `momento_recent_galleries_${user.id}`;
      searchKeyRef.current = searchKey;
      galleriesKeyRef.current = galleriesKey;

      try {
        const raw = await AsyncStorage.getItem(searchKey);
        const parsed = JSON.parse(raw ?? '[]');
        if (!Array.isArray(parsed)) { setRecentSearches([]); }
        else if (parsed.length > 0 && typeof parsed[0] === 'string') {
          AsyncStorage.removeItem(searchKey);
          setRecentSearches([]);
        } else {
          setRecentSearches(parsed);
        }
      } catch {
        setRecentSearches([]);
      }
      try {
        const stored = await AsyncStorage.getItem(galleriesKey);
        if (stored) setRecentGalleries(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  const saveRecentQuery = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => !(s.type === 'query' && s.text === trimmed));
      const updated: RecentSearch[] = [{ type: 'query', text: trimmed }, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(searchKeyRef.current, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveRecentProfile = useCallback((entry: Extract<RecentSearch, { type: 'profile' }>) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => !(s.type === 'profile' && s.userId === entry.userId));
      const updated: RecentSearch[] = [entry, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(searchKeyRef.current, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveRecentGallery = async (gallery: any) => {
    const updated = [gallery, ...recentGalleries.filter(g => g.id !== gallery.id)].slice(0, 8);
    setRecentGalleries(updated);
    await AsyncStorage.setItem(galleriesKeyRef.current, JSON.stringify(updated));
  };

  const removeRecent = useCallback((index: number) => {
    setRecentSearches(prev => {
      const updated = prev.filter((_, i) => i !== index);
      AsyncStorage.setItem(searchKeyRef.current, JSON.stringify(updated));
      return updated;
    });
  }, []);

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

  const handleSubmit = () => {
    saveRecentQuery(query);
  };

  const handleRecentQueryTap = (text: string) => {
    setQuery(text);
    runSearch(text);
  };

  const handleAddFriend = (_userId: string, _username: string) => {};

  const handleNavigate = (userId: string, username: string) => {
    const found = people.find(p => p.id === userId);
    saveRecentProfile({
      type: 'profile',
      userId,
      username,
      displayName: found?.display_name ?? null,
      avatarUrl: found?.avatar_url ?? null,
    });
    navigation.navigate('FriendProfile', { userId, username });
  };

  const handleGalleryPress = (galleryId: string, galleryTitle: string) => {
    const item = [...galleries, ...popularGalleries].find(g => g.id === galleryId);
    if (item) saveRecentGallery(item);
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
          onSubmitEditing={handleSubmit}
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

      {isEmpty && activeTab === 'people' && (
        <SearchRecentPeople
          recentSearches={recentSearches}
          onClearAll={() => { setRecentSearches([]); AsyncStorage.removeItem(searchKeyRef.current); }}
          onRemove={(i) => removeRecent(i)}
          onQueryTap={handleRecentQueryTap}
          onProfileTap={(userId, username) => navigation.navigate('FriendProfile', { userId, username })}
        />
      )}

      {isEmpty && activeTab === 'galleries' && (
        <SearchRecentGalleries
          recentGalleries={recentGalleries}
          onClearAll={() => { setRecentGalleries([]); AsyncStorage.removeItem(galleriesKeyRef.current); }}
          onGalleryPress={handleGalleryPress}
          currentUserId={session?.user?.id}
          friendIds={friendIds}
        />
      )}

      {query.trim() !== '' && activeTab === 'people' && (
        <PeopleSearchResults
          results={people}
          onAddFriend={handleAddFriend}
          onNavigate={(user) => saveRecentProfile({ type: 'profile', userId: user.userId, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl })}
        />
      )}

      {query.trim() !== '' && activeTab === 'galleries' && (
        <GallerySearchResults
          results={galleries}
          onPress={handleGalleryPress}
          currentUserId={currentUserId}
          friendIds={[]}
        />
      )}

      {query.trim() !== '' && hasNoResults && (
        <View style={styles.center}>
          <Text style={styles.hint}>No results found</Text>
        </View>
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
