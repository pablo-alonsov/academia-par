type Item = Record<string, any>;

export function isAutomaticallyChecked(activity: Item): boolean {
  return ['choice', 'numeric', 'fraction'].includes(activity.type) || activity.type === 'text' && activity.autoCheck === true;
}

/** An attempt is kept in history; only a correct automatic result completes practice. */
export function responseCompletesActivity(activity: Item, response: Item): boolean {
  if (response.autoResult === 'correct') return true;
  if (response.autoResult === 'incorrect') return false;
  // Open work remains submitted for the teacher to review in class.
  return !isAutomaticallyChecked(activity);
}

/** Reassigning an exercise creates a new task, independent of earlier practice. */
export function hasCompletedAssignment(activity: Item, assignment: Item, responses: Item[]): boolean {
  return responses.some(response => response.assignmentId === assignment.id && (!assignment.studentId || response.studentId === assignment.studentId) && responseCompletesActivity(activity, response));
}
