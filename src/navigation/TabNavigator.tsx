import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ focused, icon }: { focused: boolean; icon: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    </View>
  );
}

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
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" />,
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
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🔍" />,
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
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="💬" />,
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
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👤" />,
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
  tabItem: { alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 22, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonActive: { backgroundColor: '#E85555' },
  createIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 34 },
});
