import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
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
import PhotoViewerScreen from '../screens/PhotoViewerScreen';
import { resolveInviteCode } from '../lib/friends';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading } = useAuth();

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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
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
              name="PhotoViewer"
              component={PhotoViewerScreen}
              options={{ animation: 'fade' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
