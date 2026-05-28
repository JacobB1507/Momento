import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRecentUploadWindowHours, setRecentUploadWindowHours, peekRecentUploadWindowHours } from '../lib/galleries';

type Preset = { label: string; hours: number };
const PRESETS: Preset[] = [
  { label: '6 hours',  hours: 6 },
  { label: '12 hours', hours: 12 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
];

export default function RecentUploadWindowScreen({ navigation }: any) {
  const { session } = useAuth();

  const [selected, setSelected] = useState<number>(() => {
    if (session?.user?.id) {
      const cached = peekRecentUploadWindowHours(session?.user?.id);
      if (cached !== null) return cached;
    }
    return 6;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (session?.user?.id) {
      const cached = peekRecentUploadWindowHours(session?.user?.id);
      return cached === null;
    }
    return true;
  });
  const [saving, setSaving] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(prev => (prev ? false : prev));
    }, 4000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user?.id) {
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const h = await getRecentUploadWindowHours(session?.user?.id);
        if (!cancelled) {
          setSelected(h);
        }
      } catch {
        if (!cancelled) {
          setSelected(6);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const persist = async (hours: number) => {
    if (!session?.user?.id) return;
    setSaving(true);
    const prev = selected;
    setSelected(hours);
    const { error } = await setRecentUploadWindowHours(session?.user?.id, hours);
    setSaving(false);
    if (error) {
      setSelected(prev);
      Alert.alert('Could not save', error);
    }
  };

  const handlePresetTap = (hours: number) => {
    if (hours === selected) return;
    persist(hours);
  };

  const isCustomSelected = !PRESETS.some(p => p.hours === selected);

  const openCustomModal = () => {
    setCustomInput(isCustomSelected ? String(selected) : '');
    setCustomError(null);
    setCustomModalVisible(true);
  };

  const submitCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      setCustomError('Enter a number between 1 and 168');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isInteger(n)) {
      setCustomError('Enter a whole number');
      return;
    }
    if (n < 1 || n > 168) {
      setCustomError('Must be between 1 and 168 (one week)');
      return;
    }
    setCustomModalVisible(false);
    persist(n);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.description}>
          When you tap "Add photos" in a gallery, Momento can offer to quickly add photos taken in the last few hours. Choose how far back to look.
        </Text>

        <View style={styles.section}>
          {PRESETS.map(preset => {
            const isSelected = preset.hours === selected && !isCustomSelected;
            return (
              <TouchableOpacity
                key={preset.hours}
                style={styles.row}
                onPress={() => handlePresetTap(preset.hours)}
                disabled={saving}
              >
                <Text style={styles.rowLabel}>{preset.label}</Text>
                {isSelected && <Ionicons name="checkmark" size={22} color="#007AFF" />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={openCustomModal}
            disabled={saving}
          >
            <Text style={styles.rowLabel}>
              Custom{isCustomSelected ? ` - ${selected} hours` : ''}
            </Text>
            {isCustomSelected && <Ionicons name="checkmark" size={22} color="#007AFF" />}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom timing</Text>
            <Text style={styles.modalSubtitle}>Hours back (1–168)</Text>
            <TextInput
              style={styles.input}
              value={customInput}
              onChangeText={(t) => { setCustomInput(t); setCustomError(null); }}
              keyboardType="number-pad"
              maxLength={3}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitCustom}
            />
            {customError && <Text style={styles.errorText}>{customError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)} style={styles.modalBtn}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitCustom} style={styles.modalBtn}>
                <Text style={styles.modalBtnTextConfirm}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  scroll: { padding: 16 },
  description: { fontSize: 13, color: '#8E8E93', marginBottom: 16, lineHeight: 18 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 16, color: '#000' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%', maxWidth: 320,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#C6C6C8', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, textAlign: 'center',
  },
  errorText: { color: '#FF3B30', fontSize: 13, marginTop: 8, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modalBtnTextCancel: { color: '#8E8E93', fontSize: 16 },
  modalBtnTextConfirm: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});
