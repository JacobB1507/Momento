import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTutorial } from '../tutorial/TutorialContext';

type Props = { tabKey: string; children: React.ReactNode; badgeCount?: number; badgeActive?: boolean };

export default function TabBarIcon({ tabKey, children, badgeCount, badgeActive }: Props) {
  const { setTabLayout, currentStepIndex } = useTutorial();
  const ref = useRef<View>(null);

  const measure = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      if (w > 0) setTabLayout(tabKey, { x, y, w, h });
    });
  };

  useEffect(() => {
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  return (
    <View ref={ref} onLayout={measure}>
      {children}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText} allowFontScaling={false}>
            {badgeCount > 99 ? '99+' : String(badgeCount)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
  },
});
