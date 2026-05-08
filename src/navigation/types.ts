import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type PhotoViewerPhoto = {
  id: string;
  url: string;
  uploaded_by: string;
  created_at: string;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  GalleryDetail: { galleryId: string; galleryTitle?: string; openRemovalRequest?: string; openComments?: boolean; highlightUserId?: string };
  PhotoViewer: { photos: PhotoViewerPhoto[]; initialIndex: number; galleryTitle: string };
  Settings: undefined;
  ChangeUsername: undefined;
  Friends: { highlightRequestId?: string } | undefined;
  AddFriend: undefined;
  Notifications: undefined;
  ChangeEmail: undefined;
  ChangePassword: undefined;
  GalleryInvite: { galleryId: string; notificationId: string };
  EditBio: undefined;
  EditDisplayName: undefined;
  FriendProfile: { userId: string; username: string };
  Chat: { conversationId: string; otherUserId: string; otherUsername: string };
  NewMessage: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Create: undefined;
  Profile: undefined;
};

export type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type SignUpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
