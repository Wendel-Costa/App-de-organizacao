import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusStore } from '@/store/focusStore';

export function useTimer() {
  const { status, tickTimer, recalculateFromStart, persistActiveFocus } = useFocusStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(tickTimer, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        recalculateFromStart();
      } else if (nextState === 'background' || nextState === 'inactive') {
        void persistActiveFocus();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [persistActiveFocus, recalculateFromStart]);

  return useFocusStore();
}
