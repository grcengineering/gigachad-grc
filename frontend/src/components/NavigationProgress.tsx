import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';
import clsx from 'clsx';

/**
 * NavigationProgress - Shows a progress bar at the top during navigation
 * Improves perceived performance by giving visual feedback during page transitions
 */
export default function NavigationProgress() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === 'loading') {
      setVisible(true);
      setProgress(0);

      // Simulate progress (since we don't know actual load progress)
      const timer1 = setTimeout(() => setProgress(30), 100);
      const timer2 = setTimeout(() => setProgress(60), 300);
      const timer3 = setTimeout(() => setProgress(80), 600);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else if (navigation.state === 'idle' && visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-white/50 dark:bg-surface-900/50">
      <div
        className={clsx(
          'h-full bg-brand-500 transition-all duration-300 ease-out',
          progress === 100 && 'opacity-0'
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
