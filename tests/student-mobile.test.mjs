import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertMathSymbol, localFormKey, mayResumeStudentDraft, readLocalForms, removeLocalForm, writeLocalForm } from '../app/components/StudentMobileState.ts';
const storage = () => { const values = new Map(); return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const copy = (studentId, kind, id, value) => ({ studentId, kind, id, value, updatedAt: '2026-11-12T12:00:00Z' });

test('math buttons insert at the cursor and replace only selected text', () => {
  assert.deepEqual(insertMathSymbol('38', 1, 1, '/'), { value: '3/8', cursor: 2 });
  assert.deepEqual(insertMathSymbol('12', 0, 0, '−'), { value: '−12', cursor: 1 });
  assert.deepEqual(insertMathSymbol('3-8', 1, 2, '/'), { value: '3/8', cursor: 2 });
  assert.deepEqual(insertMathSymbol('123', 3, 3, '/', 3), { value: '123', cursor: 3 });
});
test('pending forms recover only inside their own profile and kind, retaining their UUID', () => {
  const store = storage(); writeLocalForm(store, copy('rocio', 'word', 'word-uuid', { original: 'lapiz', corrected: 'lápiz' })); writeLocalForm(store, copy('alejandra', 'question', 'question-uuid', { question: '¿Por qué?' }));
  assert.equal(readLocalForms(store, 'rocio', 'word')[0].id, 'word-uuid'); assert.deepEqual(readLocalForms(store, 'alejandra', 'word'), []); assert.equal(readLocalForms(store, 'alejandra', 'question')[0].value.question, '¿Por qué?');
  store.setItem(localFormKey('rocio', 'word', 'broken'), 'broken'); assert.equal(readLocalForms(store, 'rocio', 'word').length, 1);
});
test('a successful save clears only its submitted copy, preserving a newer form edit', () => {
  const store = storage(), submitted = copy('rocio', 'word', 'uuid', { original: 'lapiz' }); writeLocalForm(store, submitted); writeLocalForm(store, { ...submitted, value: { original: 'arbol' } });
  assert.equal(removeLocalForm(store, submitted), false); assert.equal(readLocalForms(store, 'rocio', 'word')[0].value.original, 'arbol');
  assert.equal(removeLocalForm(store, { ...submitted, value: { original: 'arbol' } }), true); assert.equal(store.length, 0);
});
test('resumption requires a fresh snapshot for the same profile and respects draft locks', () => {
  const ready = { profile: 'alejandra', snapshot: { drafts: [] } };
  assert.equal(mayResumeStudentDraft('alejandra', ready, true, false), true);
  assert.equal(mayResumeStudentDraft('rocio', ready, true, false), false);
  assert.equal(mayResumeStudentDraft('alejandra', { profile: 'alejandra' }, true, false), false);
  assert.equal(mayResumeStudentDraft('alejandra', ready, true, true), false);
  assert.equal(mayResumeStudentDraft('alejandra', ready, false, false), false);
});
