import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, BrandHeader, Label, Notice, PageShell, Panel, Title } from '@/src/ui';
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
  const isQuestion = kind === 'questions';
  const title = isQuestion ? 'سؤال على الطاير' : 'تحديات لطيفة';
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [question, setQuestion] = useState<Prompt | null>(null);
  const [challenge, setChallenge] = useState('');
  const [seenQuestions, setSeenQuestions] = useState<string[]>([]);
  const [seenChallenges, setSeenChallenges] = useState<string[]>([]);
  const [turn, setTurn] = useState(1);

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
    if (players.length < 2) return;
    setCurrentPlayer(players[Math.floor(Math.random() * players.length)]);
    if (isQuestion) chooseQuestion();
    else chooseChallenge();
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
          <Label>مين عليه الدور؟</Label>
          <View style={[styles.playerSlot, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>خلّوا فِلّة تختار لاعباً</Text>
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            فِلّة تختار لاعباً عشوائياً وتجهّز له {isQuestion ? 'سؤالاً' : 'تحدياً لطيفاً'}.
          </Text>
          <AppButton label="اختيار لاعب وبدء الجولة" onPress={startTurn} testID={`${kind}-button-roll`} />
        </Panel>
      ) : (
        <Panel>
          <Label>{isQuestion ? `الجولة ${turn}` : `التحدي ${turn}`}</Label>
          <View style={[styles.playerSlot, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.playerName, { color: colors.primary }]}>{currentPlayer}</Text>
          </View>
          {isQuestion && question ? (
            <View style={[styles.contentBox, { backgroundColor: colors.muted }]}>
              <Label>{question.category}</Label>
              <Text style={[styles.prompt, { color: colors.foreground }]}>{question.text}</Text>
            </View>
          ) : null}
          {!isQuestion && challenge ? (
            <View style={[styles.contentBox, { backgroundColor: colors.muted }]}>
              <Label>على راحتك · تحدٍ آمن</Label>
              <Text style={[styles.prompt, { color: colors.foreground }]}>{challenge}</Text>
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
  playerSlot: { minHeight: 62, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 10 },
  playerName: { fontFamily: 'Alexandria_700Bold', fontSize: 20, textAlign: 'center' },
  placeholder: { fontFamily: 'Alexandria_500Medium', fontSize: 13, textAlign: 'center' },
  contentBox: { borderRadius: 18, padding: 17, gap: 11 },
  prompt: { fontFamily: 'Alexandria_600SemiBold', fontSize: 16, textAlign: 'right', lineHeight: 31 },
});
