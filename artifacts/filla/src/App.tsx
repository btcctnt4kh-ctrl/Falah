import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { ArrowRight, Check, ChevronLeft, CircleHelp, Home as HomeIcon, Pencil, Plus, RotateCcw, Sparkles, Trash2, Users, WandSparkles } from 'lucide-react';
import Undercover from './Undercover';
const STORE_KEY = 'filla-players-v1';
const defaultPlayers: string[] = [];

const questionPool = [
  { category: 'ذكريات', text: 'ما الشيء الصغير الذي يسعدك مهما كان يومك؟' },
  { category: 'ذكريات', text: 'ما أجمل مغامرة عشتها مع أصدقائك؟' },
  { category: 'ذكريات', text: 'أي لعبة كنت تحبها عندما كنت صغيراً؟' },
  { category: 'تفضيلات', text: 'لو أمكنك السفر الآن إلى أي مكان، أين تذهب؟' },
  { category: 'تفضيلات', text: 'ما الوجبة التي تستطيع تناولها كل أسبوع دون ملل؟' },
  { category: 'تفضيلات', text: 'هل تفضل صباحاً هادئاً أم سهرة طويلة؟ ولماذا؟' },
  { category: 'خيال', text: 'لو امتلكت قدرة خارقة ليوم واحد، ماذا ستختار؟' },
  { category: 'خيال', text: 'لو فتحت مقهى، ماذا سيكون اسمه وما تخصصه؟' },
  { category: 'خيال', text: 'أي شخصية خيالية تود دعوتها إلى العشاء؟' },
  { category: 'عن الأصدقاء', text: 'ما الصفة التي تقدرها أكثر في الشخص الجالس على يمينك؟' },
  { category: 'عن الأصدقاء', text: 'ما موقف مضحك ما زلت تذكره من جلسة سابقة؟' },
  { category: 'عن الأصدقاء', text: 'من بين المجموعة، من الأكثر احتمالاً أن يخطط لرحلة مفاجئة؟' },
  { category: 'تحدي لطيف', text: 'صف مزاجك اليوم بعنوان فيلم.' },
  { category: 'تحدي لطيف', text: 'ما مهارة تتمنى أن تتعلمها هذا العام؟' },
  { category: 'تحدي لطيف', text: 'اختر أغنية تصف أجواء هذه الجلسة.' },
  { category: 'اختيارات', text: 'كتاب أم فيلم؟ وما آخر شيء استمتعت به؟' },
  { category: 'اختيارات', text: 'بحر أم جبل؟ احكِ لنا عن يوم مثالي هناك.' },
  { category: 'اختيارات', text: 'تخطط لكل شيء أم تترك مساحة للمفاجآت؟' },
  { category: 'يوميات', text: 'ما أفضل نصيحة وصلتك وبقيت معك؟' },
  { category: 'يوميات', text: 'ما شيء جديد اكتشفته مؤخراً وأعجبك؟' },
  { category: 'يوميات', text: 'ما أكثر شيء تتطلع إليه في الأيام القادمة؟' },
  { category: 'خيال', text: 'لو أمكنك إتقان لغة جديدة فوراً، أي لغة تختار؟' },
  { category: 'عن الأصدقاء', text: 'ما الشيء الذي يجعل الجلسة مع الأصدقاء مميزة؟' },
  { category: 'ذكريات', text: 'ما هدية بسيطة أسعدتك كثيراً؟' },
  { category: 'تفضيلات', text: 'ما رائحتك المفضلة التي تعيدك إلى ذكرى جميلة؟' },
  { category: 'اختيارات', text: 'تفضل رحلة عفوية أم جدولاً مرتباً؟' },
  { category: 'يوميات', text: 'ما عادة جميلة تود إضافتها إلى يومك؟' },
  { category: 'خيال', text: 'لو صممت عطلة مثالية للمجموعة، كيف ستكون؟' },
  { category: 'تحدي لطيف', text: 'اقترح على المجموعة اسماً طريفاً لفريقكم.' },
  { category: 'ذكريات', text: 'متى ضحكت من قلبك آخر مرة؟' },
  { category: 'عن الأصدقاء', text: 'ما صفة مشتركة تلاحظها بين أفراد المجموعة؟' },
  { category: 'تفضيلات', text: 'ما أفضل وقت في اليوم بالنسبة لك؟' },
  { category: 'يوميات', text: 'ما إنجاز صغير أنت فخور به هذا الأسبوع؟' },
  { category: 'اختيارات', text: 'موسيقى هادئة أم أجواء صاخبة في الطريق؟' },
  { category: 'خيال', text: 'لو اخترعت عطلة جديدة، ماذا سنحتفل بها؟' },
  { category: 'ذكريات', text: 'ما مكان زرته وتتمنى أن تعود إليه؟' },
  { category: 'تفضيلات', text: 'أي موسم من السنة يشبه شخصيتك؟' },
  { category: 'عن الأصدقاء', text: 'ما النشاط الذي يجمعكم وتودون تكراره؟' },
  { category: 'يوميات', text: 'ما شيء تتمنى أن يكون لديك وقت أطول له؟' },
  { category: 'تحدي لطيف', text: 'شاركنا حقيقة لطيفة عنك قد لا يعرفها الجميع.' },
];

