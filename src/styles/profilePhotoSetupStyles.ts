import { StyleSheet } from 'react-native';

const AVATAR_SIZE = 120;

export { AVATAR_SIZE };

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: '800', color: '#FF6B6B', letterSpacing: -0.5, marginBottom: 36, alignSelf: 'flex-start' },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  avatarWrapper: { marginBottom: 32 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: { fontSize: 44, color: '#d1d5db' },
  chooseBtn: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 32,
  },
  chooseBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    width: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipText: { color: '#9ca3af', fontSize: 15 },
});
