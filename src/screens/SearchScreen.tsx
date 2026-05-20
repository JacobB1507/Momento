import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTutorial } from '../tutorial/TutorialContext';
import { supabase } from '../lib/supabase';
import { searchUsers, searchGalleries } from '../lib/search';
import { SkeletonCircle, SkeletonText } from '../components/Skeleton';
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
  const { active: tutorialActive } = useTutorial();
  const navigation = useNavigation<NavProp>();
  const currentUserId = session?.user.id ?? '';

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('people');
  const [people, setPeople] = useState<any[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [popularGalleries, setPopularGalleries] = useState<Gallery[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [recentGalleries, setRecentGalleries] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchKeyRef = useRef('');
  const galleriesKeyRef = useRef('');

  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState<boolean>(true);
  const friendIds = useMemo(() => friendsList.map((f: any) => f.id), [friendsList]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setFriendsLoading(false); return; }

        const { data: rows, error: friendsError } = await supabase
          .from('friends')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (friendsError) { setFriendsLoading(false); return; }

        const otherIds = (rows || [])
          .map((r: any) => r.sender_id === user.id ? r.receiver_id : r.sender_id)
          .filter(Boolean);

        if (otherIds.length === 0) {
          setFriendsList([]);
          setFriendsLoading(false);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', otherIds);

        if (profilesError) { setFriendsList([]); setFriendsLoading(false); return; }

        const sorted = (profiles || []).slice().sort((a: any, b: any) => {
          const aName = (a.display_name || a.username || '').toLowerCase();
          const bName = (b.display_name || b.username || '').toLowerCase();
          return aName.localeCompare(bName);
        });

        setFriendsList(sorted);
        setFriendsLoading(false);
      } catch {
        setFriendsLoading(false);
      }
    })();
  }, []);

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
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [userResults, galleryResults] = await Promise.all([
          searchUsers(text, currentUserId),
          searchGalleries(text, currentUserId),
        ]);
        setPeople(userResults);
        setGalleries(galleryResults as Gallery[]);
      } finally {
        setSearching(false);
      }
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
          autoFocus={!tutorialActive}
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

      {isEmpty && activeTab === 'people' && !friendsLoading && friendsList.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, marginTop: 24 }}>
          <Text style={styles.suggestedHeading}>SUGGESTED</Text>
          <PeopleSearchResults
            results={friendsList.slice(0, 5)}
            onAddFriend={handleAddFriend}
            onNavigate={(user) => saveRecentProfile({ type: 'profile', userId: user.userId, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl })}
          />
        </View>
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

      {query.trim() !== '' && (
        searching ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                }}
              >
                <SkeletonCircle size={40} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <SkeletonText width="45%" height={14} />
                  <View style={{ height: 4 }} />
                  <SkeletonText width="30%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {activeTab === 'people' && (
              <PeopleSearchResults
                results={people}
                onAddFriend={handleAddFriend}
                onNavigate={(user) => saveRecentProfile({ type: 'profile', userId: user.userId, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl })}
              />
            )}
            {activeTab === 'galleries' && (
              <GallerySearchResults
                results={galleries}
                onPress={handleGalleryPress}
                currentUserId={currentUserId}
                friendIds={[]}
              />
            )}
            {hasNoResults && (
              <View style={styles.center}>
                <Text style={styles.hint}>No results found</Text>
              </View>
            )}
          </>
        )
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
  suggestedHeading: { fontSize: 12, fontWeight: '500', color: '#B0B7C3', letterSpacing: 0.4, marginBottom: 2 },
});
