import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';
import { fetchTutorialCompleted } from '../lib/tutorial';

export default function TutorialBootstrap() {
  const { session } = useAuth();
  const { startTutorial } = useTutorial();
  const hasRun = useRef(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || hasRun.current) return;
    hasRun.current = true;
    fetchTutorialCompleted(userId).then((completed) => {
      if (!completed) startTutorial();
    });
  }, [session?.user?.id]);

  return null;
}
