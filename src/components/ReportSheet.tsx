import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { submitReport } from '../lib/reports';

const REASONS = [
  'Spam',
  'Nudity or sexual content',
  'Hate speech or discrimination',
  'Harassment or bullying',
  'Violence or dangerous content',
  'False information',
  'Other',
];

type ContentType = 'user' | 'photo' | 'gallery' | 'message';

type Props = {
  visible: boolean;
  onClose: () => void;
  reportedUserId?: string;
  contentType: ContentType;
  contentId?: string;
};

export default function ReportSheet({ visible, onClose, reportedUserId, contentType, contentId }: Props) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setSelectedReason(null);
    setNotes('');
    setSubmitting(false);
    setErrorMsg(null);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await submitReport({
      reportedUserId,
      contentType,
      contentId,
      reason: selectedReason,
      notes: selectedReason === 'Other' ? notes : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setSuccess(true);
    setTimeout(handleClose, 1500);
  };

  const typeLabel = contentType.charAt(0).toUpperCase() + contentType.slice(1);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.title}>Report {typeLabel}</Text>
        <Text style={styles.subtitle}>Help us understand what's wrong</Text>

        <View style={styles.reasons}>
          {REASONS.map(reason => (
            <Pressable
              key={reason}
              style={({ pressed }) => [
                styles.reasonRow,
                selectedReason === reason && styles.reasonRowSelected,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={[styles.radio, selectedReason === reason && styles.radioSelected]}>
                {selectedReason === reason && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.reasonText}>{reason}</Text>
            </Pressable>
          ))}
        </View>

        {selectedReason === 'Other' && (
          <TextInput
            style={styles.notesInput}
            placeholder="Tell us more (optional)"
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
            multiline
            textAlignVertical="top"
          />
        )}

        {success ? (
          <Text style={styles.successText}>Report submitted. Thank you.</Text>
        ) : (
          <>
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            <Pressable
              style={[styles.submitBtn, (!selectedReason || submitting) && { opacity: 0.45 }]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Submit Report</Text>
              }
            </Pressable>
          </>
        )}

        <Pressable style={styles.cancelBtn} onPress={handleClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  reasons: { gap: 4 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 12,
  },
  reasonRowSelected: { backgroundColor: '#1e1e1e' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#FF3B30' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  reasonText: { fontSize: 15, color: '#fff' },
  notesInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    marginTop: 12,
    minHeight: 80,
  },
  successText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
  },
  errorText: { color: '#FF3B30', fontSize: 14, marginTop: 12, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelText: { color: '#888', fontSize: 16 },
});
