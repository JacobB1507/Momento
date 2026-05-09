import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type RecentSearch =
  | { type: 'query'; text: string }
  | { type: 'profile'; userId: string; username: string; displayName: string | null; avatarUrl: string | null };

type Props = {
  recentSearches: RecentSearch[];
  onClearAll: () => void;
  onRemove: (index: number) => void;
  onQueryTap: (text: string) => void;
  onProfileTap: (userId: string, username: string) => void;
};

const AVATAR_COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function SearchRecentPeople({ recentSearches, onClearAll, onRemove, onQueryTap, onProfileTap }: Props) {
  if (recentSearches.length === 0) return null;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#000000', fontSize: 16, fontWeight: '700' }}>Recent</Text>
        <TouchableOpacity onPress={onClearAll}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {recentSearches.map((entry, i) => {
        if (entry.type === 'query') {
          return (
            <TouchableOpacity
              key={`q-${entry.text}-${i}`}
              style={styles.recentRow}
              onPress={() => onQueryTap(entry.text)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color="#9CA3AF" />
              <Text style={styles.recentTerm}>{entry.text}</Text>
              <TouchableOpacity onPress={() => onRemove(i)} hitSlop={8}>
                <Ionicons name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }

        const label = entry.displayName || entry.username;
        const initial = label.charAt(0).toUpperCase();

        return (
          <TouchableOpacity
            key={`p-${entry.userId}`}
            style={styles.recentRow}
            onPress={() => onProfileTap(entry.userId, entry.username)}
            activeOpacity={0.7}
          >
            {entry.avatarUrl ? (
              <Image source={{ uri: entry.avatarUrl }} style={styles.recentAvatar} />
            ) : (
              <View style={[styles.recentAvatarPlaceholder, { backgroundColor: avatarColor(entry.userId) }]}>
                <Text style={styles.recentAvatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.recentProfileInfo}>
              <Text style={styles.recentProfileName}>{label}</Text>
              <Text style={styles.recentProfileHandle}>@{entry.username}</Text>
            </View>
            <TouchableOpacity onPress={() => onRemove(i)} hitSlop={8}>
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recentTerm: {
    flex: 1,
    color: '#000000',
    fontSize: 17,
    marginLeft: 10,
  },
  recentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  recentAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatarInitial: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  recentProfileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  recentProfileName: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  recentProfileHandle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 1,
  },
});
