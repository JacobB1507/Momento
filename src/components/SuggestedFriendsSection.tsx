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
  const [pendingFromThem, setPendingFromThem] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [data, pendingRes] = await Promise.all([
        getSuggestedFriends(supabase),
        user
          ? supabase.from('friends').select('sender_id').eq('receiver_id', user.id).eq('status', 'pending')
          : Promise.resolve({ data: [] }),
      ]);
      setSuggestions(data);
      setPendingFromThem(new Set(((pendingRes as any).data ?? []).map((r: any) => r.sender_id)));
      setLoading(false);
    })();
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

  const handleAccept = async (item: SuggestedFriend) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('friends').update({ status: 'accepted' })
      .eq('sender_id', item.user_id)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    setSuggestions(prev => prev.filter(s => s.user_id !== item.user_id));
    onFriendAdded?.();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FF6B6B" />
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
            theyAddedMe={pendingFromThem.has(item.user_id)}
            onAdd={() => handleAdd(item)}
            onAccept={() => handleAccept(item)}
          />
        )}
      />
    </View>
  );
}

function SuggestionCard({
  item,
  isPending,
  theyAddedMe,
  onAdd,
  onAccept,
}: {
  item: SuggestedFriend;
  isPending: boolean;
  theyAddedMe: boolean;
  onAdd: () => void;
  onAccept: () => void;
}) {
  const displayName = item.display_name || item.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  let reasonText: string;
  let reasonColor: string = '#9CA3AF';
  if (theyAddedMe) {
    reasonText = 'Added you!';
    reasonColor = '#22C55E';
  } else if (item.mutual_count > 0) {
    reasonText = `${item.mutual_count} mutual friend${item.mutual_count === 1 ? '' : 's'}`;
  } else if (!item.is_friend && item.mutual_count === 0) {
    reasonText = 'Popular on Momento';
  } else {
    reasonText = 'You may know';
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
      <Text style={[styles.subText, { color: reasonColor, marginBottom: 10 }]}>{reasonText}</Text>
      {theyAddedMe ? (
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.75}>
          <Text style={styles.addButtonText}>Accept</Text>
        </TouchableOpacity>
      ) : (
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
      )}
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
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 0,
  },
  sectionTitle: {
    color: '#111827',
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
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    backgroundColor: '#FF6B6B',
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
    color: '#111827',
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
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  acceptButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  pendingButton: {
    backgroundColor: '#F3F4F6',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingButtonText: {
    color: '#6B7280',
  },
});
