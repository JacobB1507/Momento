import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logo: { fontSize: 32, fontWeight: '800', color: '#FF6B6B', letterSpacing: -0.5, marginBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sub: { fontSize: 15, color: '#6b7280', marginBottom: 32 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 10,
  },
  inputError: { borderWidth: 1.5, borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  errorText: { fontSize: 13, color: '#ef4444', marginBottom: 16 },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
