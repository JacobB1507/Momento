import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  GalleryDetail: { galleryId: string; galleryTitle: string };
  Settings: undefined;
  ChangeUsername: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Create: undefined;
  Profile: undefined;
};

export type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type SignUpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
