import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationBannerProvider, { useBanner } from './src/context/NotificationBannerContext';
import { setupForegroundListener, setupResponseListener } from './src/lib/pushNotifications';

function NotificationListeners() {
  const { showBanner } = useBanner();
  useEffect(() => {
    const unsubFg = setupForegroundListener(showBanner);
    const unsubResp = setupResponseListener();
    return () => {
      unsubFg();
      unsubResp();
    };
  }, [showBanner]);
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationBannerProvider>
            <NotificationListeners />
            <RootNavigator />
          </NotificationBannerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
