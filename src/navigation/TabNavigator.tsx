import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { clearDraft } from '../lib/createGalleryDraft';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Tab = createBottomTabNavigator();

function CreateTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.createButton, focused && styles.createButtonActive]}>
      <Text style={styles.createIcon}>+</Text>
    </View>
  );
}

export default function TabNavigator() {
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
        listeners={{ focus: () => clearDraft() }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
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
        listeners={{ focus: () => clearDraft() }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={26} color={color} />
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
        options={{
          tabBarIcon: ({ focused }) => <CreateTabIcon focused={focused} />,
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
        listeners={{ focus: () => clearDraft() }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <Ionicons name={focused ? 'paper-plane' : 'paper-plane-outline'} size={26} color={color} />
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
        listeners={{ focus: () => clearDraft() }}
        options={{
          tabBarIcon: ({ focused, color }: { focused: boolean; color: string; size: number }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
  createIcon: { fontSize: 32, color: '#fff', fontWeight: '300', lineHeight: 38 },
});
