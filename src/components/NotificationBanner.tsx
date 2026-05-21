import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  onPress: () => void;
  onDismiss: () => void;
};

export default function NotificationBanner({ visible, title, body, onPress, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const onPressRef = useRef(onPress);

  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (visible) {
      hasShownRef.current = true;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      timerRef.current = setTimeout(() => onDismissRef.current(), 4000);
    } else if (hasShownRef.current) {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -30) onDismissRef.current();
      },
    }),
  ).current;

  if (!visible && !title && !body) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrapper, { top: insets.top + 8, transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <Pressable style={styles.card} onPress={() => onPressRef.current()}>
        <View style={styles.iconBox}>
          <Ionicons name="notifications" size={18} color="#FF6B6B" />
        </View>
        <View style={styles.textBox}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.body} numberOfLines={2}>{body}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  body: {
    fontSize: 13,
    fontWeight: '400',
    color: '#C7C7CC',
    marginTop: 2,
  },
});
