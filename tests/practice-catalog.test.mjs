import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceSearch,comparePractice,isCurrentPractice} from '../lib/practice-catalog.ts';

test('short exercise codes are searchable with hyphens, spaces or one digit',()=>{
 const title=practiceSearch('RL-01 · Tildes y sílaba tónica');
 for(const query of ['RL-01','rl01','rl 1','RL-1','RL-','tónica','TONICA'])assert.ok(title.includes(practiceSearch(query)),query);
 assert.equal(practiceSearch('5/6 − 1/3'),'5/6 − 1/3');
});
test('each pupil sees the PDF subjects before complementary work',()=>{
 const titles=['RI-01 · Inglés 1','RM-02 · Raíces','RL-10 · Prefijos','RL-02 · Tildes'];
 assert.deepEqual(titles.map(title=>({title})).sort(comparePractice).map(item=>item.title),['RL-02 · Tildes','RL-10 · Prefijos','RM-02 · Raíces','RI-01 · Inglés 1']);
 const a=['AL-01 · Sintaxis','AF-02 · Masa','AM-10 · Porcentajes','AM-02 · Fracciones'];
 assert.deepEqual(a.map(title=>({title})).sort(comparePractice).map(item=>item.title),['AM-02 · Fracciones','AM-10 · Porcentajes','AF-02 · Masa','AL-01 · Sintaxis']);
});
test('retirement hides only catalogue entries, without changing custom work or records',()=>{
 const old=Object.freeze({id:'old',practiceRetired:true,answer:'3/4'}),custom=Object.freeze({id:'custom'});
 assert.equal(isCurrentPractice(old),false);assert.equal(isCurrentPractice(custom),true);assert.equal(old.answer,'3/4');
});
