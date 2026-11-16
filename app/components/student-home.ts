import {hasCompletedAssignment, isAutomaticallyChecked, responseCompletesActivity} from '../../lib/activity-completion';

type Item = Record<string, any>;
export type HomeWork = { key: string; activity?: Item; resource?: Item; assignment?: Item; draft?: Item; copies?: Item[]; kind?: "teacher" | "draft" | "proposal" };

/** A shared resource timeline does not complete a different assignment or adaptation. */
const teacherAssignment = (activity: Item, assignment: Item | undefined) => Boolean(assignment && (assignment.category !== 'Opcionales' || assignment.id !== `optional:${assignment.studentId}:${activity.id}`));
const activityResponse = (activity: Item, response: Item) => response.activityId === activity.id || activity.resourceId && activity.id === `act-${activity.resourceId}` && !response.activityId && response.resourceId === activity.resourceId;
export function submissionForHomeWork(activity: Item, assignment: Item | undefined, responses: Item[]) {
  if (teacherAssignment(activity, assignment)) return responses.find(item => item.assignmentId === assignment!.id);
  return responses.find(item => activityResponse(activity, item));
}
export const hasActivitySubmission = (activity: Item, assignment: Item | undefined, responses: Item[]) => Boolean(submissionForHomeWork(activity, assignment, responses));
export function hasCompletedActivity(activity: Item, assignment: Item | undefined, responses: Item[]): boolean {
  if (teacherAssignment(activity, assignment)) return hasCompletedAssignment(activity, assignment!, responses);
  return responses.some(item => activityResponse(activity, item) && responseCompletesActivity(activity, item));
}
export function needsActivityRetry(activity: Item, assignment: Item | undefined, responses: Item[]): boolean {
  if (!isAutomaticallyChecked(activity) || hasCompletedActivity(activity, assignment, responses)) return false;
  return responses.some(item => item.autoResult === 'incorrect' && (teacherAssignment(activity, assignment)
    ? item.assignmentId === assignment!.id && (!assignment!.studentId || item.studentId === assignment!.studentId)
    : activityResponse(activity, item)));
}

/** Legacy resource copies remain accessible while a current activity draft takes precedence. */
export function groupHomeDrafts(options: HomeWork[]): HomeWork[] {
  const groups = new Map<string, HomeWork>();
  for (const option of options) {
    const previous = groups.get(option.key);
    if (!previous) groups.set(option.key, { ...option, copies: option.draft ? [option.draft] : [] });
    else {
      const copies = [...(previous.copies || []), ...(option.draft ? [option.draft] : [])];
      const useCurrent = Boolean(option.draft?.activityId && !previous.draft?.activityId);
      groups.set(option.key, { ...(useCurrent ? option : previous), copies });
    }
  }
  const updated = (work: HomeWork) => (work.copies || []).reduce((date, copy) => (copy.updatedAt || "") > date ? copy.updatedAt : date, work.draft?.updatedAt || "");
  return [...groups.values()].sort((a, b) => updated(b).localeCompare(updated(a)));
}

export function selectHomeWork({ student, activities, assignments, responses, draftOptions, skills = [], attemptedIds = [] }: { student: Item; activities: Item[]; assignments: Item[]; responses: Item[]; draftOptions: HomeWork[]; skills?: Item[]; attemptedIds?: string[] }) {
  const activityFor = (id: string) => activities.find(item => item.id === id);
  const assignmentFor = (id: string) => assignments.find(item => item.activityId === id && item.category !== "Opcionales" && !hasCompletedAssignment(activityFor(id) || {}, item, responses)) || assignments.find(item => item.activityId === id);
  const marked = assignments.find(item => item.isMain && activityFor(item.activityId));
  const pending = assignments.find(item => item.category !== "Opcionales" && activityFor(item.activityId) && !hasCompletedAssignment(activityFor(item.activityId)!, item, responses));
  const teacherActivity = activityFor(student.mainActivityId) || activityFor(marked?.activityId) || activityFor(pending?.activityId);
  const drafts = groupHomeDrafts(draftOptions);
  const activeSkills = new Set(skills.filter(item => item.reviewNeeded || item.state && item.state !== "Por empezar").map(item => item.id));
  const subjects = (student.subjectPlan || []).map((item: Item) => item.subject);
  const subjectRank = (item: Item) => { const index = subjects.indexOf(item.subject); return index < 0 ? subjects.length : index; };
  const autonomous = activities.filter(item => item.supportMode === "independent" && !attemptedIds.includes(item.id) && !assignments.some(task => task.activityId === item.id && task.category !== "Opcionales")).sort((a, b) => Number(activeSkills.has(b.skillId)) - Number(activeSkills.has(a.skillId)) || subjectRank(a) - subjectRank(b) || Number(a.duration || 60) - Number(b.duration || 60) || a.title.localeCompare(b.title, "es"));
  const fromActivity = (activity: Item, kind: "teacher" | "proposal"): HomeWork => {
    const saved = drafts.find(item => item.activity?.id === activity.id);
    return { ...saved, key: saved?.key || `activity:${activity.id}`, activity, assignment: assignmentFor(activity.id), kind };
  };
  const primary: HomeWork | null = teacherActivity ? fromActivity(teacherActivity, "teacher") : drafts[0] ? { ...drafts[0], kind: "draft" } : autonomous[0] ? fromActivity(autonomous[0], "proposal") : null;
  const otherDraft = drafts.find(item => item.key !== primary?.key);
  const otherActivity = autonomous.find(item => item.id !== primary?.activity?.id);
  const explicitAlternative = activityFor(student.alternativeActivityId);
  const alternative: HomeWork | null = explicitAlternative && explicitAlternative.id !== primary?.activity?.id ? fromActivity(explicitAlternative, "teacher") : !primary || primary.kind === "proposal" ? null : otherDraft ? { ...otherDraft, kind: "draft" } : otherActivity ? fromActivity(otherActivity, "proposal") : null;
  return { primary, alternative, otherDrafts: drafts.filter(item => item.key !== primary?.key && item.key !== alternative?.key) };
}
