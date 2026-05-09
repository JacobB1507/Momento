import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SearchPersonRow } from './SearchPersonRow';

type User = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type NavigateUser = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type Props = {
  results: User[];
  onAddFriend: (userId: string, username: string) => void;
  onNavigate?: (user: NavigateUser) => void;
};

export function PeopleSearchResults({ results, onNavigate }: Props) {
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';

  return (
    <FlatList
      key="people_list"
      data={results}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <SearchPersonRow
          user={item as any}
          currentUserId={currentUserId}
          onPress={onNavigate ? () => onNavigate({
            userId: item.id,
            username: item.username ?? 'unknown',
            displayName: (item as any).display_name ?? null,
            avatarUrl: item.avatar_url ?? null,
          }) : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
});
