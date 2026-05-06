import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🖼️</Text>
      <Text style={styles.emptyTitle}>No galleries yet</Text>
      <Text style={styles.emptySubtitle}>Tap + to create your first gallery or get invited to one.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});
