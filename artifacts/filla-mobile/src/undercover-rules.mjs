export const CATEGORIES = {
  حيوانات: ['زرافة', 'بطريق', 'فيل', 'قطة', 'دلفين', 'سلحفاة', 'ثعلب', 'كنغر', 'بومة', 'حصان', 'نحلة', 'أخطبوط', 'جمل', 'طاووس', 'قرد', 'غزال'],
  أكلات: ['مندي', 'كنافة', 'بيتزا', 'مقلوبة', 'فلافل', 'كبسة', 'شاورما', 'معمول', 'محشي', 'فتوش', 'بان كيك', 'آيس كريم', 'سمبوسة', 'مجدرة', 'مكرونة', 'لقيمات'],
  مدن: ['الرياض', 'جدة', 'القاهرة', 'بيروت', 'عمّان', 'مراكش', 'دبي', 'إسطنبول', 'الدوحة', 'مسقط', 'تونس', 'القدس', 'الدار البيضاء', 'المنامة', 'المدينة المنورة', 'الإسكندرية'],
};

export function makeAskSchedule(playerCount, random = Math.random) {
  if (!Number.isInteger(playerCount) || playerCount < 2) return [];
  const schedule = [];
  for (let round = 0; round < 3; round += 1) {
    const order = Array.from({ length: playerCount }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const offset = 1 + Math.floor(random() * (playerCount - 1));
    order.forEach((asker, position) => {
      schedule.push({ asker, respondent: order[(position + offset) % playerCount] });
    });
  }
  return schedule;
}

export function tallyVotes(votes, eligibleVoters, candidateIndexes) {
  const allowed = new Set(candidateIndexes);
  const count = new Map(candidateIndexes.map((candidate) => [candidate, 0]));
  const seen = new Set();
  for (const vote of votes) {
    if (!eligibleVoters.includes(vote.voter) || seen.has(vote.voter) ||
        vote.voter === vote.candidate || !allowed.has(vote.candidate)) continue;
    seen.add(vote.voter);
    count.set(vote.candidate, count.get(vote.candidate) + 1);
  }
  const maximum = Math.max(0, ...count.values());
  return { counts: Object.fromEntries(count), leaders: candidateIndexes.filter((candidate) => count.get(candidate) === maximum) };
}

export function chooseTieWinner(leaders, random = Math.random) {
  return leaders.length ? leaders[Math.floor(random() * leaders.length)] : null;
}

export function isOutsider(playerIndex, assignedOutsider) {
  return playerIndex === assignedOutsider;
}

export function guessIsCorrect(selected, secret) {
  return selected === secret;
}

export function makeReplayState(players) {
  return { stage: 'choose', rosterHash: JSON.stringify(players), index: 0, shown: false, schedule: [], turn: 0, votes: [], runoffCandidates: [] };
}

export function makeAnswerOptions(category, secret, random = Math.random) {
  const words = CATEGORIES[category];
  if (!words || !words.includes(secret)) return [];
  const distractors = words.filter((word) => word !== secret);
  for (let i = distractors.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  return [secret, ...distractors.slice(0, 3)].sort(() => random() - 0.5);
}

export function validRoundState(value, players) {
  if (!value || typeof value !== 'object' || !Array.isArray(players) || players.length < 2) return false;
  const state = value;
  const stages = ['choose', 'reveal', 'pass', 'ready', 'asking', 'ballot-ready', 'ballot', 'runoff', 'ballot-pass', 'reveal-result', 'guess-pass', 'guess', 'summary'];
  if (!stages.includes(state.stage)) return false;
  if (state.rosterHash !== JSON.stringify(players)) return false;
  if (state.stage === 'choose') return true;
  if (!Object.hasOwn(CATEGORIES, state.category) || !CATEGORIES[state.category].includes(state.secret)) return false;
  if (!Number.isInteger(state.outsider) || state.outsider < 0 || state.outsider >= players.length) return false;
  if (!Number.isInteger(state.index) || state.index < 0 || state.index >= players.length) return false;
  if (!Array.isArray(state.schedule) || state.schedule.length !== players.length * 3 ||
      state.schedule.some((turn) => !Number.isInteger(turn.asker) || !Number.isInteger(turn.respondent) || turn.asker < 0 || turn.asker >= players.length || turn.respondent < 0 || turn.respondent >= players.length || turn.asker === turn.respondent)) return false;
  if (players.some((_, player) => state.schedule.filter((turn) => turn.asker === player).length !== 3)) return false;
  if (!Array.isArray(state.votes) || !Array.isArray(state.runoffCandidates)) return false;
  if (state.votes.some((vote) => !Number.isInteger(vote.voter) || !Number.isInteger(vote.candidate) || vote.voter === vote.candidate || vote.voter < 0 || vote.voter >= players.length || vote.candidate < 0 || vote.candidate >= players.length)) return false;
  const hasOrderedBallots = (expected) => state.votes.length === expected && state.votes.every((vote, i) => vote.voter === i);
  if (['reveal', 'pass', 'ready'].includes(state.stage) && state.votes.length !== 0) return false;
  if (state.stage === 'asking' && (!Number.isInteger(state.turn) || state.turn < 0 || state.turn >= state.schedule.length || state.votes.length !== 0)) return false;
  if (state.stage === 'ballot' || state.stage === 'runoff') {
    if (!Number.isInteger(state.index) || state.index >= players.length || !hasOrderedBallots(state.index)) return false;
    if (state.stage === 'runoff' && (state.runoffCandidates.length < 2 || state.runoffCandidates.some((candidate) => !Number.isInteger(candidate) || candidate < 0 || candidate >= players.length))) return false;
  }
  if (state.stage === 'ballot-ready' && (!Number.isInteger(state.index) || state.index >= players.length || !hasOrderedBallots(state.index) ||
      (state.ballotKind === 'runoff' && (state.runoffCandidates.length < 2 || state.runoffCandidates.some((candidate) => !Number.isInteger(candidate) || candidate < 0 || candidate >= players.length))))) return false;
  if (state.stage === 'ballot-pass' && (!Number.isInteger(state.index) || state.index >= players.length || !hasOrderedBallots(state.index + 1))) return false;
  if (['reveal-result', 'guess-pass', 'guess', 'summary'].includes(state.stage) && !hasOrderedBallots(players.length)) return false;
  if (state.stage === 'summary' && (typeof state.guess !== 'string' || !CATEGORIES[state.category].includes(state.guess) || typeof state.guessCorrect !== 'boolean' || state.guessCorrect !== (state.guess === state.secret))) return false;
  return true;
}
