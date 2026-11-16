export const EXERCISE_SUCCESS_DELAY_MS = 1800;

type TimerClock = {
  setTimer: (callback: () => void, delay: number) => unknown;
  clearTimer: (handle: unknown) => void;
};

/** A queued callback must never navigate after an editor or profile has changed. */
export function createExerciseReturn(clock: TimerClock = {
  setTimer: (callback, delay) => setTimeout(callback, delay),
  clearTimer: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let revision = 0, timer: unknown = null;
  const cancel = () => {
    revision++;
    if (timer !== null) clock.clearTimer(timer);
    timer = null;
  };
  return {
    cancel,
    schedule(result: unknown, onReturn: () => void) {
      cancel();
      if (result !== 'correct') return false;
      const current = revision;
      timer = clock.setTimer(() => {
        if (current !== revision) return;
        timer = null;
        revision++;
        onReturn();
      }, EXERCISE_SUCCESS_DELAY_MS);
      return true;
    },
  };
}
