import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';
import { fetchTutorialCompleted } from '../lib/tutorial';

export default function TutorialBootstrap({ welcomeSeen }: { welcomeSeen: boolean }) {
  const { session } = useAuth();
  const { startTutorial } = useTutorial();
  const hasRun = useRef(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || hasRun.current) return;
    // Don't start (or lock hasRun) until welcome has been dismissed.
    // When welcomeSeen flips to true this effect re-fires and proceeds.
    if (!welcomeSeen) return;
    hasRun.current = true;
    fetchTutorialCompleted(userId).then((completed) => {
      if (!completed) startTutorial();
    });
  }, [session?.user?.id, welcomeSeen]);

  return null;
}
