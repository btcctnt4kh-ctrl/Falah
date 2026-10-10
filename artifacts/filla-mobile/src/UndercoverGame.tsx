import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, BrandHeader, Label, Notice, PageShell, Panel, Title } from '@/src/ui';
import { useColors } from '@/hooks/useColors';
import {
  CATEGORIES,
  chooseTieWinner,
  guessIsCorrect,
  isOutsider,
  makeAnswerOptions,
  makeAskSchedule,
  makeReplayState,
  tallyVotes,
  validRoundState,
  type AskTurn,
  type UndercoverCategory,
  type Vote,
} from './undercover-rules.mjs';

type Stage =
  | 'choose' | 'reveal' | 'pass' | 'ready' | 'asking' | 'ballot-ready'
  | 'ballot' | 'runoff' | 'ballot-pass' | 'reveal-result'
  | 'guess-pass' | 'guess' | 'summary';
type RoundState = {
  stage: Stage;
  rosterHash: string;
  category?: UndercoverCategory;
  secret?: string;
  outsider?: number;
  index: number;
  shown: boolean;
  schedule: AskTurn[];
  turn: number;
  votes: Vote[];
  runoffCandidates: number[];
  ballotKind?: 'ballot' | 'runoff';
  guess?: string;
  guessCorrect?: boolean;
  resolutionNote?: string;
};

const ROUND_KEY = 'filla-mobile-undercover-round-v1';
const randomIndex = (length: number) => Math.floor(Math.random() * length);
const rosterIndexes = (players: string[]) => players.map((_, index) => index);

