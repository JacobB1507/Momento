import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  visible: boolean;
  duplicateCount: number;
  uniqueCount: number;
  onUploadAnyway: () => void;
  onSkipDuplicates: () => void;
  onCancel: () => void;
};

export default function DuplicatesAlert({
  visible,
  duplicateCount,
  uniqueCount,
  onUploadAnyway,
  onSkipDuplicates,
  onCancel,
}: Props) {
  if (!visible || duplicateCount === 0) return null;

  const subtitle =
    uniqueCount === 0
      ? 'All selected photos are already in this gallery.'
      : `${duplicateCount} photo${duplicateCount === 1 ? '' : 's'} you selected ${duplicateCount === 1 ? 'is' : 'are'} already in this gallery. The other ${uniqueCount} ${uniqueCount === 1 ? 'is' : 'are'} new.`;

  const skipLabel = uniqueCount === 0 ? 'OK' : 'Skip duplicates';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <View onStartShouldSetResponder={() => true} style={styles.card}>
          <Ionicons name="copy-outline" size={32} color="#FF6B6B" style={styles.icon} />
          <Text style={styles.title}>
            {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'} detected
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.leftButton} onPress={onUploadAnyway}>
              <Text style={styles.leftLabel}>Upload anyway</Text>
            </Pressable>
            <Pressable style={styles.rightButton} onPress={onSkipDuplicates}>
              <Text style={styles.rightLabel}>{skipLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    maxWidth: 320,
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  leftButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftLabel: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  rightButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
