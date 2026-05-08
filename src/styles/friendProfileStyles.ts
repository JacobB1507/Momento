import { StyleSheet } from 'react-native';
import { CARD_GAP, SCREEN_PADDING } from '../components/GalleryCard';

export const AVATAR_SIZE = 88;

export default StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: '#FF6B6B', lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  profileSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  avatarImage: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarLetter: { color: '#fff', fontSize: 32, fontWeight: '800' },
  displayName: { marginTop: 12, fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  username: { marginTop: 12, fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  usernameSmall: { marginTop: 2, fontSize: 14, color: '#6B7280' },
  bio: { marginTop: 6, fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  galleriesSection: { marginTop: 24, marginBottom: 4 },
  galleriesSectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  galleryGrid: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 32, gap: CARD_GAP },
  galleryRow: { gap: CARD_GAP },
  galleryEmpty: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