export default function UndercoverGame({
  players,
  onBack,
}: {
  players: string[];
  onBack: () => void;
}) {
  const colors = useColors();
  const [round, setRound] = useState<RoundState>(() => makeReplayState(players) as RoundState);
  const [ready, setReady] = useState(false);
  const [voteError, setVoteError] = useState('');
  const answerOptions = useMemo(
    () => round.category && round.secret ? makeAnswerOptions(round.category, round.secret) : [],
    [round.category, round.secret],
  );

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ROUND_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (validRoundState(parsed, players)) {
              const restored = parsed as RoundState;
              setRound({
                ...restored,
                shown: false,
                stage: restored.stage === 'guess' ? 'guess-pass' : restored.stage,
              });
              setReady(true);
              return;
            }
          } catch {
            // An unreadable or stale local round should not block a new game.
          }
        }
        setRound(makeReplayState(players) as RoundState);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setRound(makeReplayState(players) as RoundState);
          setReady(true);
        }
      });
    return () => { active = false; };
  }, [players]);

  useEffect(() => {
    if (!ready) return;
    if (round.rosterHash !== JSON.stringify(players)) {
      setRound(makeReplayState(players) as RoundState);
      setVoteError('');
      return;
    }
    void AsyncStorage.setItem(ROUND_KEY, JSON.stringify({ ...round, shown: false })).catch(() => undefined);
  }, [round, ready, players]);

  function update(next: Partial<RoundState>) {
    setRound((current) => ({ ...current, ...next }));
  }

  function startRound(category: UndercoverCategory) {
    const words = CATEGORIES[category];
    setRound({
      ...(makeReplayState(players) as RoundState),
      stage: 'reveal',
      category,
      secret: words[randomIndex(words.length)],
      outsider: randomIndex(players.length),
      schedule: makeAskSchedule(players.length),
      index: 0,
      turn: 0,
    });
    setVoteError('');
  }

  function resolveBallot(votes: Vote[], kind: 'ballot' | 'runoff') {
    const candidates = kind === 'runoff' ? round.runoffCandidates : rosterIndexes(players);
    const result = tallyVotes(votes, rosterIndexes(players), candidates);
    if (result.leaders.length === 1) {
      update({ stage: 'reveal-result', votes, resolutionNote: '' });
    } else if (kind === 'ballot') {
      update({ stage: 'ballot-ready', index: 0, votes: [], runoffCandidates: result.leaders, ballotKind: 'runoff' });
    } else {
      const selected = chooseTieWinner(result.leaders);
      const resolved = selected ?? result.leaders[0];
      update({
        stage: 'reveal-result',
        votes,
        resolutionNote: `استمر التعادل بعد جولة الإعادة؛ حُسم الاختيار عشوائياً بين المتعادلين. ${players[resolved]} هو اختيار التصويت.`,
      });
    }
  }

  function castVote(candidate: number) {
    const kind = round.stage === 'runoff' ? 'runoff' : 'ballot';
    const eligible = kind === 'runoff' ? round.runoffCandidates : rosterIndexes(players);
    if (!eligible.includes(candidate) || candidate === round.index ||
      round.votes.some((vote) => vote.voter === round.index)) {
      setVoteError('هذا الاختيار غير متاح؛ لكل لاعب صوت واحد ولا يصوّت لنفسه.');
      return;
    }
    update({
      stage: 'ballot-pass',
      votes: [...round.votes, { voter: round.index, candidate }],
      ballotKind: kind,
    });
    setVoteError('');
  }

  function nextBallotPlayer() {
    const kind = round.ballotKind ?? 'ballot';
    if (round.index + 1 < players.length) {
      update({ stage: 'ballot-ready', index: round.index + 1 });
    } else {
      resolveBallot(round.votes, kind);
    }
  }

  function submitGuess(word: string) {
    if (round.guess !== undefined || round.outsider === undefined || !round.secret) return;
    update({ stage: 'summary', guess: word, guessCorrect: guessIsCorrect(word, round.secret) });
  }

  const currentTurn = round.schedule[round.turn];
  const ballotKind = round.ballotKind ?? 'ballot';
  const ballotChoices = ballotKind === 'runoff' ? round.runoffCandidates : rosterIndexes(players);

  return (
    <PageShell>
      <BrandHeader subtitle="برا السالفة" onBack={onBack} />
      <Title subtitle="كلمة واحدة للجميع... إلا لشخص بينهم.">برا السالفة</Title>
      {players.length < 2 ? (
        <Panel>
          <Label>تحتاج اللعبة إلى لاعبين اثنين على الأقل</Label>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            أضيفوا أسماء اللاعبين من الصفحة الرئيسية، ثم عودوا لبدء الجولة.
          </Text>
          <AppButton label="العودة وإضافة اللاعبين" onPress={onBack} testID="undercover-add-players" />
        </Panel>
      ) : !ready ? (
        <Panel><Text style={[styles.body, { color: colors.mutedForeground }]}>لحظة ونجهّز الجولة...</Text></Panel>
      ) : (
        <Panel>
          {round.stage === 'choose' && (
            <>
              <Label>١ · اختاروا التصنيف</Label>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                مرّروا الهاتف لكل لاعب، ثم اسألوا بعضكم شفهياً.
              </Text>
              <View style={styles.choiceGrid}>
                {(Object.keys(CATEGORIES) as UndercoverCategory[]).map((category, index) => (
                  <AppButton
                    key={category}
                    label={`${['٠١', '٠٢', '٠٣'][index]}  ${category}`}
                    onPress={() => startRound(category)}
                    variant="soft"
                    testID={`undercover-category-${index}`}
                  />
                ))}
              </View>
            </>
          )}

          {round.stage === 'reveal' && (
            <>
              <View style={styles.progressRow}>
                {players.map((player, index) => (
                  <View
                    key={`${player}-${index}`}
                    style={[styles.progressDot, { backgroundColor: index <= round.index ? colors.primary : colors.border }]}
                  />
                ))}
              </View>
              <Label>اللاعب {round.index + 1} من {players.length}</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>مرّروا الهاتف إلى</Text>
              <View style={[styles.nameTile, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.name, { color: colors.primary }]} testID="undercover-current-player">
                  {players[round.index]}
                </Text>
              </View>
              {!round.shown ? (
                <>
                  <Text style={[styles.body, { color: colors.mutedForeground }]}>
                    تأكدوا أن الشاشة لكم وحدكم قبل الكشف.
                  </Text>
                  <AppButton label={`أنا ${players[round.index]} · اكشف دوري`} onPress={() => update({ shown: true })} testID="undercover-button-reveal" />
                </>
              ) : (
                <>
                  <View style={[styles.secretBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Label>{isOutsider(round.index, round.outsider!) ? 'أنت برا السالفة' : 'أنت من السالفة'}</Label>
                    <Text style={[styles.secret, { color: colors.foreground }]}>
                      {isOutsider(round.index, round.outsider!) ? 'لا تعرف الكلمة' : round.secret}
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                      {isOutsider(round.index, round.outsider!)
                        ? 'اسمع التلميحات وحاول تواكبهم.'
                        : 'تذكّر الكلمة ولا تكشفها مباشرة.'}
                    </Text>
                  </View>
                  <AppButton label="إخفاء وتمرير الهاتف" onPress={() => update({ stage: 'pass', shown: false })} variant="soft" testID="undercover-button-hide" />
                </>
              )}
            </>
          )}

          {round.stage === 'pass' && (
            <>
              <Label>مرّروا الهاتف بأمان</Label>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>أعطوا الهاتف للاعب التالي فقط، من دون كشف الشاشة.</Text>
              <AppButton
                label={round.index + 1 < players.length ? 'تم، اللاعب التالي' : 'اكتملت التوزيعة'}
                onPress={() => update(round.index + 1 < players.length
                  ? { stage: 'reveal', index: round.index + 1 }
                  : { stage: 'ready', index: 0 })}
                testID="undercover-button-pass"
              />
            </>
          )}

          {round.stage === 'ready' && (
            <>
              <Label>اكتملت التوزيعة</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>وقت الأسئلة</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                تبادلوا الأسئلة شفهياً. كل لاعب يسأل ثلاث مرات، ولا يظهر هنا أي دور أو كلمة.
              </Text>
              <AppButton label="ابدأوا الأسئلة" onPress={() => update({ stage: 'asking', turn: 0 })} testID="undercover-button-start" />
            </>
          )}

          {round.stage === 'asking' && currentTurn && (
            <>
              <Label>السؤال {round.turn + 1} من {round.schedule.length}</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>وقت الأسئلة</Text>
              <View style={styles.turnPair}>
                <View><Text style={[styles.small, { color: colors.mutedForeground }]}>السائل</Text><Text style={[styles.name, { color: colors.foreground }]}>{players[currentTurn.asker]}</Text></View>
                <Text style={[styles.arrow, { color: colors.primary }]}>←</Text>
                <View><Text style={[styles.small, { color: colors.mutedForeground }]}>المجيب</Text><Text style={[styles.name, { color: colors.foreground }]}>{players[currentTurn.respondent]}</Text></View>
              </View>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>اسألوا وأجيبوا شفهياً؛ لا حاجة لكتابة السؤال.</Text>
              <AppButton
                label={round.turn + 1 < round.schedule.length ? 'السؤال التالي' : 'انتهت الأسئلة · التصويت'}
                onPress={() => update(round.turn + 1 < round.schedule.length
                  ? { turn: round.turn + 1 }
                  : { stage: 'ballot-ready', index: 0, votes: [], ballotKind: 'ballot' })}
                testID="undercover-button-next-question"
              />
            </>
          )}

          {round.stage === 'ballot-ready' && (
            <>
              <Label>{ballotKind === 'runoff' ? 'جولة إعادة · تعادل في الأصوات' : 'التصويت السري'}</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>
                {ballotKind === 'runoff' ? 'من بين المتعادلين؟' : 'من تتوقع أنه برا السالفة؟'}
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                مرّروا الهاتف إلى {players[round.index]} وحده. لا تظهر الأصوات السابقة.
              </Text>
              <AppButton label={`أنا ${players[round.index]} · ابدأ التصويت`} onPress={() => update({ stage: ballotKind })} testID="undercover-button-own-ballot" />
              <Label>الصوت {round.index + 1} من {players.length}</Label>
            </>
          )}

          {(round.stage === 'ballot' || round.stage === 'runoff') && (
            <>
              <Label>{round.stage === 'runoff' ? 'جولة إعادة · تعادل في الأصوات' : 'التصويت السري'}</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>
                {round.stage === 'runoff' ? 'من بين المتعادلين؟' : 'من تتوقع أنه برا السالفة؟'}
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>اختَر مرشحاً واحداً. لا تظهر الأصوات السابقة.</Text>
              <View style={styles.voteGrid}>
                {ballotChoices.filter((candidate) => candidate !== round.index).map((candidate) => (
                  <AppButton
                    key={candidate}
                    label={`${players[candidate]}`}
                    onPress={() => castVote(candidate)}
                    variant="soft"
                    testID={`undercover-vote-${round.index}-${candidate}`}
                  />
                ))}
              </View>
              {voteError ? <Notice error>{voteError}</Notice> : null}
              <Label>الصوت {round.index + 1} من {players.length}</Label>
            </>
          )}

          {round.stage === 'ballot-pass' && (
            <>
              <Label>تم حفظ الصوت بسرية</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>مرّروا الهاتف</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>لا تعرضوا الاختيار للاعب التالي. سيصوّت كل شخص مرة واحدة.</Text>
              <AppButton
                label={round.index + 1 < players.length ? `التالي · ${players[round.index + 1]}` : 'إنهاء التصويت'}
                onPress={nextBallotPlayer}
                testID="undercover-button-next-voter"
              />
            </>
          )}

          {round.stage === 'reveal-result' && (
            <>
              <Label>لحظة الكشف</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>الشخص الذي كان برا السالفة هو...</Text>
              <View style={[styles.nameTile, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.name, { color: colors.primary }]} testID="undercover-revealed-player">
                  {players[round.outsider!]}
                </Text>
              </View>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>التوزيعة الأصلية محفوظة؛ هذه هي هوية المتخفي الحقيقية.</Text>
              {round.resolutionNote ? <Notice>{round.resolutionNote}</Notice> : null}
              <AppButton label="فرصة أخيرة للتخمين" onPress={() => update({ stage: 'guess-pass' })} testID="undercover-button-guess-pass" />
            </>
          )}

          {round.stage === 'guess-pass' && (
            <>
              <Label>الآن دور المتخفي فقط</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>{players[round.outsider!]} لديه فرصة أخيرة</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>مرّروا الهاتف إلى اللاعب الظاهر أعلاه. لا تكشفوا قائمة الكلمات لبقية المجموعة.</Text>
              <AppButton label="أنا المتخفي · أريد التخمين" onPress={() => update({ stage: 'guess' })} testID="undercover-button-guess-start" />
            </>
          )}

          {round.stage === 'guess' && (
            <>
              <Label>تخمين خاص · {round.category}</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>اختر كلمة واحدة</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>هذه الخيارات لك وحدك. اختر أفضل تخمينك؛ لن يمكن تغييره.</Text>
              <View style={styles.voteGrid}>
                {answerOptions.map((word) => (
                  <AppButton key={word} label={word} variant="soft" onPress={() => submitGuess(word)} testID={`undercover-answer-${word}`} />
                ))}
              </View>
            </>
          )}

          {round.stage === 'summary' && (
            <>
              <Label>{round.guessCorrect ? 'صح!' : 'خطأ!'}</Label>
              <Text style={[styles.heading, { color: colors.foreground }]}>ملخص الجولة</Text>
              <View style={[styles.secretBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>برا السالفة</Text>
                <Text style={[styles.name, { color: colors.foreground }]}>{players[round.outsider!]}</Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>الكلمة السرية</Text>
                <Text style={[styles.name, { color: colors.foreground }]}>{round.secret}</Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>تخمين المتخفي</Text>
                <Text style={[styles.name, { color: colors.foreground }]}>{round.guess}</Text>
              </View>
              <AppButton label="جولة جديدة" onPress={() => setRound(makeReplayState(players) as RoundState)} testID="undercover-button-replay" />
              <AppButton label="العودة للألعاب" variant="outline" onPress={onBack} testID="undercover-link-home" />
            </>
          )}
        </Panel>
      )}
      {players.length >= 2 && round.stage !== 'summary' ? (
        <Notice><Text style={styles.bold}>الخصوصية:</Text> تُعرض الأدوار فردياً، وتبقى الكلمة مخفية حتى نهاية التخمين.</Notice>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: 'Alexandria_400Regular', fontSize: 12, lineHeight: 24, textAlign: 'right' },
  heading: { fontFamily: 'Alexandria_700Bold', fontSize: 18, lineHeight: 30, textAlign: 'center' },
  name: { fontFamily: 'Alexandria_700Bold', fontSize: 20, textAlign: 'center' },
  small: { fontFamily: 'Alexandria_500Medium', fontSize: 10, textAlign: 'center', marginBottom: 3 },
  arrow: { fontFamily: 'Alexandria_700Bold', fontSize: 20 },
  secret: { fontFamily: 'Alexandria_700Bold', fontSize: 24, textAlign: 'center', marginTop: 9 },
  bold: { fontFamily: 'Alexandria_700Bold' },
  choiceGrid: { gap: 9 },
  voteGrid: { gap: 9 },
  progressRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, marginBottom: 2 },
  progressDot: { width: 8, height: 8, borderRadius: 5 },
  nameTile: { minHeight: 74, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secretBox: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 9, alignItems: 'center' },
  turnPair: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 7 },
});
