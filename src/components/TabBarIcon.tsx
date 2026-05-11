import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useTutorial } from '../tutorial/TutorialContext';

type Props = { tabKey: string; children: React.ReactNode };

export default function TabBarIcon({ tabKey, children }: Props) {
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
    </View>
  );
}
