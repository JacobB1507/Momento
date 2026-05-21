import React, { useState, useCallback, createContext, useContext } from 'react';
import NotificationBanner from '../components/NotificationBanner';

type BannerPayload = {
  title: string;
  body: string;
  onTap: () => void;
};

type BannerContextValue = {
  showBanner: (payload: BannerPayload) => void;
};

const BannerContext = createContext<BannerContextValue>({ showBanner: () => {} });

export function useBanner(): BannerContextValue {
  return useContext(BannerContext);
}

export default function NotificationBannerProvider({ children }: { children: React.ReactNode }) {
  const [banner, setBanner] = useState<BannerPayload | null>(null);

  const showBanner = useCallback((payload: BannerPayload) => {
    setBanner(payload);
  }, []);

  const onDismiss = useCallback(() => {
    setBanner(null);
  }, []);

  const handlePress = useCallback(() => {
    if (banner) {
      banner.onTap();
      setBanner(null);
    }
  }, [banner]);

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {children}
      <NotificationBanner
        visible={banner !== null}
        title={banner?.title ?? ''}
        body={banner?.body ?? ''}
        onPress={handlePress}
        onDismiss={onDismiss}
      />
    </BannerContext.Provider>
  );
}