const challengePool = [
  'قلّد مذيعاً يعلن عن وجبتك المفضلة.',
  'صف يومك بثلاث كلمات، ودع المجموعة تخمّن التفاصيل.',
  'اختر شخصاً وامدح فيه شيئاً محدداً ولطيفاً.',
  'ارسم في الهواء شكلاً وعلى المجموعة أن تخمّنه.',
  'قل جملة ترحيب وكأنك تستقبل ضيوفاً في قصر.',
  'ابتكر اسماً لفريقكم وحركة احتفال بسيطة.',
  'احكِ قصة قصيرة من ثلاثة أسطر عن غرض قريب منك.',
  'اذكر ثلاثة أشياء تحبها تبدأ بالحرف نفسه.',
  'مثّل مهنة بحركات صامتة حتى تخمّنها المجموعة.',
  'اختر كلمة إيجابية تصف كل شخص حولك.',
  'تحدث عن هواية تحبها لمدة عشرين ثانية.',
  'اختر عنواناً طريفاً لهذه الجلسة.',
  'قل بيتاً أو عبارة جميلة تحفظها.',
  'تخيل أنك دليل سياحي: صف المكان الذي تجلسون فيه.',
  'اختر صوتاً طبيعياً ودع المجموعة تخمّنه.',
  'اقترح نزهة ممتعة تناسب المجموعة.',
  'ابتكر تحية جديدة للمجموعة، من دون لمس أحد.',
  'صف وجبتك المفضلة من دون ذكر اسمها.',
  'اذكر شيئاً تعلمته من شخص قريب منك.',
  'قل جملة عادية وكأنك في مشهد درامي هادئ.',
  'اختر لوناً واذكر ثلاثة أشياء جميلة تذكرك به.',
  'اصنع لغزاً بسيطاً عن شيء في الغرفة.',
  'تخيل أنك تكتب بطاقة شكر لشخص هنا؛ ماذا تقول؟',
  'اقترح اسم كتاب عن مغامرات هذه المجموعة.',
  'شارك نصيحة لطيفة تتمنى لو عرفتها مبكراً.',
  'قل كلمة تحب وقعها، ثم اشرح السبب.',
  'اختر شخصاً ليطرح عليك سؤالاً ممتعاً.',
  'صف عطلة أحلامك في عشر كلمات.',
  'اذكر شيئاً صغيراً يجعل يومك أفضل.',
  'تحدث بلهجة مذيع نشرة عن أخبار الجلسة.',
  'اختر شيئاً قريباً واخترع له استخداماً خيالياً.',
  'قل اسم مدينة تحبها وسبباً واحداً لزيارتها.',
  'مثّل طقساً من فصول السنة بحركات بسيطة.',
  'اقترح تحدياً آمناً ولطيفاً للجولة القادمة.',
  'احكِ ذكرى جميلة في جملة واحدة.',
];

