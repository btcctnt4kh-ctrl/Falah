import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Cat, Check, Home as HomeIcon, MapPin, RotateCcw, Utensils, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'wouter';
import { playTone } from './feedback';
import { CATEGORIES, chooseTieWinner, guessIsCorrect, hasEnoughUndercoverPlayers, isOutsider, makeAnswerOptions, makeAskSchedule, makeReplayState, tallyVotes, undercoverPlayersRequirementMessage, validRoundState, type UndercoverCategory, type Vote } from './undercover-rules.mjs';

type Stage = 'choose' | 'reveal' | 'pass' | 'ready' | 'asking' | 'ballot-ready' | 'ballot' | 'runoff' | 'ballot-pass' | 'reveal-result' | 'guess-pass' | 'guess' | 'summary';
type RoundState = {
  stage: Stage;
  rosterHash: string;
  category?: UndercoverCategory;
  secret?: string;
  outsider?: number;
  index: number;
  shown: boolean;
  schedule: { asker: number; respondent: number }[];
  turn: number;
  votes: Vote[];
  runoffCandidates: number[];
  ballotKind?: 'ballot' | 'runoff';
  guess?: string;
  guessCorrect?: boolean;
  resolutionNote?: string;
};
const STORAGE_KEY = 'filla-undercover-round-v2';
const emptyRound = (players: string[]): RoundState => makeReplayState(players);

function loadRound(players: string[]): RoundState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validRoundState(parsed, players)) return { ...parsed, shown: false, stage: parsed.stage === 'guess' ? 'guess-pass' : parsed.stage };
    }
  } catch { /* Start a clean round if storage is unavailable or malformed. */ }
  return emptyRound(players);
}

function drawIndex(length: number) {
  if (length < 2) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const sample = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / length) * length;
    do globalThis.crypto.getRandomValues(sample); while (sample[0] >= limit);
    return sample[0] % length;
  }
  return Math.floor(Math.random() * length);
}

