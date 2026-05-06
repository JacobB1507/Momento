import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  GalleryDetail: { galleryId: string; galleryTitle: string };
  Settings: undefined;
  ChangeUsername: undefined;
  Friends: undefined;
  AddFriend: undefined;
  Notifications: undefined;
  ChangeEmail: undefined;
  ChangePassword: undefined;
  GalleryInvite: { galleryId: string; notificationId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Create: undefined;
  Profile: undefined;
};

export type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type SignUpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
