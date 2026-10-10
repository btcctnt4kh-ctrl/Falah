import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORIES, chooseTieWinner, guessIsCorrect, isOutsider, makeAnswerOptions, makeAskSchedule, makeReplayState, tallyVotes, validRoundState } from './undercover-rules.mjs';

test('each player asks three times in valid non-self schedule for 3, 4 and 6 players', () => {
  for (const count of [3, 4, 6]) {
    const schedule = makeAskSchedule(count);
    assert.equal(schedule.length, count * 3);
    assert.deepEqual(Array.from({ length: count }, (_, player) => schedule.filter((turn) => turn.asker === player).length), Array(count).fill(3));
    assert.ok(schedule.every(({ asker, respondent }) => asker !== respondent));
  }
});

test('vote tally ignores duplicate ballots and identifies ties', () => {
  const result = tallyVotes([{ voter: 0, candidate: 1 }, { voter: 0, candidate: 2 }, { voter: 1, candidate: 2 }, { voter: 2, candidate: 1 }, { voter: 3, candidate: 2 }], [0, 1, 2, 3], [1, 2]);
  assert.deepEqual(result.leaders, [1, 2]);
  assert.deepEqual(result.counts, { 1: 2, 2: 2 });
  assert.equal(chooseTieWinner(result.leaders, () => 0.75), 2);
});

test('outsider identity and final guess remain tied to the original assignment', () => {
  const players = ['ريم', 'سعد', 'نورة'];
  const state = { stage: 'reveal', rosterHash: JSON.stringify(players), category: 'حيوانات', secret: 'زرافة', outsider: 1, index: 1, shown: false, schedule: makeAskSchedule(3), votes: [], runoffCandidates: [], turn: 0 };
  assert.equal(validRoundState(state, players), true);
  assert.equal(isOutsider(1, state.outsider), true);
  assert.equal(isOutsider(0, state.outsider), false);
  const options = makeAnswerOptions('حيوانات', 'زرافة');
  assert.equal(options.length, 4);
  assert.ok(options.includes('زرافة'));
  assert.ok(options.every((word) => CATEGORIES['حيوانات'].includes(word)));
  assert.equal(guessIsCorrect('زرافة', 'زرافة'), true);
  assert.equal(guessIsCorrect('فيل', 'زرافة'), false);
});

test('saved rounds do not survive a player-list change', () => {
  const players = ['ريم', 'سعد', 'نورة'];
  const state = { stage: 'choose', rosterHash: JSON.stringify(players) };
  assert.equal(validRoundState(state, players), true);
  assert.equal(validRoundState(state, [...players, 'مازن']), false);
  const replay = makeReplayState(players);
  assert.deepEqual(JSON.parse(replay.rosterHash), players);
  assert.deepEqual(replay.votes, []);
  assert.equal(replay.stage, 'choose');
});

test('saved ballot rejects repeat voting by the same player', () => {
  const players = ['ريم', 'سعد', 'نورة'];
  const ballot = {
    stage: 'ballot', rosterHash: JSON.stringify(players), category: 'مدن', secret: 'جدة', outsider: 2,
    index: 2, shown: false, schedule: makeAskSchedule(players.length), turn: 0,
    votes: [{ voter: 0, candidate: 1 }, { voter: 0, candidate: 2 }], runoffCandidates: [], ballotKind: 'ballot',
  };
  assert.equal(validRoundState(ballot, players), false);
});
