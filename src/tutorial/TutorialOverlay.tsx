import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TUTORIAL_ENABLED } from './config';
import { TUTORIAL_STEPS, useTutorial } from './TutorialContext';
import styles from './tutorialStyles';

type Rect = { x: number; y: number; w: number; h: number };
const PAD = 8;

const STEPS_WITH_DISABLED_BACK = new Set([
  'explore_profile',
  'explore_create',
  'explore_home',
  'explore_search',
  'explore_messages',
]);

export default function TutorialOverlay() {
  const tutorial = useTutorial();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const navigation = useNavigation();
  const [refCutout, setRefCutout] = useState<Rect | null>(null);

  useEffect(() => {
    if (!TUTORIAL_ENABLED || !tutorial.active || !tutorial.currentStep?.targetRef) {
      setRefCutout(null);
      return;
    }
    const ref = tutorial.targetRefs.get(tutorial.currentStep.targetRef);
    if (!ref?.current) { setRefCutout(null); return; }
    const timer = setTimeout(() => {
      ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (!w || !h) { setRefCutout(null); return; }
        setRefCutout({ x, y, w, h });
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [tutorial.active, tutorial.currentStepIndex]);

  // Re-measure on navigation state changes so stale cutout clears when ref unmounts
  useEffect(() => {
    if (!TUTORIAL_ENABLED) return;
    const targetRef = tutorial.currentStep?.targetRef;
    const unsubscribe = (navigation as any).addListener('state', () => {
      if (!targetRef) { setRefCutout(null); return; }
      const ref = tutorial.targetRefs.get(targetRef);
      if (!ref?.current) { setRefCutout(null); return; }
      ref.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (!w || !h) { setRefCutout(null); return; }
        setRefCutout({ x, y, w, h });
      });
    });
    return unsubscribe;
  }, [navigation, tutorial.currentStep?.targetRef]);

  useEffect(() => {
    if (!TUTORIAL_ENABLED || !tutorial.active || !tutorial.currentStep) return;
    const step = tutorial.currentStep;

    // Step 9: navigate to Profile tab so the friends icon is visible to highlight
    if (step.id === 'nav_friends_icon') {
      navigation.navigate('MainTabs', { screen: 'Profile' } as never);
      return;
    }

    // Step 10: route to Friends screen so the + Add button is visible and highlightable
    if (step.id === 'nav_add_friend') {
      navigation.navigate('MainTabs', { screen: 'Profile' } as never);
      setTimeout(() => navigation.navigate('Friends' as never), 100);
      return;
    }

    // Step 11: pop back to tab navigator (user was on a stack screen without tab bar)
    if (step.id === 'nav_messages') {
      navigation.navigate('MainTabs', { screen: 'Profile' } as never);
      return;
    }

    // Explore steps: auto-navigate to the correct tab via nested syntax
    if (step.kind === 'explore' && step.targetTab) {
      navigation.navigate('MainTabs', { screen: step.targetTab } as never);
      return;
    }

    // Navigate steps: NO auto-nav — user must tap the highlighted tab themselves
  }, [tutorial.currentStep?.id]);

  if (!tutorial.active) return null;

  const { currentStep, currentStepIndex, tabLayouts, prevStep, nextStep, skipTutorial, completeTutorial } = tutorial;
  const SCREEN_H = Dimensions.get('window').height;
  const isLast = currentStep.kind === 'done';

  const skipCutout = currentStep.id === 'explore_create' || (!!currentStep.targetRef && !refCutout);

  let hole: Rect | null = null;
  if (!skipCutout) {
    if (currentStep.targetRef && refCutout) {
      hole = { x: refCutout.x - PAD, y: refCutout.y - PAD, w: refCutout.w + PAD * 2, h: refCutout.h + PAD * 2 };
    } else if (currentStep.targetTab && !currentStep.targetRef) {
      const tl = tabLayouts[currentStep.targetTab.toLowerCase()];
      if (tl) {
        const cutoutY = tl.y > 0 ? tl.y - 4 : SCREEN_H - safeBottom - 60;
        const cutoutX = tl.x - 14;
        const cutoutW = tl.w + 28;
        if (currentStep.id === 'nav_create') {
          hole = { x: tl.x - 6, y: tl.y > 0 ? tl.y - 1 : SCREEN_H - safeBottom - 60, w: tl.w + 12, h: 75 };
        } else {
          hole = { x: cutoutX, y: cutoutY, w: cutoutW, h: 50 };
        }
      }
    }
  }

  const isBackDisabled = currentStepIndex === 0 || STEPS_WITH_DISABLED_BACK.has(currentStep.id);

  const placement = hole
    ? (hole.y + hole.h / 2 > SCREEN_H / 2 ? 'above' : 'below')
    : 'center';

  let cardPositionStyle: object;
  if (currentStep.id === 'explore_create') {
    cardPositionStyle = styles.centerTextContainerBottom;
  } else if (currentStep.id === 'nav_add_friend') {
    cardPositionStyle = styles.centerTextContainerLower;
  } else if (placement === 'above') {
    cardPositionStyle = { bottom: SCREEN_H - hole!.y + 16 };
  } else if (placement === 'below') {
    cardPositionStyle = { top: hole!.y + hole!.h + 16 };
  } else {
    cardPositionStyle = { top: SCREEN_H * 0.35 };
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hole ? (
        <>
          <View style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} pointerEvents="auto" />
          <View style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} pointerEvents="auto" />
          <View style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.h }]} pointerEvents="auto" />
          <View style={[styles.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} pointerEvents="auto" />
          <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 12, borderWidth: 2, borderColor: '#fff' }} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="auto" />
      )}

      <View pointerEvents="box-none" style={[styles.cardWrap, cardPositionStyle]}>
        <View style={styles.card} pointerEvents="auto">
          <Text style={styles.cardBody}>{currentStep.text}</Text>
          {isLast ? (
            <Pressable
              onPress={() => {
                completeTutorial();
                navigation.navigate('MainTabs', { screen: 'Profile' } as never);
              }}
              style={styles.getStartedBtn}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.cardCounter}>{currentStepIndex + 1} of {TUTORIAL_STEPS.length}</Text>
              <View style={styles.cardActions}>
                <Pressable
                  onPress={prevStep}
                  disabled={isBackDisabled}
                  style={[styles.arrowBtn, isBackDisabled && styles.arrowBtnDisabled]}
                >
                  <Ionicons name="chevron-back" size={20} color="#555" />
                </Pressable>
                <Pressable onPress={skipTutorial} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
                <Pressable onPress={nextStep} style={styles.arrowBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
