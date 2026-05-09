import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onBack: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  hasUnread: boolean;
};

export function NotificationsHeader({ onBack, onMarkAllRead, onClearAll, hasUnread }: Props) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Notifications</Text>
      <View style={styles.headerActions}>
        {hasUnread && (
          <TouchableOpacity
            onPress={onMarkAllRead}
            style={styles.actionBtn}
            activeOpacity={0.6}
          >
            <Text style={styles.markAllText}>Mark read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onClearAll}
          style={styles.actionBtn}
          activeOpacity={0.6}
        >
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: { paddingVertical: 4, paddingRight: 4 },
  backText: { fontSize: 32, color: '#FF6B6B', fontWeight: '300', lineHeight: 36 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  markAllText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  clearText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
});
