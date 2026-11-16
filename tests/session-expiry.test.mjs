import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionExpiry, sessionAccessFrom} from '../lib/session-expiry.ts';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const SERVER_START = Date.parse('2026-11-16T12:00:00.000Z');

// Wall clock, monotonic clock and timeout delivery can advance independently:
// suspended browsers do not necessarily advance all three in the same way.
function fakeClock({wall = SERVER_START, monotonic = 1000} = {}) {
  let wallNow = wall, ticks = monotonic, timerNow = 0, nextId = 0;
  const timers = new Map(), cancelled = [];
  const options = {
    now: () => wallNow,
    monotonic: () => ticks,
    setTimer(callback, delay) {
      assert.ok(Number.isFinite(delay) && delay >= 1 && delay <= 2_147_483_647);
      const id = ++nextId;
      timers.set(id, {id, callback, delay, due:timerNow + delay}); return id;
    },
    clearTimer(id) { cancelled.push(id); timers.delete(id); },
  };
  function runDue() {
    for (let iteration = 0; iteration < 100; iteration++) {
      const next = [...timers.values()].sort((a, b) => a.due - b.due || a.id - b.id).find(timer => timer.due <= timerNow);
      if (!next) return;
      timers.delete(next.id); next.callback();
    }
    assert.fail('expiry kept rescheduling an immediately due timer');
  }
  function elapse({wall = 0, monotonic = 0, timers = 0} = {}, deliver = false) {
    wallNow += wall; ticks += monotonic; timerNow += timers;
    if (deliver) runDue();
  }
  return {
    options, cancelled, elapse, runDue,
    advance(milliseconds) { elapse({wall:milliseconds, monotonic:milliseconds, timers:milliseconds}, true); },
    pending: () => [...timers.values()],
  };
}

function fixture(clockOptions) {
  const clock = fakeClock(clockOptions); let expirations = 0;
  const expiry = createSessionExpiry(() => { expirations++; }, clock.options);
  return {clock, expiry, expired: () => expirations};
}

test('access parsing accepts only known profiles and an explicit finite server deadline', () => {
  for (const profile of ['rocio', 'alejandra', 'teacher']) {
    const access = {profile, expiresAt:SERVER_START + DAY, serverNow:SERVER_START};
    assert.deepEqual(sessionAccessFrom(access), access);
  }
  assert.deepEqual(sessionAccessFrom({profile:null, expiresAt:null, serverNow:SERVER_START}), {profile:null, expiresAt:null, serverNow:SERVER_START});
  // An already expired server session must stay expired, not gain another day.
  assert.equal(sessionAccessFrom({profile:'rocio', expiresAt:SERVER_START - 1, serverNow:SERVER_START}).expiresAt, SERVER_START - 1);
});

test('malformed access payloads fail rather than inventing a local expiry', () => {
  for (const value of [
    null, undefined, {}, {profile:'admin', expiresAt:SERVER_START + DAY, serverNow:SERVER_START},
    {profile:'rocio', serverNow:SERVER_START}, {profile:'rocio', expiresAt:null, serverNow:SERVER_START},
    {profile:null, expiresAt:SERVER_START + DAY, serverNow:SERVER_START},
    {profile:'rocio', expiresAt:String(SERVER_START + DAY), serverNow:SERVER_START},
    {profile:'rocio', expiresAt:SERVER_START + DAY, serverNow:String(SERVER_START)},
    ...[NaN, Infinity, -Infinity, -1].flatMap(invalid => [
      {profile:'rocio', expiresAt:invalid, serverNow:SERVER_START},
      {profile:'rocio', expiresAt:SERVER_START + DAY, serverNow:invalid},
    ]),
  ]) assert.throws(() => sessionAccessFrom(value), /plazo de acceso válido/);
});

test('the session remains valid one millisecond before 24 hours and expires at the exact deadline', () => {
  const {clock, expiry, expired} = fixture();
  assert.equal(expiry.update(SERVER_START + DAY, SERVER_START), true);
  assert.equal(expiry.remaining(), DAY);
  clock.advance(DAY - 1);
  assert.equal(expiry.check(), true); assert.equal(expiry.remaining(), 1); assert.equal(expired(), 0);
  clock.advance(1);
  assert.equal(expiry.check(), false); assert.equal(expiry.remaining(), 0); assert.equal(expired(), 1);
  assert.equal(clock.pending().length, 0);
});

test('an idle timeout closes once without clicks and later checks never close it again', () => {
  const {clock, expiry, expired} = fixture();
  expiry.update(SERVER_START + DAY, SERVER_START);
  const queuedCallback = clock.pending()[0].callback;
  clock.advance(2 * DAY);
  assert.equal(expired(), 1); assert.equal(clock.pending().length, 0);
  queuedCallback(); expiry.check(); clock.advance(DAY);
  assert.equal(expired(), 1);
});