function secureIndex(length: number) {
  if (length < 2) return 0;
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const limit = Math.floor(0x100000000 / length) * length;
    const sample = new Uint32Array(1);
    do cryptoObject.getRandomValues(sample); while (sample[0] >= limit);
    return sample[0] % length;
  }
  return Math.floor(Math.random() * length);
}

function playTone(kind: 'tick' | 'land' | 'tap' = 'tap') {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'land' ? 660 : kind === 'tick' ? 330 : 500;
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === 'land' ? .12 : .045, context.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + (kind === 'land' ? .32 : .09));
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .34);
    oscillator.onended = () => void context.close();
  } catch { /* Audio is a pleasant enhancement, never a requirement. */ }
}

function usePlayers() {
  const [players, setPlayers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((name) => typeof name === 'string')) return parsed;
      }
    } catch { /* Recover cleanly from unavailable or malformed local storage. */ }
    return defaultPlayers;
  });
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(players)); } catch { /* Keep the in-memory game usable. */ }
  }, [players]);
  return [players, setPlayers] as const;
}

function Header() {
  const [path] = useLocation();
  return <header className="topbar">
    <Link href="/" className="brand" data-testid="link-home-logo">
      <img src="/filla-logo.jpeg" alt="شعار فِلّة" />
      <span><span className="brand-word">فِلّة</span><span className="brand-caption" style={{ display: 'block' }}>اللعب أحلى مع بعض</span></span>
    </Link>
    <nav className="nav-links" aria-label="التنقل الرئيسي">
      <Link href="/" className={`nav-link ${path === '/' ? 'active' : ''}`} data-testid="link-nav-home"><HomeIcon size={16} />الرئيسية</Link>
      <Link href="/questions" className={`nav-link ${path === '/questions' ? 'active' : ''}`} data-testid="link-nav-questions"><CircleHelp size={16} />أسئلة</Link>
      <Link href="/challenges" className={`nav-link ${path === '/challenges' ? 'active' : ''}`} data-testid="link-nav-challenges"><Sparkles size={16} />تحديات</Link>
      <Link href="/undercover" className={`nav-link ${path === '/undercover' ? 'active' : ''}`} data-testid="link-nav-undercover"><Users size={16} />برا السالفة</Link>
    </nav>
  </header>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="shell" dir="rtl"><div className="page"><Header />{children}<div className="footer-note" data-testid="text-footer">فِلّة · جلسة تجمعكم، وضحكة تبقى معكم</div></div></div>;
}

