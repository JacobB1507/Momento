import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { TUTORIAL_ENABLED } from './config';
import { markTutorialComplete } from './tutorial';

export type TutorialStepKind = 'navigate' | 'explore' | 'done';

export type TutorialStep = {
  id: string;
  kind: TutorialStepKind;
  targetTab?: string | null;
  targetRef?: string;
  text: string;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  // Profile
  { id: 'nav_profile', kind: 'navigate', targetTab: 'Profile', text: "Let's navigate to your profile." },
  { id: 'explore_profile', kind: 'explore', targetTab: 'Profile', text: 'This is your profile — your photo, bio, username, and all your galleries live here.' },

  // Create
  { id: 'nav_create', kind: 'navigate', targetTab: 'Create', text: 'Tap here to explore the Create tab.' },
  { id: 'explore_create', kind: 'explore', targetTab: 'Create', text: 'Create new galleries here and start collecting moments with friends.' },

  // Home
  { id: 'nav_home', kind: 'navigate', targetTab: 'Home', text: "Now let's check out your home feed." },
  { id: 'explore_home', kind: 'explore', targetTab: 'Home', text: 'Your feed lives here — see what your friends are posting and discover public galleries.' },

  // Search
  { id: 'nav_search', kind: 'navigate', targetTab: 'Search', text: 'Next, the Search tab.' },
  { id: 'explore_search', kind: 'explore', targetTab: 'Search', text: 'Find friends and discover new galleries from across Momento.' },

  // Friends icon on Profile (special: targetRef not targetTab)
  { id: 'nav_friends_icon', kind: 'navigate', targetTab: 'Profile', targetRef: 'friendsIcon', text: 'This is where you can see all your friends on Momento.' },
  { id: 'nav_add_friend', kind: 'navigate', targetRef: 'addFriendButton', text: 'This is where you can add new friends to Momento.' },

  // Messages
  { id: 'nav_messages', kind: 'navigate', targetTab: 'Messages', text: 'Last one — the Messages tab.' },
  { id: 'explore_messages', kind: 'explore', targetTab: 'Messages', text: 'Chat with your friends one-on-one right inside Momento.' },

  // Done
  { id: 'done', kind: 'done', targetTab: null, text: "You're all set! Start by creating your first gallery." },
];

type TabLayout = { x: number; y: number; w: number; h: number };

type TutorialContextValue = {
  active: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep;
  targetRefs: Map<string, React.RefObject<any>>;
  tabLayouts: Record<string, TabLayout>;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  registerRef: (key: string, ref: React.RefObject<any>) => void;
  unregisterRef: (key: string) => void;
  setTabLayout: (key: string, layout: TabLayout) => void;
  goingBack: React.MutableRefObject<boolean>;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  if (!TUTORIAL_ENABLED) {
    return <>{children}</>;
  }

  const [active, setActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tabLayouts, setTabLayoutsState] = useState<Record<string, TabLayout>>({});
  const targetRefs = useRef(new Map<string, React.RefObject<any>>()).current;
  const goingBackRef = useRef(false);

  const setTabLayout = useCallback((key: string, layout: TabLayout) => {
    setTabLayoutsState(prev => ({ ...prev, [key]: layout }));
  }, []);

  const completeTutorial = useCallback(() => {
    setActive(false);
    setCurrentStepIndex(0);
    if (userId) markTutorialComplete(userId);
  }, [userId]);

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex + 1 >= TUTORIAL_STEPS.length) {
      completeTutorial();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, completeTutorial]);

  const prevStep = useCallback(() => {
    goingBackRef.current = true;
    setTimeout(() => { goingBackRef.current = false; }, 500);
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const registerRef = useCallback((key: string, ref: React.RefObject<any>) => {
    targetRefs.set(key, ref);
  }, [targetRefs]);

  const unregisterRef = useCallback((key: string) => {
    targetRefs.delete(key);
  }, [targetRefs]);

  const value = useMemo<TutorialContextValue>(() => ({
    active,
    currentStepIndex,
    currentStep: TUTORIAL_STEPS[currentStepIndex],
    targetRefs,
    tabLayouts,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    registerRef,
    unregisterRef,
    setTabLayout,
    goingBack: goingBackRef,
  }), [active, currentStepIndex, targetRefs, tabLayouts, startTutorial, nextStep, prevStep, skipTutorial, completeTutorial, registerRef, unregisterRef, setTabLayout]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    // TUTORIAL_ENABLED is false — provider is a passthrough, context is null.
    // Return a no-op shape so all call sites work without changes.
    return {
      active: false,
      currentStepIndex: 0,
      currentStep: TUTORIAL_STEPS[0] as TutorialStep,
      targetRefs: new Map<string, React.RefObject<any>>(),
      tabLayouts: {},
      startTutorial: () => {},
      nextStep: () => {},
      prevStep: () => {},
      skipTutorial: () => {},
      completeTutorial: () => {},
      registerRef: () => {},
      unregisterRef: () => {},
      setTabLayout: () => {},
      goingBack: { current: false },
    };
  }
  return ctx;
}
