import {pdfFileForResource} from './resource-files';

type Item = Record<string, any>;
export type SolutionGroup = {
  key: string;
  title: string;
  resourceIds: string[];
  resources: Item[];
  studentIds: string[];
  studentNames: string[];
  current?: Item;
  previous: Item[];
  archived: boolean;
};

/** The key uses verified original bytes, never the title or an answer file's hash. */
export function worksheetKeyForFile(file: Item | null | undefined): string {
  if (typeof file?.contentHash === 'string' && /^[a-f0-9]{64}$/i.test(file.contentHash)) return `sha256:${file.contentHash.toLowerCase()}`;
  return typeof file?.id === 'string' && file.id ? `file:${file.id}` : '';
}
const stamp = (file: Item) => String(file._solutionUpdatedAt || file.createdAt || file.updatedAt || '');
const recent = (a: Item, b: Item) => stamp(b).localeCompare(stamp(a)) || String(a.id).localeCompare(String(b.id));

/** Teacher-only view: identical worksheets share one answer key and version list. */
export function buildSolutionGroups(resources: Item[] = [], files: Item[] = [], students: Item[] = []): SolutionGroup[] {
  const groups = new Map<string, SolutionGroup>(), originals = new Map<string, Item[]>(), seen = new Set<string>();
  for (const resource of resources) {
    if (!resource?.id || seen.has(resource.id)) continue;
    seen.add(resource.id);
    const file = pdfFileForResource(resource, files), key = worksheetKeyForFile(file);
    if (!file || !key) continue;
    const group: SolutionGroup = groups.get(key) || {key, title: resource.title || file.name || 'Ficha PDF', resourceIds: [], resources: [], studentIds: [], studentNames: [], previous: [], archived: false};
    group.resourceIds.push(resource.id); group.resources.push(resource);
    const studentId = file.studentId || resource.studentId;
    if (typeof studentId === 'string' && !group.studentIds.includes(studentId)) group.studentIds.push(studentId);
    group.archived ||= file._solutionsArchived === true;
    groups.set(key, group); originals.set(key, [...(originals.get(key) || []), file]);
  }
  const studentOrder = new Map(students.map((student, index) => [student.id, index]));
  for (const group of groups.values()) {
    group.studentIds.sort((a,b) => (studentOrder.get(a) ?? 99) - (studentOrder.get(b) ?? 99) || a.localeCompare(b));
    group.studentNames = group.studentIds.map(id => students.find(student => student.id === id)?.name || (id === 'rocio' ? 'Rocío' : id === 'alejandra' ? 'Alejandra' : id));
    const versions = files.filter(file => file.purpose === 'solution' && file.type === 'application/pdf' && file.detached !== true && file._solutionWorksheetKey === group.key).sort(recent);
    group.current = versions.find(file => file._solutionStatus === 'current');
    group.previous = versions.filter(file => file.id !== group.current?.id);
  }
  const groupStamp = (group: SolutionGroup) => [group.current ? stamp(group.current) : '', ...(originals.get(group.key) || []).map(stamp)].sort().at(-1) || '';
  return [...groups.values()].sort((a,b) => groupStamp(b).localeCompare(groupStamp(a)) || a.title.localeCompare(b.title, 'es'));
}
