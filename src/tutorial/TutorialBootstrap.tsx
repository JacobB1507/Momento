import { useEffect, useRef } from 'react';
import { TUTORIAL_ENABLED } from './config';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from './TutorialContext';
import { fetchTutorialCompleted } from './tutorial';

export default function TutorialBootstrap({ welcomeSeen }: { welcomeSeen: boolean }) {
  const { session } = useAuth();
  const { startTutorial } = useTutorial();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!TUTORIAL_ENABLED) return;
    const userId = session?.user?.id;
    if (!userId || hasRun.current) return;
    if (!welcomeSeen) return;
    hasRun.current = true;
    fetchTutorialCompleted(userId).then((completed) => {
      if (!completed) startTutorial();
    });
  }, [session?.user?.id, welcomeSeen]);

  return null;
}
