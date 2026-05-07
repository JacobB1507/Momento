import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRemovalRequests, voteOnRemoval } from '../lib/photoRemoval';
import { useAuth } from '../context/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  galleryId: string;
};

type RemovalRequest = {
  id: string;
  photo_id: string;
  reason: string;
  requested_by_username: string | null;
  yes_votes: number;
  no_votes: number;
  created_at: string;
};

export function RemovalRequestsModal({ visible, onClose, galleryId }: Props) {
  const { session } = useAuth();
  const [removalRequests, setRemovalRequests] = useState<RemovalRequest[]>([]);

  const loadRemovalRequests = useCallback(async () => {
    const data = await getRemovalRequests(galleryId);
    setRemovalRequests(data as RemovalRequest[]);
  }, [galleryId]);

  const handleVote = async (requestId: string, vote: boolean) => {
    const userId = session?.user.id;
    if (!userId) return;
    const ok = await voteOnRemoval(requestId, userId, vote);
    if (ok) await loadRemovalRequests();
    else Alert.alert('Error', 'Could not submit vote. Please try again.');
  };

  useEffect(() => {
    if (visible) {
      getRemovalRequests(galleryId).then(data =>
        setRemovalRequests(data as RemovalRequest[])
      );
    }
  }, [visible, galleryId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Removal Requests</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </Pressable>
        </View>
        <FlatList
          data={removalRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.modalContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={styles.modalEmpty}>No removal requests</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.requestRow}>
              <Text style={styles.requestUser}>@{item.requested_by_username ?? 'unknown'}</Text>
              <Text style={styles.requestReason}>{item.reason || 'No reason provided'}</Text>
              <Text style={styles.requestVotes}>👍 {item.yes_votes}  👎 {item.no_votes}</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={({ pressed }) => [styles.agreeButton, pressed && { opacity: 0.7 }]}
                  onPress={() => handleVote(item.id, true)}
                >
                  <Text style={styles.agreeText}>Agree</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.disagreeButton, pressed && { opacity: 0.7 }]}
                  onPress={() => handleVote(item.id, false)}
                >
                  <Text style={styles.disagreeText}>Disagree</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSafe: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { paddingVertical: 4, paddingHorizontal: 4 },
  modalCloseText: { fontSize: 16, color: '#FF6B6B', fontWeight: '600' },
  modalContent: { padding: 16 },
  modalEmpty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 32 },
  requestRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  requestUser: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  requestReason: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  requestVotes: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  requestActions: { flexDirection: 'row', gap: 8 },
  agreeButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  agreeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disagreeButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  disagreeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
