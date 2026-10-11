import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppButton, BrandHeader, Label, Notice, PageShell, Panel, Title, useSoundEffects } from '@/src/ui';
import { useColors } from '@/hooks/useColors';
import { challenges, questions, type Prompt } from './session-data';

type GameKind = 'questions' | 'challenges';

function pick<T>(items: T[], seen: string[], getKey: (item: T) => string): { item: T; seen: string[] } {
  const unseen = items.filter((item) => !seen.includes(getKey(item)));
  const pool = unseen.length ? unseen : items;
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { item, seen: [...(unseen.length ? seen : []), getKey(item)] };
}

export default function SessionPromptGame({
  kind,
  players,
  onBack,
}: {
  kind: GameKind;
  players: string[];
  onBack: () => void;
}) {
  const colors = useColors();
  const { play } = useSoundEffects();
  const isQuestion = kind === 'questions';
  const title = isQuestion ? 'سؤال على الطاير' : 'تحديات لطيفة';
  const storageKey = `filla-mobile-${kind}-session-v1`;
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [rollingName, setRollingName] = useState('');
  const [nextRollingName, setNextRollingName] = useState('');
  const [rolling, setRolling] = useState(false);
  const [question, setQuestion] = useState<Prompt | null>(null);
  const [challenge, setChallenge] = useState('');
  const [seenQuestions, setSeenQuestions] = useState<string[]>([]);
  const [seenChallenges, setSeenChallenges] = useState<string[]>([]);
  const [turn, setTurn] = useState(1);
  const [sessionReady, setSessionReady] = useState(false);
  const reelOffset = useRef(new Animated.Value(0)).current;
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then((raw) => {
      if (!active) return;
      if (raw) {
        try {
          const saved: unknown = JSON.parse(raw);
          if (saved && typeof saved === 'object') {
            const value = saved as Partial<{ currentPlayer: string; question: Prompt | null; challenge: string; seenQuestions: string[]; seenChallenges: string[]; turn: number }>;
            const validQuestion = value.question === null || (value.question && questions.some((item) => item.text === value.question?.text && item.category === value.question?.category));
            const valid = typeof value.currentPlayer === 'string' && (!value.currentPlayer || players.includes(value.currentPlayer))
              && validQuestion && typeof value.challenge === 'string' && (value.challenge === '' || challenges.includes(value.challenge))
              && Array.isArray(value.seenQuestions) && value.seenQuestions.every((item) => typeof item === 'string')
              && Array.isArray(value.seenChallenges) && value.seenChallenges.every((item) => typeof item === 'string')
              && Number.isInteger(value.turn) && (value.turn ?? 0) > 0;
            if (valid) {
              setCurrentPlayer(value.currentPlayer!);
              setQuestion(value.question ?? null);
              setChallenge(value.challenge!);
              setSeenQuestions(value.seenQuestions!);
              setSeenChallenges(value.seenChallenges!);
              setTurn(value.turn!);
            }
          }
        } catch {
          // A stale or unreadable saved turn should not block play.
        }
      }
      setSessionReady(true);
    }).catch(() => { if (active) setSessionReady(true); });
    return () => { active = false; };
  }, [players, storageKey]);

  useEffect(() => {
    if (!sessionReady) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify({ currentPlayer, question, challenge, seenQuestions, seenChallenges, turn })).catch(() => undefined);
  }, [challenge, currentPlayer, question, seenChallenges, seenQuestions, sessionReady, storageKey, turn]);

  useEffect(() => () => {
    if (rollTimer.current) clearTimeout(rollTimer.current);
    reelOffset.stopAnimation();
  }, [reelOffset]);

  function chooseQuestion() {
    const result = pick(questions, seenQuestions, (item) => item.text);
    setQuestion(result.item);
    setSeenQuestions(result.seen);
  }

  function chooseChallenge() {
    const result = pick(challenges, seenChallenges, (item) => item);
    setChallenge(result.item);
    setSeenChallenges(result.seen);
  }

  function startTurn() {
    if (players.length < 2 || rolling || !sessionReady) return;
    const selected = players[Math.floor(Math.random() * players.length)];
    let ticks = 0;
    setCurrentPlayer('');
    setRolling(true);
    setRollingName(players[Math.floor(Math.random() * players.length)]);
    setNextRollingName('');
    const step = () => {
      const isLast = ticks >= 9;
      const next = isLast ? selected : players[Math.floor(Math.random() * players.length)];
      setNextRollingName(next);
      if (!isLast && ticks % 2 === 0) play('tick');
      Animated.timing(reelOffset, {
        toValue: -74,
        duration: isLast ? 300 : 70 + ticks * 27,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setRollingName(next);
        setNextRollingName('');
        reelOffset.setValue(0);
        if (isLast) {
          setCurrentPlayer(selected);
          setRolling(false);
          play('land');
          void Haptics.selectionAsync().catch(() => undefined);
          if (isQuestion) chooseQuestion();
          else chooseChallenge();
          return;
        }
        ticks += 1;
        rollTimer.current = setTimeout(step, 28 + ticks * 11);
      });
    };
    rollTimer.current = setTimeout(step, 65);
  }

  function finishTurn() {
    setCurrentPlayer('');
    setQuestion(null);
    setChallenge('');
    setTurn((previous) => previous + 1);
  }

  return (
    <PageShell>
      <BrandHeader subtitle={title} onBack={onBack} />
      <Title subtitle={isQuestion ? 'سؤال واحد يفتح حكاية كاملة.' : 'كلها خفيفة، والهدف ننبسط سوا.'}>
        {title}
      </Title>
      {players.length < 2 ? (
        <Panel>
          <Label>نحتاج لاعبين اثنين على الأقل</Label>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            أضيفوا أسماء اللاعبين من الصفحة الرئيسية، ثم عودوا لبدء اللعب.
          </Text>
          <AppButton label="العودة وإضافة اللاعبين" onPress={onBack} testID={`${kind}-add-players`} />
        </Panel>
      ) : !currentPlayer ? (
        <Panel>
          <View style={styles.intro}>
            <View style={[styles.roundIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={isQuestion ? 'message-circle' : 'zap'} size={21} color={colors.primary} />
            </View>
            <Label>مين عليه الدور؟</Label>
          </View>
          <View accessibilityLiveRegion="polite" style={styles.reelContainer}>
            <View style={[styles.playerSlot, styles.reelWindow, { backgroundColor: rolling ? colors.secondary : colors.muted, borderColor: colors.border }]}>
              <Animated.View testID={`${kind}-reel-track`} style={{ transform: [{ translateY: reelOffset }] }}>
                <Text testID={`${kind}-reel-current-name`} style={[styles.reelName, { color: rolling || currentPlayer ? colors.primary : colors.mutedForeground }]}>
                  {rolling ? rollingName : currentPlayer || 'خلّوا فِلّة تختار لاعباً'}
                </Text>
                {rolling && nextRollingName ? <Text style={[styles.reelName, { color: colors.primary }]}>{nextRollingName}</Text> : null}
              </Animated.View>
            </View>
            {rolling ? <Text style={[styles.rollCaption, { color: colors.mutedForeground }]}>نقرّب ونختار...</Text> : null}
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign: 'center' }]}>
            فِلّة تختار لاعباً عشوائياً وتجهّز له {isQuestion ? 'سؤالاً' : 'تحدياً لطيفاً'}.
          </Text>
          <AppButton label={!sessionReady ? 'نجهّز الجولة...' : rolling ? 'جاري اختيار اللاعب' : 'اختيار لاعب وبدء الجولة'} disabled={rolling || !sessionReady} onPress={startTurn} testID={`${kind}-button-roll`} />
        </Panel>
      ) : (
        <Panel>
          <View style={styles.turnTop}>
            <Label>{isQuestion ? `الجولة ${turn}` : `التحدي ${turn}`}</Label>
            <View style={[styles.turnBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="user" size={14} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>دور اللاعب</Text>
            </View>
          </View>
          <View style={[styles.playerSlot, styles.landedSlot, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text testID={`${kind}-current-player`} style={[styles.playerName, { color: colors.primary }]}>{currentPlayer}</Text>
          </View>
          {isQuestion && question ? (
            <View style={[styles.contentBox, { backgroundColor: colors.muted }]}>
              <View style={styles.promptHeading}>
                <Feather name="message-circle" size={17} color={colors.primary} />
                <Label>{question.category}</Label>
              </View>
              <Text testID={`${kind}-content`} accessibilityRole="text" style={[styles.prompt, { color: colors.foreground }]}>{question.text}</Text>
            </View>
          ) : null}
          {!isQuestion && challenge ? (
            <View style={[styles.contentBox, { backgroundColor: colors.muted }]}>
              <View style={styles.promptHeading}>
                <Feather name="shield" size={17} color={colors.primary} />
                <Label>على راحتك · تحدٍ آمن</Label>
              </View>
              <Text testID={`${kind}-content`} style={[styles.prompt, { color: colors.foreground }]}>{challenge}</Text>
            </View>
          ) : null}
          <AppButton
            label={isQuestion ? 'جاوبنا، اللاعب التالي' : 'تم، اللاعب التالي'}
            onPress={finishTurn}
            testID={`${kind}-button-done`}
          />
          <AppButton
            label={isQuestion ? 'تخطّي السؤال' : 'تحدٍ آخر'}
            variant="soft"
            onPress={isQuestion ? chooseQuestion : chooseChallenge}
            testID={`${kind}-button-skip`}
          />
          <Notice>{isQuestion ? `تخطّي السؤال يبقي الدور مع ${currentPlayer}.` : `التحدي الآخر يبقي الدور مع ${currentPlayer}.`}</Notice>
        </Panel>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: 'Alexandria_400Regular', fontSize: 12, lineHeight: 24, textAlign: 'right' },
  intro: { alignItems: 'center', gap: 8 },
  roundIcon: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerSlot: { minHeight: 76, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  reelContainer: { alignItems: 'center', gap: 6 },
  reelWindow: { height: 74, overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0, width: '100%' },
  reelName: { height: 74, textAlignVertical: 'center', fontFamily: 'Alexandria_700Bold', fontSize: 20, textAlign: 'center', paddingHorizontal: 12 },
  landedSlot: { minHeight: 76 },
  playerName: { fontFamily: 'Alexandria_800ExtraBold', fontSize: 25, textAlign: 'center' },
  placeholder: { fontFamily: 'Alexandria_700Bold', fontSize: 20, textAlign: 'center' },
  rollCaption: { fontFamily: 'Alexandria_400Regular', fontSize: 10 },
  turnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  turnBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 10 },
  badgeText: { fontFamily: 'Alexandria_600SemiBold', fontSize: 9 },
  promptHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  contentBox: { borderRadius: 21, padding: 19, gap: 12, minHeight: 150, justifyContent: 'center' },
  prompt: { fontFamily: 'Alexandria_700Bold', fontSize: 18, textAlign: 'right', lineHeight: 34 },
});
