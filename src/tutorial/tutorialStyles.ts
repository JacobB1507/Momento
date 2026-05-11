import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cardWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    width: '100%',
  },
  cardBody: {
    color: '#333',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  cardCounter: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  skipText: {
    color: '#999',
    fontSize: 14,
  },
  getStartedBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerTextContainerBottom: { bottom: 140 },
  centerTextContainerLow: { top: '70%', left: 32, right: 32 },
  centerTextContainerLower: { top: '60%', left: 32, right: 32 },
});
