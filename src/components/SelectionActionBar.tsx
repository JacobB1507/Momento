import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export function SelectionHeader({
  selectedCount,
  onCancel,
  onDeleteRequest,
}: {
  selectedCount: number;
  onCancel: () => void;
  onDeleteRequest?: () => void;
}) {
  return (
    <View style={headerStyles.container}>
      <Pressable onPress={onCancel} hitSlop={12} style={headerStyles.leftSection}>
        <Text style={headerStyles.cancelText}>Cancel</Text>
      </Pressable>
      <View style={headerStyles.centerSection}>
        <Text style={headerStyles.countText}>{selectedCount} selected</Text>
      </View>
      {onDeleteRequest ? (
        <Pressable onPress={onDeleteRequest} hitSlop={12} style={headerStyles.rightSection}>
          <Text style={headerStyles.deleteText}>Delete</Text>
        </Pressable>
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}

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
    <View
      style={[styles.container, disabled && styles.containerDisabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <Pressable
        onPress={allSelected ? onDeselectAll : onSelectAll}
        style={styles.selectAllBtn}
      >
        <Text style={styles.selectAllText}>
          {allSelected ? 'Deselect All' : 'Select All'}
        </Text>
      </Pressable>
      <View style={styles.iconGroup}>
        <View
          style={actionDisabled ? styles.iconWrapDisabled : styles.iconWrap}
          pointerEvents={actionDisabled ? 'none' : 'auto'}
        >
          <Pressable onPress={onSave}>
            <Ionicons name="download-outline" size={24} color="#1C1C1E" />
          </Pressable>
        </View>
        <View
          style={actionDisabled ? styles.iconWrapDisabled : styles.iconWrap}
          pointerEvents={actionDisabled ? 'none' : 'auto'}
        >
          <Pressable onPress={onShare}>
            <Ionicons name="share-outline" size={24} color="#1C1C1E" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  leftSection: {
    flex: 1,
    paddingLeft: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    paddingRight: 16,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  countText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  containerDisabled: { opacity: 0.6 },
  selectAllBtn: {
    marginBottom: 8,
  },
  selectAllText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  iconGroup: {
    flexDirection: 'row',
    gap: 32,
  },
  iconWrap: { opacity: 1 },
  iconWrapDisabled: { opacity: 0.35 },
});