test('repeated delayed GET responses for the same deadline never extend remaining access', () => {
  const {clock, expiry, expired} = fixture();
  const deadline = SERVER_START + DAY;
  expiry.update(deadline, SERVER_START);
  clock.advance(6 * HOUR);
  // A sample taken three hours earlier arrives now: the current anchor wins.
  assert.equal(expiry.update(deadline, SERVER_START + 3 * HOUR), true);
  assert.equal(expiry.remaining(), 18 * HOUR);
  clock.advance(4 * HOUR);
  expiry.update(deadline, SERVER_START + 9 * HOUR);
  assert.equal(expiry.remaining(), 14 * HOUR);
  assert.equal(clock.pending().length, 1);
  clock.advance(14 * HOUR);
  assert.equal(expired(), 1); assert.equal(expiry.remaining(), 0);
});

test('a delayed same-deadline update cannot revive access already elapsed while timers were suspended', () => {
  const {clock, expiry, expired} = fixture();
  expiry.update(SERVER_START + DAY, SERVER_START);
  clock.elapse({wall:DAY + 1, monotonic:DAY + 1});
  assert.equal(expiry.update(SERVER_START + DAY, SERVER_START + HOUR), false);
  assert.equal(expired(), 1); assert.equal(clock.pending().length, 0);
  assert.equal(expiry.check(), false); assert.equal(expired(), 1);
});

test('server time offsets the deadline independently of an incorrect device wall clock', () => {
  for (const wall of [0, SERVER_START + 365 * DAY]) {
    const {clock, expiry, expired} = fixture({wall, monotonic:250});
    expiry.update(SERVER_START + DAY, SERVER_START);
    assert.equal(expiry.remaining(), DAY);
    clock.advance(23 * HOUR);
    assert.equal(expiry.remaining(), HOUR); assert.equal(expired(), 0);
    clock.advance(HOUR);
    assert.equal(expired(), 1);
  }
});

test('rolling the wall clock backwards cannot extend a session while monotonic time advances', () => {
  const {clock, expiry, expired} = fixture();
  expiry.update(SERVER_START + DAY, SERVER_START);
  clock.advance(18 * HOUR);
  clock.elapse({wall:-30 * HOUR});
  assert.equal(expiry.remaining(), 6 * HOUR);
  expiry.update(SERVER_START + DAY, SERVER_START + HOUR);
  assert.equal(expiry.remaining(), 6 * HOUR);
  clock.advance(6 * HOUR);
  assert.equal(expired(), 1); assert.equal(expiry.check(), false);
});

test('resume after wall-time suspension expires even if monotonic time and callbacks did not advance', () => {
  const {clock, expiry, expired} = fixture();
  expiry.update(SERVER_START + DAY, SERVER_START);
  const suspendedCallback = clock.pending()[0].callback;
  clock.elapse({wall:DAY});
  assert.equal(expiry.remaining(), 0);
  assert.equal(expiry.check(), false); assert.equal(expired(), 1);
  assert.equal(clock.pending().length, 0);
  suspendedCallback(); assert.equal(expired(), 1);
});

test('clear cancels pending expiry and a callback already queued before logout is harmless', () => {
  const {clock, expiry, expired} = fixture();
  expiry.update(SERVER_START + DAY, SERVER_START);
  const timer = clock.pending()[0];
  expiry.clear();
  assert.ok(clock.cancelled.includes(timer.id)); assert.equal(clock.pending().length, 0);
  assert.equal(expiry.remaining(), 0); assert.equal(expiry.check(), false);
  clock.advance(2 * DAY); timer.callback();
  assert.equal(expired(), 0);
});

test('a newly authenticated session installs its new deadline and cancels the former session timer', () => {
  const {clock, expiry, expired} = fixture();
  expiry.update(SERVER_START + DAY, SERVER_START);
  const oldTimer = clock.pending()[0];
  clock.advance(23 * HOUR);
  const newServerNow = SERVER_START + 23 * HOUR;
  assert.equal(expiry.update(newServerNow + DAY, newServerNow), true);
  assert.ok(clock.cancelled.includes(oldTimer.id)); assert.equal(expiry.remaining(), DAY);
  clock.advance(HOUR);
  assert.equal(expired(), 0); assert.equal(expiry.remaining(), 23 * HOUR);
  // An old callback reaching the event loop checks the new anchor, not old data.
  oldTimer.callback(); assert.equal(expired(), 0); assert.equal(expiry.remaining(), 23 * HOUR);
  clock.advance(23 * HOUR);
  assert.equal(expired(), 1);
});

test('invalid updates fail closed and cancel a previously scheduled deadline', () => {
  for (const [deadline, serverNow] of [[NaN,SERVER_START],[Infinity,SERVER_START],[-1,SERVER_START],[SERVER_START + DAY,NaN],[SERVER_START + DAY,Infinity],[SERVER_START + DAY,-1]]) {
    const {clock, expiry, expired} = fixture();
    expiry.update(SERVER_START + DAY, SERVER_START);
    assert.equal(expiry.update(deadline, serverNow), false);
    assert.equal(expired(), 1); assert.equal(expiry.remaining(), 0); assert.equal(clock.pending().length, 0);
    assert.equal(expiry.check(), false); assert.equal(expired(), 1);
  }
});
