import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import UsernameSetupScreen from '../screens/UsernameSetupScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import WelcomeBetaScreen from '../screens/WelcomeBetaScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SetupProfileScreen from '../screens/auth/SetupProfileScreen';
import TabNavigator from './TabNavigator';
import GalleryDetailScreen from '../screens/GalleryDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChangeUsernameScreen from '../screens/ChangeUsernameScreen';
import FriendsScreen from '../screens/FriendsScreen';
import AddFriendScreen from '../screens/AddFriendScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangeEmailScreen from '../screens/ChangeEmailScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import GalleryInviteScreen from '../screens/GalleryInviteScreen';
import EditBioScreen from '../screens/EditBioScreen';
import EditDisplayNameScreen from '../screens/EditDisplayNameScreen';
import PhotoViewerScreen from '../screens/PhotoViewerScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import MessageRequestsScreen from '../screens/MessageRequestsScreen';
import ProfilePhotoSetupScreen from '../screens/ProfilePhotoSetupScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import PrivacyPolicyScreen from '../screens/auth/PrivacyPolicyScreen';
import GalleryInviteNewScreen from '../screens/GalleryInviteNewScreen';
import TrustedFriendsScreen from '../screens/TrustedFriendsScreen';
import DefaultGalleryPrivacyScreen from '../screens/DefaultGalleryPrivacyScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import { supabase } from '../lib/supabase';
import { resolveInviteCode } from '../lib/friends';
import type { RootStackParamList } from './types';
import { TutorialProvider } from '../context/TutorialContext';
import TutorialOverlay from '../components/TutorialOverlay';
import TutorialBootstrap from '../components/TutorialBootstrap';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading } = useAuth();
  const [profileReady, setProfileReady] = useState(false);
  const [hasUsername, setHasUsername] = useState(false);
  const [hasDisplayName, setHasDisplayName] = useState(false);
  const [hasWelcomeSeen, setHasWelcomeSeen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) { setProfileReady(true); return; }
    setProfileReady(false);
    supabase.from('profiles').select('username, display_name, welcome_seen').eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[RootNavigator] profile fetch failed, falling back to MainTabs:', error.message);
          setHasUsername(true);
          setHasDisplayName(true);
          setHasWelcomeSeen(true);
          return;
        }
        setHasUsername(!!data?.username);
        setHasDisplayName(!!data?.display_name);
        setHasWelcomeSeen(!!data?.welcome_seen);
      })
      .finally(() => setProfileReady(true));
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;

    const handleUrl = async (url: string) => {
      const match = url.match(/^momento:\/\/invite\/(.+)$/);
      if (!match) return;
      const code = match[1];
      const result = await resolveInviteCode(code, session.user.id);
      switch (result) {
        case 'ok':
          Alert.alert('Success', 'Friend request sent!');
          break;
        case 'already_used':
          Alert.alert('Link expired', 'This invite link has already been used.');
          break;
        case 'not_found':
          Alert.alert('Invalid link', 'Invalid invite link.');
          break;
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => subscription.remove();
  }, [session]);

  useEffect(() => {
    const handleVerificationUrl = async (url: string) => {
      if (!url.includes('token_hash')) return;
      const parsed = new URL(url);
      const token_hash = parsed.searchParams.get('token_hash') ?? parsed.hash.match(/token_hash=([^&]+)/)?.[1];
      const type = parsed.searchParams.get('type') ?? parsed.hash.match(/type=([^&]+)/)?.[1];
      if (!token_hash || !type) return;
      await supabase.auth.verifyOtp({ token_hash, type: type as any });
      await supabase.auth.getSession();
    };

    Linking.getInitialURL().then(url => { if (url) handleVerificationUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleVerificationUrl(url));
    return () => sub.remove();
  }, []);

  if (loading || !profileReady) {
    return <SplashScreen />;
  }

  return (
    <TutorialProvider userId={session?.user.id}>
    <NavigationContainer>
      <>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          <>
            {/* Initial screen: welcome beta → setup profile → main app */}
            {!hasWelcomeSeen ? (
              <Stack.Screen
                name="WelcomeBeta"
                component={WelcomeBetaScreen}
                initialParams={{ onDismissed: () => setHasWelcomeSeen(true) }}
              />
            ) : (!hasUsername || !hasDisplayName) ? (
              <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
            ) : (
              <Stack.Screen name="MainTabs" component={TabNavigator} />
            )}
            {(hasUsername && hasDisplayName) && <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />}
            {(!hasUsername || !hasDisplayName) && <Stack.Screen name="MainTabs" component={TabNavigator} />}
            <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

            <Stack.Screen
              name="GalleryDetail"
              component={GalleryDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ChangeUsername"
              component={ChangeUsernameScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Friends"
              component={FriendsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="AddFriend"
              component={AddFriendScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ChangeEmail"
              component={ChangeEmailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="GalleryInvite"
              component={GalleryInviteScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="EditBio"
              component={EditBioScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="EditDisplayName"
              component={EditDisplayNameScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="PhotoViewer"
              component={PhotoViewerScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen
              name="FriendProfile"
              component={FriendProfileScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="NewMessage" component={NewMessageScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MessageRequests" component={MessageRequestsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProfilePhotoSetup" component={ProfilePhotoSetupScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="GalleryInviteNew"
              component={GalleryInviteNewScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="TrustedFriends"
              component={TrustedFriendsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="DefaultGalleryPrivacy"
              component={DefaultGalleryPrivacyScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          </>
        )}
      </Stack.Navigator>
      <TutorialBootstrap welcomeSeen={hasWelcomeSeen} />
      <TutorialOverlay />
      </>
    </NavigationContainer>
    </TutorialProvider>
  );
}