function Home({ players, setPlayers }: { players: string[]; setPlayers: (players: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [error, setError] = useState('');
  function addPlayer(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (players.some((player) => player.toLocaleLowerCase() === name.toLocaleLowerCase())) { setError('هذا الاسم موجود بالفعل، جرّب اسماً آخر.'); return; }
    setPlayers([...players, name]); setDraft(''); setError('');
  }
  function saveEdit(index: number) {
    const name = editDraft.trim();
    if (!name) { setError('اكتب اسماً قبل الحفظ.'); return; }
    if (players.some((player, i) => i !== index && player.toLocaleLowerCase() === name.toLocaleLowerCase())) { setError('هذا الاسم موجود بالفعل.'); return; }
    setPlayers(players.map((player, i) => i === index ? name : player)); setEditing(null); setError('');
  }
  return <main className="main">
    <section className="hero">
      <div>
        <div className="eyebrow">مساحة صغيرة لضحكة كبيرة</div>
        <h1>اللعب أحلى<br />لما نكون <em>فِلّة.</em></h1>
        <p className="hero-copy">جهّزوا الجلسة، اختاروا اللعبة، وخلو الباقي علينا.<br />أسئلة تكشف الحكايات، وتحديات تصنع ذكريات.</p>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="spark one"><Sparkles size={17} /></div><div className="spark two"><WandSparkles size={16} /></div><div className="spark three" /><img className="art-logo" src="/filla-logo.jpeg" alt="" /></div>
    </section>
    <section aria-labelledby="players-heading">
      <div className="section-heading"><div><h2 id="players-heading">مين معنا اليوم؟</h2><p>أضيفوا أسماء اللاعبين، وفِلّة تتكفّل بالباقي.</p></div><span className="roster-count" data-testid="text-player-count">{players.length} {players.length === 1 ? 'لاعب' : 'لاعبين'}</span></div>
      <div className="roster-card">
        <div className="roster-top"><strong style={{ fontSize: 13 }}>قائمة الجلسة</strong><span className="roster-count">الأسماء محفوظة على هذا الجهاز</span></div>
        {players.length === 0 ? <div className="secret-box" data-testid="empty-players"><strong style={{ fontSize: 18 }}>الجلسة بانتظاركم</strong><span className="secret-muted">أضيفوا اسمين على الأقل للبدء بألعاب فِلّة.</span></div> :
          <div className="roster-list" data-testid="list-players">{players.map((name, index) => <div className="player-row" key={`${name}-${index}`} data-testid={`row-player-${index}`}>
            <span className="player-avatar">{name.trim().slice(0, 1)}</span>
            {editing === index ? <input className="field" value={editDraft} onChange={(event) => setEditDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveEdit(index); if (event.key === 'Escape') setEditing(null); }} aria-label={`تعديل اسم ${name}`} data-testid={`input-edit-player-${index}`} autoFocus /> : <span className="player-name" data-testid={`text-player-${index}`}>{name}</span>}
            {editing === index ? <button className="icon-button" aria-label="حفظ الاسم" data-testid={`button-save-player-${index}`} onClick={() => saveEdit(index)}><Check size={17} /></button> : <button className="icon-button" aria-label={`تعديل ${name}`} data-testid={`button-edit-player-${index}`} onClick={() => { setEditing(index); setEditDraft(name); setError(''); }}><Pencil size={16} /></button>}
            <button className="icon-button delete" aria-label={`حذف ${name}`} data-testid={`button-delete-player-${index}`} onClick={() => { setPlayers(players.filter((_, i) => i !== index)); if (editing === index) setEditing(null); }}><Trash2 size={16} /></button>
          </div>)}</div>}
        <form className="add-row" onSubmit={addPlayer}><input className="field" placeholder="اكتبوا اسم لاعب جديد..." value={draft} onChange={(event) => { setDraft(event.target.value); setError(''); }} aria-label="اسم لاعب جديد" data-testid="input-player-name" maxLength={32} /><button className="btn btn-primary" type="submit" data-testid="button-add-player"><Plus size={17} /><span>إضافة</span></button></form>
        {error && <div className="error-note" role="alert" data-testid="status-roster-error">{error}</div>}
      </div>
      <div className="section-heading" style={{ marginTop: 29 }}><div><h2>اختاروا لعبتكم</h2><p>ثلاث طرق مختلفة لصناعة جلسة ما تنسى.</p></div></div>
      <div className="game-grid">
        <Link href="/questions" className="game-card" data-testid="card-game-questions"><ChevronLeft className="game-arrow" size={18} /><span className="game-icon"><CircleHelp size={22} /></span><h3>سؤال على الطاير</h3><p>أسئلة خفيفة وعميقة تفتح سوالف حلوة.</p></Link>
        <Link href="/challenges" className="game-card" data-testid="card-game-challenges"><ChevronLeft className="game-arrow" size={18} /><span className="game-icon"><Sparkles size={22} /></span><h3>تحديات لطيفة</h3><p>حركات وكلمات بسيطة، والضحكة مضمونة.</p></Link>
        <Link href="/undercover" className="game-card" data-testid="card-game-undercover"><ChevronLeft className="game-arrow" size={18} /><span className="game-icon"><Users size={22} /></span><h3>برا السالفة</h3><p>كلمة سرية واحدة، وشخص واحد يحاول يواكب.</p></Link>
      </div>
      <div className="game-banner"><span><strong>جاهزين؟</strong> الألعاب تحتاج لاعبين على الأقل، وبرا السالفة تحتاج ثلاثة.</span><span>{players.length >= 3 ? 'الجلسة جاهزة للانطلاق' : players.length === 2 ? 'سؤال وتحديات جاهزة؛ أضيفوا لاعباً ثالثاً لبرا السالفة' : 'أضيفوا لاعباً آخر للبدء'}</span></div>
    </section>
  </main>;
}

function GameHeading({ title, subtitle, number }: { title: string; subtitle: string; number: string }) {
  return <div className="game-title"><div className="eyebrow">لعبة رقم {number}</div><h1>{title}</h1><p>{subtitle}</p></div>;
}

function GameFrame({ title, subtitle, number, children }: { title: string; subtitle: string; number: string; children: ReactNode }) {
  return <main className="main"><div className="game-header"><Link href="/" className="back-link" data-testid="link-back-home"><ArrowRight size={17} />للرئيسية</Link><GameHeading title={title} subtitle={subtitle} number={number} /><span style={{ width: 90 }} /></div>{children}</main>;
}

function PlayerPicker({ players, onPicked, testPrefix }: { players: string[]; onPicked: (name: string) => void; testPrefix: string }) {
  const [rolling, setRolling] = useState(false);
  const [shown, setShown] = useState('');
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);
  function roll() {
    if (rolling || players.length < 2) return;
    setRolling(true); let ticks = 0; const finalIndex = secureIndex(players.length); let lastIndex = -1;
    const tick = () => {
      let next = secureIndex(players.length);
      if (players.length > 1 && next === lastIndex) next = (next + 1) % players.length;
      lastIndex = next; setShown(players[next]); playTone('tick'); ticks += 1;
      if (ticks >= 20) {
        const winner = players[finalIndex]; setShown(winner); setRolling(false); playTone('land'); onPicked(winner); return;
      }
      timerRef.current = window.setTimeout(tick, 48 + ticks * 11);
    };
    tick();
  }
  return <div className="game-panel" data-testid={`${testPrefix}-picker`}>
    <div className="panel-label">مين عليه الدور؟</div>
    <div className="player-slot" aria-live="polite"><span className={`slot-name ${rolling ? 'is-rolling' : ''}`} data-testid={`${testPrefix}-selected-player`}>{shown || 'اسم اللاعب يظهر هنا'}</span></div>
    <p className="panel-instruction">{rolling ? 'لحظة... فِلّة تختار!' : 'خلّوا فِلّة تختار لاعباً عشوائياً'}</p>
    <button className="btn btn-primary" onClick={roll} disabled={rolling || players.length < 2} data-testid={`${testPrefix}-button-roll`}><Sparkles size={16} />اختيار اللاعب</button>
  </div>;
}

