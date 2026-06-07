import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import UsernameSetupScreen from '../screens/UsernameSetupScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navRef } from './navRef';
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
import ChangePhoneScreen from '../screens/ChangePhoneScreen';
import EditBioScreen from '../screens/EditBioScreen';
import EditDisplayNameScreen from '../screens/EditDisplayNameScreen';
import PhotoViewerScreen from '../screens/PhotoViewerScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import MessageRequestsScreen from '../screens/MessageRequestsScreen';
import ProfilePhotoSetupScreen from '../screens/ProfilePhotoSetupScreen';
import ContactSyncPromptScreen from '../screens/ContactSyncPromptScreen';
// === BETA GATE (disabled for public launch — uncomment to re-enable) ===
// import AppleInviteCodeScreen from '../screens/AppleInviteCodeScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import PrivacyPolicyScreen from '../screens/auth/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/auth/TermsOfServiceScreen';
import GalleryInviteNewScreen from '../screens/GalleryInviteNewScreen';
import GalleryInvitePromptScreen from '../screens/GalleryInvitePromptScreen';
import TrustedFriendsScreen from '../screens/TrustedFriendsScreen';
import DefaultGalleryPrivacyScreen from '../screens/DefaultGalleryPrivacyScreen';
import RecentUploadWindowScreen from '../screens/RecentUploadWindowScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import TransferOwnershipScreen from '../screens/TransferOwnershipScreen';
import ManageTagsScreen from '../screens/ManageTagsScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import InvitesScreen from '../screens/InvitesScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';
import { hasUnfinishedQueue, getQueue, resumeQueue, clearQueue } from '../lib/uploadQueue';
import ResumeUploadPrompt from '../components/ResumeUploadPrompt';
import OfflineBanner from '../components/OfflineBanner';
import { supabase } from '../lib/supabase';
import { resolveInviteCode } from '../lib/friends';
import { registerPushNotifications } from '../lib/pushNotifications';
import type { RootStackParamList } from './types';
import { TutorialProvider } from '../tutorial/TutorialContext';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import TutorialBootstrap from '../tutorial/TutorialBootstrap';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading, restoringSession, profile, profileReady, profileLoaded, passwordRecoveryRequested, phoneVerificationRequired } = useAuth();
  const hasRequestedNotifPermission = useRef(false);
  const hasCheckedQueue = useRef(false);
  const [showResume, setShowResume] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ galleryTitle: string; pendingCount: number } | null>(null);


  const hasUsername = !!profile?.username;
  const hasDisplayName = !!profile?.display_name;
  const hasWelcomeSeen = !!profile?.welcome_seen;
  const hasProfilePhoto = !!profile?.avatar_url || !!profile?.skipped_avatar_setup;
  const hasContactsPromptShown = !!profile?.contacts_prompt_shown_at;
  // === BETA GATE (disabled for public launch — uncomment to re-enable) ===
  // const isAppleUser = session?.user?.app_metadata?.provider === 'apple';
  // const hasInviteRedeemed = !!profile?.invite_redeemed_at;

  const onboardingStage =
    phoneVerificationRequired ? 'phone-verification' :
    // === BETA GATE (disabled for public launch — uncomment to re-enable) ===
    // (!!profile && isAppleUser && !hasInviteRedeemed) ? 'appleInvite' :
    !hasUsername || !hasDisplayName ? 'setup' :
    !hasProfilePhoto ? 'photo' :
    !hasContactsPromptShown ? 'contactsPrompt' :
    !hasWelcomeSeen ? 'welcome' :
    'main';

  useEffect(() => {
    if (onboardingStage === 'main' && session?.user?.id && !hasRequestedNotifPermission.current) {
      hasRequestedNotifPermission.current = true;
      registerPushNotifications(session.user.id).catch(err => console.warn('Push registration failed:', err));
    }
  }, [onboardingStage, session]);

  useEffect(() => {
    if (onboardingStage !== 'main' || !session?.user?.id || hasCheckedQueue.current) return;
    hasCheckedQueue.current = true;
    const userId = session.user.id;
    hasUnfinishedQueue(userId).then(async (has) => {
      if (!has) return;
      const queue = await getQueue(userId);
      if (!queue) return;
      const pendingCount = queue.photos.filter(p => p.status === 'pending').length;
      if (pendingCount === 0) return;
      setQueueInfo({ galleryTitle: queue.galleryTitle, pendingCount });
      setShowResume(true);
    });
  }, [onboardingStage, session?.user?.id]);

  const handleResumeUpload = async () => {
    if (!session?.user?.id) return;
    setResuming(true);
    const result = await resumeQueue(session.user.id);
    setResuming(false);
    setShowResume(false);
    setQueueInfo(null);
    Alert.alert('Upload complete', `Uploaded ${result.uploaded} of ${result.total} photo${result.total === 1 ? '' : 's'}.`);
  };

  const handleCancelResume = async () => {
    if (!session?.user?.id) return;
    await clearQueue(session.user.id);
    setShowResume(false);
    setQueueInfo(null);
  };

  useEffect(() => {
    if (!session) return;

    const handleUrl = async (url: string) => {
      const match = url.match(/^momento:\/\/invite\/(.+)$/);
      if (!match) return;
      const code = match[1];

      if (!/^[a-zA-Z0-9]{4,32}$/.test(code)) return;

      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('redeem_gallery_invite_code', { p_code: code });

        if (rpcError || !rpcResult) {
          console.warn('[RootNavigator] redeem_gallery_invite_code failed');
          return;
        }

        const validGalleryId = typeof rpcResult.gallery_id === 'string' && rpcResult.gallery_id.length === 36;

        switch (rpcResult.status) {
          case 'already_member':
          case 'self_invite':
            if (validGalleryId && navRef.isReady()) navRef.navigate('GalleryDetail', { galleryId: rpcResult.gallery_id } as any);
            return;
          case 'pending_created':
          case 'pending_existing':
            if (validGalleryId && navRef.isReady()) navRef.navigate('GalleryInvitePrompt', { galleryId: rpcResult.gallery_id } as any);
            return;
          case 'unauthenticated':
            return;
          case 'not_found':
          case 'not_gallery':
            break; // fall through to friend-invite
          default:
            console.warn('[RootNavigator] unexpected invite code status');
            return;
        }
      } catch {
        console.warn('[RootNavigator] redeem_gallery_invite_code threw');
        return;
      }

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
      if (url.includes('#')) {
        const fragment = url.split('#')[1];
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type');
        if (access_token && refresh_token && type === 'recovery') {
          await supabase.auth.setSession({ access_token, refresh_token });
          return;
        }
      }
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

  if (loading || restoringSession || (session && !profileReady)) {
    return <SplashScreen />;
  }

  if (passwordRecoveryRequested) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ gestureEnabled: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <TutorialProvider userId={session?.user.id}>
    <NavigationContainer ref={navRef}>
      <>
      {session && !profileLoaded ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
      <Stack.Navigator key={onboardingStage} screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          <>
            {/* Onboarding gate: phone verification → profile setup → profile photo → welcome → main app */}
            {phoneVerificationRequired ? (
              <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} options={{ gestureEnabled: false }} />
            // === BETA GATE (disabled for public launch — uncomment to re-enable) ===
            // ) : (!!profile && isAppleUser && !hasInviteRedeemed) ? (
            //   <Stack.Screen name="AppleInviteCode" component={AppleInviteCodeScreen} options={{ gestureEnabled: false }} />
            ) : (!hasUsername || !hasDisplayName) ? (
              <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
            ) : !hasProfilePhoto ? (
              <Stack.Screen name="ProfilePhotoSetup" component={ProfilePhotoSetupScreen} options={{ headerShown: false }} />
            ) : !hasContactsPromptShown ? (
              <Stack.Screen name="ContactSyncPrompt" component={ContactSyncPromptScreen} options={{ gestureEnabled: false }} />
            ) : !hasWelcomeSeen ? (
              <Stack.Screen name="WelcomeBeta" component={WelcomeBetaScreen} />
            ) : (
              <Stack.Screen name="MainTabs" component={TabNavigator} />
            )}
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
              name="ChangePhone"
              component={ChangePhoneScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PhoneVerification"
              component={PhoneVerificationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="BlockedUsers"
              component={BlockedUsersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="GalleryInvitePrompt"
              component={GalleryInvitePromptScreen}
              options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }}
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
              name="RecentUploadWindow"
              component={RecentUploadWindowScreen}
              options={{ headerShown: true, title: 'Recent Photos Shortcut', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="TransferOwnership"
              component={TransferOwnershipScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ManageTags"
              component={ManageTagsScreen}
              options={{ headerShown: true, title: 'Tags', headerBackTitle: 'Back', animation: 'slide_from_right' }}
            />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="Invites" component={InvitesScreen} options={{ animation: 'slide_from_right' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          </>
        )}
      </Stack.Navigator>
      )}
      <TutorialBootstrap welcomeSeen={hasWelcomeSeen} />
      <TutorialOverlay />
      <ResumeUploadPrompt
        visible={showResume}
        galleryTitle={queueInfo?.galleryTitle ?? ''}
        pendingCount={queueInfo?.pendingCount ?? 0}
        resuming={resuming}
        onResume={handleResumeUpload}
        onCancel={handleCancelResume}
      />
      <OfflineBanner />
</>
    </NavigationContainer>
    </TutorialProvider>
  );
}
