import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navRef = createNavigationContainerRef<RootStackParamList>();

export function safeNavigate(name: keyof RootStackParamList, params?: any) {
  if (navRef.isReady()) {
    navRef.navigate(name as any, params);
  }
}