function PlayerRequirement({ players }: { players: string[] }) {
  return <div className="game-panel" data-testid="state-needs-players"><div className="game-icon" style={{ margin: '0 auto 16px' }}><Users size={22} /></div><h2 style={{ fontSize: 20, marginBottom: 8 }}>{players.length === 0 ? 'الجلسة فاضية!' : 'نحتاج لاعباً إضافياً'}</h2><p className="secret-muted">أضيفوا اسمين على الأقل عشان تبدأ اللعبة. أسماءكم محفوظة على الجهاز.</p><Link href="/" className="btn btn-primary" data-testid="link-add-players"><ArrowRight size={16} />إضافة اللاعبين</Link></div>;
}

function Questions({ players }: { players: string[] }) {
  const [player, setPlayer] = useState('');
  const [question, setQuestion] = useState<(typeof questionPool)[number] | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [turn, setTurn] = useState(1);
  function nextQuestion() {
    const candidates = questionPool.filter((item) => !seen.includes(item.text));
    const pool = candidates.length ? candidates : questionPool;
    const selected = pool[secureIndex(pool.length)];
    setQuestion(selected); setSeen((old) => [...(candidates.length ? old : []), selected.text]); playTone('tap');
  }
  function selectPlayer(name: string) { setPlayer(name); nextQuestion(); }
  return <GameFrame title="سؤال على الطاير" subtitle="سؤال واحد يفتح حكاية كاملة." number="١">
    {players.length < 2 ? <PlayerRequirement players={players} /> : !player ? <PlayerPicker players={players} onPicked={selectPlayer} testPrefix="questions" /> :
      <div className="game-panel" data-testid="questions-turn">
        <div className="panel-label">الجولة {turn}</div><div className="player-slot" style={{ height: 61 }}><span className="slot-name" data-testid="questions-current-player">{player}</span></div>
        {question && <><div className="question-card" aria-live="polite" data-testid="questions-content"><div className="question-category">{question.category}</div><p className="question-text">{question.text}</p></div><div className="action-row"><button className="btn btn-primary" onClick={() => { setPlayer(''); setQuestion(null); setTurn((old) => old + 1); }} data-testid="questions-button-answered"><Check size={16} />جاوبنا، التالي</button><button className="btn btn-soft" onClick={nextQuestion} data-testid="questions-button-skip"><RotateCcw size={16} />تخطّي السؤال</button></div><p className="panel-instruction" style={{ margin: '15px 0 0' }}>التخطّي يبدّل السؤال ويبقي الدور مع {player}.</p></>}
      </div>}
  </GameFrame>;
}

