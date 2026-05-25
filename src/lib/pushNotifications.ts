import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { safeNavigate } from '../navigation/navRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: undefined });
  const expoPushToken = tokenData.data;

  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
    },
    { onConflict: 'user_id,expo_push_token' },
  );

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: undefined }).catch(() => null);
  if (!tokenData) return;

  await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('expo_push_token', tokenData.data);
}

type ShowBanner = (p: { title: string; body: string; onTap: () => void }) => void;
type IsConversationActive = (id: string | null | undefined) => boolean;

export function setupForegroundListener(
  showBanner: ShowBanner,
  isConversationActive: IsConversationActive
): () => void {
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    try {
      const content = notification.request.content;
      const title = content.title ?? 'Momento';
      const body = content.body ?? '';
      const data = (content.data ?? {}) as { type?: string; related_id?: string };
      // Suppress in-app banner if user is already inside this conversation
      if ((data.type === 'message' || data.type === 'message_request') && isConversationActive(data.related_id)) {
        return;
      }
      showBanner({
        title,
        body,
        onTap: () => routeFromNotification(data.type, data.related_id),
      });
    } catch (e) {
      console.warn('[pushNotifications] foreground listener error:', e);
    }
  });
  return () => sub.remove();
}

export function setupResponseListener(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const content = response.notification.request.content;
      const data = (content.data ?? {}) as { type?: string; related_id?: string };
      routeFromNotification(data.type, data.related_id);
    } catch (e) {
      console.warn('[pushNotifications] response listener error:', e);
    }
  });
  return () => sub.remove();
}

function routeFromNotification(type: string | undefined, relatedId: string | undefined): void {
  if (!type) return;
  switch (type) {
    case 'message':
    case 'message_request':
      if (relatedId) safeNavigate('Chat', { conversationId: relatedId });
      else safeNavigate('MessageRequests' as any);
      break;
    case 'gallery_photo_added':
    case 'photo_added':
    case 'comment':
    case 'removal_request':
    case 'removal_vote':
      if (relatedId) safeNavigate('GalleryDetail', { galleryId: relatedId });
      break;
    case 'gallery_invite':
      if (relatedId) safeNavigate('GalleryInvitePrompt' as any, { galleryId: relatedId });
      break;
    case 'friend_request':
    case 'friend_accepted':
    case 'trusted_friend':
      safeNavigate('Friends' as any);
      break;
    default:
      break;
  }
}
