import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  emptySubtitle: { fontSize: 14, color: '#9ca3af' },
  editBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8 },
  editLabel: { fontSize: 13, color: '#6b7280' },
  editClose: { fontSize: 16, color: '#9CA3AF' },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 10, backgroundColor: '#fff' },
  input: { flex: 1, fontSize: 15, color: '#111827', backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#f0f0f0' },
  sendIcon: { fontSize: 18, color: '#fff' },
});
