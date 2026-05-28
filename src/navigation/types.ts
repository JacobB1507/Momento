import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type PhotoViewerPhoto = {
  id: string;
  url: string;
  uploaded_by: string;
  created_at: string;
};

export type RootStackParamList = {
  Welcome: undefined;
  Login: { email?: string } | undefined;
  SignUp: undefined;
  MainTabs: undefined;
  UsernameSetup: undefined;
  ProfileSetup: undefined;
  SetupProfile: undefined;
  WelcomeBeta: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email: string };
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
  GalleryInvitePrompt: { galleryId: string };
  EditBio: undefined;
  EditDisplayName: undefined;
  FriendProfile: { userId: string; username: string };
  Chat: { conversationId: string; otherUserId: string; otherUsername: string };
  NewMessage: undefined;
  MessageRequests: undefined;
  DeleteAccount: undefined;
  ProfilePhotoSetup: undefined;
  ContactSyncPrompt: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  ChangePhone: undefined;
  ResetPassword: undefined;
  BlockedUsers: undefined;
  PhoneVerification: { phone?: string } | undefined;
  GalleryInviteNew: { galleryId?: string; galleryTitle: string; privacy?: string; pendingCreate?: boolean };
  TrustedFriends: undefined;
  DefaultGalleryPrivacy: undefined;
  RecentUploadWindow: undefined;
  NotificationSettings: undefined;
  TransferOwnership: { galleryId: string; galleryTitle: string };
  ManageTags: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Create: undefined;
  Profile: undefined;
};

export type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type SignUpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
