import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { clearDraft } from '../lib/createGalleryDraft';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import { useTutorial } from '../tutorial/TutorialContext';
import TabBarIcon from '../components/TabBarIcon';
import { useAuth } from '../context/AuthContext';
import { getTotalUnreadCount } from '../lib/messages';

const Tab = createBottomTabNavigator();

function CreateTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.createButton, focused && styles.createButtonActive]}>
      <Text style={styles.createIcon}>+</Text>
    </View>
  );
}

export default function TabNavigator() {
  const tutorial = useTutorial();
  const { user } = useAuth();
  const [messagesBadge, setMessagesBadge] = useState<number>(0);
  const [acknowledgedCount, setAcknowledgedCount] = useState<number>(0);
  const showRedMessagesIcon = messagesBadge > 0 && messagesBadge > acknowledgedCount;

  const refreshMessagesBadge = useCallback(async () => {
    if (!user?.id) {
      setMessagesBadge(0);
      return;
    }
    const count = await getTotalUnreadCount(user.id);
    setMessagesBadge(count);
  }, [user?.id]);

  useEffect(() => {
    refreshMessagesBadge();
    const interval = setInterval(refreshMessagesBadge, 30000);
    return () => clearInterval(interval);
  }, [refreshMessagesBadge]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshMessagesBadge();
      }
    });
    return () => sub.remove();
  }, [refreshMessagesBadge]);

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`momento:messagesAcknowledgedCount:${user.id}`)
      .then(val => { if (val !== null) setAcknowledgedCount(parseInt(val, 10) || 0); })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (messagesBadge < acknowledgedCount) {
      setAcknowledgedCount(messagesBadge);
      if (user?.id) {
        AsyncStorage.setItem(`momento:messagesAcknowledgedCount:${user.id}`, String(messagesBadge)).catch(() => {});
      }
    }
  }, [messagesBadge, acknowledgedCount, user?.id]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: { fontSize: 10, includeFontPadding: false },
        tabBarAllowFontScaling: false,
        tabBarItemStyle: { flex: 1, minWidth: 60, paddingVertical: 2 },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        listeners={{
          focus: () => clearDraft(),
          tabPress: (e) => {
            if (tutorial.active && tutorial.currentStep?.targetTab && tutorial.currentStep.targetTab !== 'Home') {
              e.preventDefault();
            } else if (tutorial.active && tutorial.currentStep?.targetTab === 'Home') {
              if (tutorial.currentStep?.kind === 'navigate') setTimeout(() => tutorial.nextStep(), 350);
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <TabBarIcon tabKey="home">
              <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
            </TabBarIcon>
          ),
          tabBarLabel: ({ color }) => (
            <Text allowFontScaling={false} style={{ color, fontSize: 10, textAlign: 'center', flexShrink: 0 }}>
              Home
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        listeners={{
          focus: () => clearDraft(),
          tabPress: (e) => {
            if (tutorial.active && tutorial.currentStep?.targetTab && tutorial.currentStep.targetTab !== 'Search') {
              e.preventDefault();
            } else if (tutorial.active && tutorial.currentStep?.targetTab === 'Search') {
              if (tutorial.currentStep?.kind === 'navigate') setTimeout(() => tutorial.nextStep(), 350);
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <TabBarIcon tabKey="search">
              <Ionicons name={focused ? 'search' : 'search-outline'} size={26} color={color} />
            </TabBarIcon>
          ),
          tabBarLabel: ({ color }) => (
            <Text allowFontScaling={false} style={{ color, fontSize: 10, textAlign: 'center', flexShrink: 0 }}>
              Search
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateScreen}
        listeners={{
          tabPress: (e) => {
            if (tutorial.active && tutorial.currentStep?.targetTab && tutorial.currentStep.targetTab !== 'Create') {
              e.preventDefault();
            } else if (tutorial.active && tutorial.currentStep?.targetTab === 'Create') {
              if (tutorial.currentStep?.kind === 'navigate') setTimeout(() => tutorial.nextStep(), 350);
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon tabKey="create"><CreateTabIcon focused={focused} /></TabBarIcon>,
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, textAlign: 'center', flexShrink: 0, marginTop: 12 }}>
              Create
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        listeners={{
          focus: () => { clearDraft(); refreshMessagesBadge(); },
          tabPress: (e) => {
            if (tutorial.active && tutorial.currentStep?.targetTab && tutorial.currentStep.targetTab !== 'Messages') {
              e.preventDefault();
              return;
            } else if (tutorial.active && tutorial.currentStep?.targetTab === 'Messages') {
              if (tutorial.currentStep?.kind === 'navigate') setTimeout(() => tutorial.nextStep(), 350);
            }
            if (messagesBadge > 0 && user?.id) {
              setAcknowledgedCount(messagesBadge);
              AsyncStorage.setItem(`momento:messagesAcknowledgedCount:${user.id}`, String(messagesBadge)).catch(() => {});
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <TabBarIcon tabKey="messages" badgeCount={messagesBadge} badgeActive={showRedMessagesIcon}>
              <Ionicons name={focused ? 'paper-plane' : 'paper-plane-outline'} size={26} color={showRedMessagesIcon ? '#FF3B30' : color} />
            </TabBarIcon>
          ),
          tabBarLabel: ({ color }) => (
            <Text allowFontScaling={false} style={{ color, fontSize: 10, textAlign: 'center', flexShrink: 0 }}>
              Messages
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        listeners={{
          focus: () => clearDraft(),
          tabPress: (e) => {
            if (tutorial.active && tutorial.currentStep?.targetTab && tutorial.currentStep.targetTab !== 'Profile') {
              e.preventDefault();
            } else if (tutorial.active && tutorial.currentStep?.targetTab === 'Profile') {
              if (tutorial.currentStep?.kind === 'navigate') setTimeout(() => tutorial.nextStep(), 350);
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <TabBarIcon tabKey="profile">
              <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
            </TabBarIcon>
          ),
          tabBarLabel: ({ color }) => (
            <Text allowFontScaling={false} style={{ color, fontSize: 10, textAlign: 'center', flexShrink: 0 }}>
              Profile
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    height: 85,
    paddingBottom: 10,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonActive: { backgroundColor: '#E85555' },
  createIcon: { fontSize: 30, color: '#fff', fontWeight: '300' },
});
