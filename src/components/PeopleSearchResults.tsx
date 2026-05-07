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

type Props = {
  results: User[];
  onAddFriend: (userId: string, username: string) => void;
  onNavigate: (userId: string, username: string) => void;
};

export function PeopleSearchResults({ results }: Props) {
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
        <SearchPersonRow user={item} currentUserId={currentUserId} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
});
