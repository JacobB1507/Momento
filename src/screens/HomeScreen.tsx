import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../lib/notifications';
import type { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      getUnreadCount(session.user.id).then(setUnreadCount);
    }, [session?.user.id])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <Pressable
          onPress={() => rootNav?.navigate('Notifications')}
          style={({ pressed }) => [styles.bellButton, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons
            name={unreadCount > 0 ? 'bell-badge' : 'bell'}
            size={26}
            color={unreadCount > 0 ? '#FF3B30' : '#333'}
          />
        </Pressable>
      </View>
      <View style={styles.body} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bellButton: { marginLeft: 'auto', padding: 4 },
  body: { flex: 1 },
});
