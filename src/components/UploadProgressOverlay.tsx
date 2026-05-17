import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  currentIndex: number;
};

export default function UploadProgressOverlay({ visible, totalCount, completedCount, failedCount, currentIndex }: Props) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Uploading photos...</Text>
          <Text style={styles.subtitle}>
            {currentIndex > 0 ? `Uploading ${currentIndex} of ${totalCount}` : `Preparing ${totalCount} photo${totalCount !== 1 ? 's' : ''}...`}
          </Text>
          <View style={styles.trackOuter}>
            <View style={[styles.trackFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.status}>
            {completedCount} uploaded{failedCount > 0 ? `, ${failedCount} failed` : ''}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  trackOuter: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  trackFill: { height: '100%', backgroundColor: '#FF6B6B', borderRadius: 4 },
  status: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
