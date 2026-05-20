import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSave: () => void;
  onShare: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

export default function SelectionActionBar({
  selectedCount, totalCount,
  onSelectAll, onDeselectAll,
  onSave, onShare, onCancel, disabled = false,
}: Props) {
  const allSelected = selectedCount >= totalCount;
  const noSelection = selectedCount === 0;
  const actionDisabled = noSelection || disabled;

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}
      pointerEvents={disabled ? 'none' : 'auto'}>
      <Text style={styles.label}>
        {noSelection ? 'Select photos' : `${selectedCount} selected`}
      </Text>
      <View style={styles.row}>
        <Pressable onPress={onCancel} style={styles.textBtn}>
          <Text style={styles.textBtnLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={allSelected ? onDeselectAll : onSelectAll}
          style={styles.textBtn}>
          <Text style={styles.textBtnLabel}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>
        <View style={styles.iconGroup}>
          <View style={actionDisabled ? styles.iconWrapDisabled : styles.iconWrap}
            pointerEvents={actionDisabled ? 'none' : 'auto'}>
            <Pressable onPress={onSave}>
              <Ionicons name="download-outline" size={24} color="#1C1C1E" />
            </Pressable>
          </View>
          <View style={actionDisabled ? styles.iconWrapDisabled : styles.iconWrap}
            pointerEvents={actionDisabled ? 'none' : 'auto'}>
            <Pressable onPress={onShare}>
              <Ionicons name="share-outline" size={24} color="#1C1C1E" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const RED = '#FF3B30';

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E5EA',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
  },
  containerDisabled: { opacity: 0.6 },
  label: {
    fontSize: 13, color: '#8E8E93', fontWeight: '500',
    textAlign: 'center', marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textBtn: { paddingVertical: 4 },
  textBtnLabel: { color: RED, fontSize: 16 },
  iconGroup: { flexDirection: 'row', gap: 16 },
  iconWrap: { opacity: 1 },
  iconWrapDisabled: { opacity: 0.35 },
});