export default function Undercover({ players, soundEnabled = false }: { players: string[]; soundEnabled?: boolean }) {
  const [game, setGame] = useState<RoundState>(() => loadRound(players));
  const [rollingName, setRollingName] = useState('');
  const [landed, setLanded] = useState(false);
  const [voteError, setVoteError] = useState('');
  const answerOptions = useMemo(() => game.category && game.secret ? makeAnswerOptions(game.category, game.secret) : [], [game.category, game.secret]);

  useEffect(() => {
    if (game.rosterHash !== JSON.stringify(players)) setGame(emptyRound(players));
  }, [players, game.rosterHash]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, shown: false })); } catch { /* Keep this session playable. */ }
  }, [game]);
  useEffect(() => {
    if (game.stage !== 'reveal-result' || game.outsider === undefined) return;
    let ticks = 0;
    let timer = 0;
    setLanded(false);
    const roll = () => {
      ticks += 1;
      if (ticks >= 18) {
        setRollingName(players[game.outsider!]);
        setLanded(true);
        return;
      }
      setRollingName(players[drawIndex(players.length)]);
      timer = window.setTimeout(roll, 55 + ticks * 13);
    };
    roll();
    return () => window.clearTimeout(timer);
  }, [game.stage, game.outsider, players]);

  function update(next: Partial<RoundState>) {
    if (next.stage && next.stage !== game.stage) {
      playTone('tap', soundEnabled);
      if ('vibrate' in navigator) navigator.vibrate?.(10);
    }
    setGame((old) => ({ ...old, ...next }));
  }
  function startRound(category: UndercoverCategory) {
    if (!hasEnoughUndercoverPlayers(players.length)) return;
    const secret = CATEGORIES[category][drawIndex(CATEGORIES[category].length)];
    playTone('tap', soundEnabled);
    setGame({
      ...emptyRound(players), stage: 'reveal', category, secret, outsider: drawIndex(players.length),
      schedule: makeAskSchedule(players.length, Math.random), index: 0, turn: 0,
    });
    setVoteError('');
  }
  function hideRole() {
    update({ stage: 'pass', shown: false });
  }
  function passRole() {
    if (game.index + 1 < players.length) update({ stage: 'reveal', index: game.index + 1 });
    else update({ stage: 'ready', index: 0 });
  }
  function resolveBallot(votes: Vote[], kind: 'ballot' | 'runoff') {
    const candidates = kind === 'runoff' ? game.runoffCandidates : players.map((_, i) => i);
    const result = tallyVotes(votes, players.map((_, i) => i), candidates);
    if (result.leaders.length === 1) {
      update({ stage: 'reveal-result', votes, resolutionNote: '' });
    } else if (kind === 'ballot') {
      update({ stage: 'ballot-ready', index: 0, votes: [], runoffCandidates: result.leaders, ballotKind: 'runoff' });
    } else {
      const selected = chooseTieWinner(result.leaders, Math.random);
      const resolved = selected ?? result.leaders[0];
      update({ stage: 'reveal-result', votes, outsider: game.outsider, resolutionNote: `استمر التعادل بعد جولة الإعادة؛ حُسم الاختيار عشوائياً بين المتعادلين. ${players[resolved]} هو اختيار التصويت.` });
    }
  }
  function castVote(candidate: number) {
    const kind = game.stage as 'ballot' | 'runoff';
    const eligible = kind === 'runoff' ? game.runoffCandidates : players.map((_, i) => i);
    if (!eligible.includes(candidate) || candidate === game.index || game.votes.some((vote) => vote.voter === game.index)) {
      setVoteError('هذا الاختيار غير متاح؛ لكل لاعب صوت واحد ولا يصوّت لنفسه.');
      return;
    }
    update({ stage: 'ballot-pass', votes: [...game.votes, { voter: game.index, candidate }], ballotKind: kind });
    setVoteError('');
  }
  function nextBallotPlayer() {
    const kind = game.ballotKind ?? 'ballot';
    if (game.index + 1 < players.length) update({ stage: 'ballot-ready', index: game.index + 1 });
    else resolveBallot(game.votes, kind);
  }
  function submitGuess(word: string) {
    if (game.guess !== undefined || game.outsider === undefined) return;
    update({ stage: 'summary', guess: word, guessCorrect: guessIsCorrect(word, game.secret!) });
  }
  const currentTurn = game.schedule[game.turn];
  const ballotKind = game.ballotKind ?? 'ballot';
  const ballotChoices = ballotKind === 'runoff' ? game.runoffCandidates : players.map((_, i) => i);
  const playerRequirementMessage = undercoverPlayersRequirementMessage(players.length);
  const progressIndex = game.stage === 'choose' ? 0
    : ['reveal', 'pass'].includes(game.stage) ? 1
      : ['ready', 'asking'].includes(game.stage) ? 2
        : ['ballot-ready', 'ballot', 'runoff', 'ballot-pass'].includes(game.stage) ? 3 : 4;
  const progressLabels = ['الفئة', 'الأدوار', 'الأسئلة', 'التصويت', 'الكشف'];

  return <main className="main game-screen undercover-screen" data-testid="undercover-screen">
    <div className="game-header"><Link href="/" className="back-link" data-testid="link-back-home"><ArrowRight size={17} />للرئيسية</Link><div className="game-title"><div className="eyebrow">لعبة رقم ٣</div><h1>برا السالفة</h1><p>كلمة واحدة للجميع... إلا لشخص بينهم.</p></div><span className="header-spacer" /></div>
    <div className="stage-progress" aria-label={`المرحلة ${progressIndex + 1} من ${progressLabels.length}`} data-testid="undercover-stage-progress">
      {progressLabels.map((label, index) => <div className={`stage-progress-item ${index < progressIndex ? 'done' : ''} ${index === progressIndex ? 'active' : ''}`} key={label} aria-current={index === progressIndex ? 'step' : undefined}>
        <span className="stage-progress-dot">{index < progressIndex ? <Check size={12} /> : index + 1}</span><span>{label}</span>
      </div>)}
    </div>
    {!hasEnoughUndercoverPlayers(players.length) ? <div className="game-panel" data-testid="undercover-needs-players"><div className="game-icon" style={{ margin: '0 auto 16px' }}><Users size={22} /></div><h2>نحتاج لاعباً ثالثاً</h2><p className="secret-muted" role="alert" data-testid="undercover-needs-players-message">{playerRequirementMessage}</p><Link href="/" className="btn btn-primary"><ArrowRight size={16} />{players.length === 2 ? 'إضافة لاعب ثالث' : 'إضافة لاعبين'}</Link></div> :
    <div key={game.stage} className={`game-panel game-stage-card undercover-panel stage-${game.stage}`} data-testid="undercover-panel">
      {game.stage === 'choose' && <><div className="game-stage-top"><div className="panel-label">١ · اختاروا التصنيف</div><p className="panel-instruction">مرّروا الهاتف لكل لاعب، ثم اسألوا بعضكم شفهياً.</p></div><div className="category-grid">{(Object.keys(CATEGORIES) as UndercoverCategory[]).map((category, i) => {
        const CategoryIcon: LucideIcon = category === 'حيوانات' ? Cat : category === 'أكلات' ? Utensils : MapPin;
        return <button className="category-button" key={category} onClick={() => startRound(category)} data-testid={`undercover-category-${i}`}><span className="category-symbol"><CategoryIcon size={22} /></span><span>{category}</span><ArrowLeft className="category-arrow" size={16} /></button>;
      })}</div></>}
      {game.stage === 'reveal' && <><div className="step-pips">{players.map((_, i) => <span key={i} className={`step-pip ${i <= game.index ? 'on' : ''}`} />)}</div><div className="panel-label">اللاعب {game.index + 1} من {players.length}</div><h2 className="undercover-title">مرّروا الهاتف إلى</h2><div className="player-slot undercover-player-slot"><span className="slot-name" data-testid="undercover-current-player">{players[game.index]}</span></div>{!game.shown ? <><p className="panel-instruction">تأكدوا أن الشاشة لكم وحدكم قبل الكشف.</p><button className="btn btn-primary" onClick={() => update({ shown: true })} data-testid="undercover-button-reveal">أنا {players[game.index]} · اكشف دوري</button></> : <><div className="secret-box" aria-live="polite" data-testid="undercover-private-role">{isOutsider(game.index, game.outsider!) ? <><span className="role-pill">أنت برا السالفة</span><strong>لا تعرف الكلمة</strong><p className="secret-muted">اسمع التلميحات وحاول تواكبهم.</p></> : <><span className="role-pill">أنت من السالفة</span><strong>{game.secret}</strong><p className="secret-muted">تذكّر الكلمة ولا تكشفها مباشرة.</p></>}</div><button className="btn btn-soft" onClick={hideRole} data-testid="undercover-button-hide">إخفاء وتمرير الجوال</button></>}</>}
      {game.stage === 'pass' && <><div className="game-icon" style={{ margin: '0 auto 14px' }}><ArrowLeft size={21} /></div><h2 className="undercover-title">مرّروا الجوال بأمان</h2><p className="secret-muted">أعطوا الهاتف للاعب التالي فقط، من دون كشف الشاشة.</p><button className="btn btn-primary" onClick={passRole} data-testid="undercover-button-pass">تم، التالي <ArrowLeft size={16} /></button></>}
      {game.stage === 'ready' && <><div className="game-icon" style={{ margin: '0 auto 14px' }}><Check size={22} /></div><span className="role-pill">اكتملت التوزيعة</span><h2 className="undercover-title">وقت الأسئلة</h2><p className="secret-muted">تبادلوا الأسئلة شفهياً. كل لاعب يسأل ثلاث مرات، ولا يظهر هنا أي دور أو كلمة.</p><button className="btn btn-primary" onClick={() => update({ stage: 'asking', turn: 0 })} data-testid="undercover-button-start">ابدأوا الأسئلة <ArrowLeft size={16} /></button></>}
      {game.stage === 'asking' && currentTurn && <><div className="panel-label">السؤال {game.turn + 1} من {game.schedule.length}</div><h2 className="undercover-title">وقت الأسئلة</h2><div className="turn-pair"><div><span>السائل</span><strong>{players[currentTurn.asker]}</strong></div><ArrowLeft size={19} /><div><span>المجيب</span><strong>{players[currentTurn.respondent]}</strong></div></div><p className="secret-muted">اسألوا وأجيبوا شفهياً؛ لا حاجة لكتابة السؤال.</p><button className="btn btn-primary" onClick={() => game.turn + 1 < game.schedule.length ? update({ turn: game.turn + 1 }) : update({ stage: 'ballot-ready', index: 0, votes: [], ballotKind: 'ballot' })} data-testid="undercover-button-next-question">{game.turn + 1 < game.schedule.length ? 'التالي' : 'انتهت الأسئلة · التصويت'} <ArrowLeft size={16} /></button></>}
      {game.stage === 'ballot-ready' && <><div className="panel-label">{ballotKind === 'runoff' ? 'جولة إعادة · تعادل في الأصوات' : 'التصويت السري'}</div><h2 className="undercover-title">{ballotKind === 'runoff' ? 'من بين المتعادلين؟' : 'من تتوقع أنه برا السالفة؟'}</h2><p className="secret-muted">مرّروا الجوال إلى {players[game.index]} وحده. لا تظهر الأصوات السابقة.</p><button className="btn btn-primary" onClick={() => update({ stage: ballotKind })} data-testid="undercover-button-own-ballot">أنا {players[game.index]} · ابدأ التصويت</button><p className="panel-instruction">الصوت {game.index + 1} من {players.length}</p></>}
      {(game.stage === 'ballot' || game.stage === 'runoff') && <><div className="panel-label">{game.stage === 'runoff' ? 'جولة إعادة · تعادل في الأصوات' : 'التصويت السري'}</div><h2 className="undercover-title">{game.stage === 'runoff' ? 'من بين المتعادلين؟' : 'من تتوقع أنه برا السالفة؟'}</h2><p className="secret-muted">اختَر مرشحاً واحداً. لا تظهر الأصوات السابقة.</p><div className="vote-grid">{ballotChoices.filter((candidate) => candidate !== game.index).map((candidate) => <button className="vote-choice" key={candidate} onClick={() => castVote(candidate)} data-testid={`undercover-vote-${game.index}-${candidate}`}>أنا {players[game.index]} أصوّت لـ <strong>{players[candidate]}</strong></button>)}</div>{voteError && <p className="error-note" role="alert">{voteError}</p>}<p className="panel-instruction">{`الصوت ${game.index + 1} من ${players.length}`}</p></>}
      {game.stage === 'ballot-pass' && <><div className="game-icon" style={{ margin: '0 auto 14px' }}><ArrowLeft size={21} /></div><span className="role-pill">تم حفظ الصوت بسرية</span><h2 className="undercover-title">مرّروا الجوال</h2><p className="secret-muted">لا تعرضوا الاختيار للاعب التالي. سيصوّت كل شخص مرة واحدة.</p><button className="btn btn-primary" onClick={nextBallotPlayer} data-testid="undercover-button-next-voter">{game.index + 1 < players.length ? `التالي · ${players[game.index + 1]}` : 'إنهاء التصويت'} <ArrowLeft size={16} /></button></>}
      {game.stage === 'reveal-result' && <><div className="panel-label">لحظة الكشف</div><h2 className="undercover-title">الشخص الذي كان برا السالفة هو...</h2><div className={`player-slot reveal-slot ${landed ? 'landed' : ''}`} aria-live="polite"><span className="slot-name" data-testid="undercover-revealed-player">{rollingName || '...'}</span></div>{landed && <><p className="secret-muted">التوزيعة الأصلية محفوظة؛ هذه هي هوية المتخفي الحقيقية.</p>{game.resolutionNote && <div className="notice">{game.resolutionNote}</div>}<button className="btn btn-primary" onClick={() => update({ stage: 'guess-pass' })} data-testid="undercover-button-guess-pass">فرصة أخيرة للتخمين <ArrowLeft size={16} /></button></>}</>}
      {game.stage === 'guess-pass' && <><span className="role-pill">الآن دور المتخفي فقط</span><h2 className="undercover-title">{players[game.outsider!]} لديه فرصة أخيرة</h2><p className="secret-muted">مرّروا الجوال إلى اللاعب الظاهر أعلاه. لا تكشفوا قائمة الكلمات لبقية المجموعة.</p><button className="btn btn-primary" onClick={() => update({ stage: 'guess' })} data-testid="undercover-button-guess-start">أنا {players[game.outsider!]} · أريد التخمين</button></>}
      {game.stage === 'guess' && <><div className="panel-label">تخمين خاص · {game.category}</div><h2 className="undercover-title">اختر كلمة واحدة</h2><p className="secret-muted">هذه الخيارات لك وحدك. اختر أفضل تخمينك؛ لن يمكن تغييره.</p><div className="answer-grid">{answerOptions.map((word) => <button key={word} className="vote-choice answer-choice" onClick={() => submitGuess(word)} data-testid={`undercover-answer-${word}`}>{word}</button>)}</div></>}
      {game.stage === 'summary' && <><span className={`role-pill ${game.guessCorrect ? 'correct-pill' : 'wrong-pill'}`}>{game.guessCorrect ? 'صح!' : 'خطأ!'}</span><h2 className="undercover-title">ملخص الجولة</h2><div className={`summary-result ${game.guessCorrect ? 'correct-result' : 'wrong-result'}`}><p>برا السالفة</p><strong>{players[game.outsider!]}</strong><p>الكلمة السرية</p><strong>{game.secret}</strong><p>تخمين المتخفي</p><strong>{game.guess}</strong></div><div className="action-row"><button className="btn btn-primary" onClick={() => setGame(emptyRound(players))} data-testid="undercover-button-replay"><RotateCcw size={16} />جولة جديدة</button><Link href="/" className="btn btn-outline" data-testid="undercover-link-home"><HomeIcon size={16} />العودة للألعاب</Link></div></>}
    </div>}
    {players.length >= 2 && game.stage !== 'summary' && <div className="notice undercover-notice"><strong>الخصوصية:</strong> تُعرض الأدوار فردياً، وتبقى الكلمة مخفية حتى نهاية التخمين.</div>}
  </main>;
}
