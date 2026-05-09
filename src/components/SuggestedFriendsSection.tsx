import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { getSuggestedFriends, SuggestedFriend } from '../lib/suggestedFriends';

type Props = { onFriendAdded?: () => void; hideHeader?: boolean };

export default function SuggestedFriendsSection({ onFriendAdded, hideHeader = false }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    getSuggestedFriends(supabase).then(data => {
      setSuggestions(data);
      setLoading(false);
    });
  }, []);

  const handleAdd = async (item: SuggestedFriend) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('friends').insert({
      sender_id: user.id,
      receiver_id: item.user_id,
      status: 'pending',
    });
    if (!error) {
      setPending(prev => new Set(prev).add(item.user_id));
      onFriendAdded?.();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#E91E8C" />
      </View>
    );
  }

  if (!suggestions.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={suggestions}
        keyExtractor={item => item.user_id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SuggestionCard
            item={item}
            isPending={pending.has(item.user_id)}
            onAdd={() => handleAdd(item)}
          />
        )}
      />
    </View>
  );
}

function SuggestionCard({
  item,
  isPending,
  onAdd,
}: {
  item: SuggestedFriend;
  isPending: boolean;
  onAdd: () => void;
}) {
  const displayName = item.display_name || item.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  let subText: string | null = null;
  if (item.mutual_count > 0) {
    subText = `${item.mutual_count} mutual friend${item.mutual_count === 1 ? '' : 's'}`;
  } else if (item.friend_count > 0) {
    subText = 'Popular on Momento';
  }

  return (
    <View style={styles.card}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      {subText && <Text style={styles.subText}>{subText}</Text>}
      <TouchableOpacity
        style={[styles.addButton, isPending && styles.pendingButton]}
        onPress={onAdd}
        disabled={isPending}
        activeOpacity={0.75}
      >
        <Text style={[styles.addButtonText, isPending && styles.pendingButtonText]}>
          {isPending ? 'Pending' : 'Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  container: {
    marginBottom: 8,
    marginTop: 0,
  },
  header: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 0,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 4,
  },
  card: {
    width: 120,
    marginRight: 12,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  initials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subText: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#E91E8C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  pendingButton: {
    backgroundColor: '#3A3A3C',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingButtonText: {
    color: '#9CA3AF',
  },
});