function Challenges({ players }: { players: string[] }) {
  const [player, setPlayer] = useState('');
  const [challenge, setChallenge] = useState('');
  const [seen, setSeen] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  function nextChallenge() {
    const alternatives = challengePool.filter((item) => !seen.includes(item));
    const pool = alternatives.length ? alternatives : challengePool;
    const next = pool[secureIndex(pool.length)]; setChallenge(next); setSeen((old) => [...(alternatives.length ? old : []), next]); playTone('tap');
  }
  function selectPlayer(name: string) { setPlayer(name); nextChallenge(); }
  return <GameFrame title="تحديات لطيفة" subtitle="كلها خفيفة، والهدف ننبسط سوا." number="٢">
    {players.length < 2 ? <PlayerRequirement players={players} /> : !player ? <PlayerPicker players={players} onPicked={selectPlayer} testPrefix="challenges" /> :
      <div className="game-panel" data-testid="challenges-turn"><div className="panel-label">التحدي {round}</div><div className="player-slot" style={{ height: 61 }}><span className="slot-name" data-testid="challenges-current-player">{player}</span></div>
        {challenge && <><div className="question-card" aria-live="polite" data-testid="challenges-content"><div className="question-category">على راحتك · تحدٍ آمن</div><p className="question-text">{challenge}</p></div><div className="action-row"><button className="btn btn-primary" onClick={() => { setPlayer(''); setChallenge(''); setRound((old) => old + 1); }} data-testid="challenges-button-done"><Check size={16} />تم، التالي</button><button className="btn btn-soft" onClick={nextChallenge} data-testid="challenges-button-another"><RotateCcw size={16} />تحدٍ آخر</button></div><p className="panel-instruction" style={{ margin: '15px 0 0' }}>التحدي الآخر يبقى مع {player}.</p></>}
      </div>}
  </GameFrame>;
}

function NotFound() {
  return <main className="main"><div className="game-panel"><h1>الصفحة غير موجودة</h1><p className="secret-muted">يبدو أنكم خرجتم من أجواء اللعبة.</p><Link href="/" className="btn btn-primary" data-testid="link-not-found-home"><ArrowRight size={16} />العودة للرئيسية</Link></div></main>;
}

function App() {
  const [players, setPlayers] = usePlayers();
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return <Shell><Switch>
    <Route path="/"><Home players={players} setPlayers={setPlayers} /></Route>
    <Route path="/questions"><Questions players={players} /></Route>
    <Route path="/challenges"><Challenges players={players} /></Route>
    <Route path="/undercover"><Undercover players={players} /></Route>
    <Route><NotFound /></Route>
  </Switch></Shell>;
}

export default App;
