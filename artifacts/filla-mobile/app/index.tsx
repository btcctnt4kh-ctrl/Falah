import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { AppButton, BrandHeader, Label, Notice, PageShell, Panel, Title } from '@/src/ui';
import { useColors } from '@/hooks/useColors';
import SessionPromptGame from '@/src/SessionPromptGame';
import UndercoverGame from '@/src/UndercoverGame';

type Screen = 'home' | 'questions' | 'challenges' | 'undercover';
const PLAYER_KEY = 'filla-mobile-players-v1';

export default function FillaHome() {
  const colors = useColors();
  const [players, setPlayers] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PLAYER_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          try {
            const parsed: unknown = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.every((name) => typeof name === 'string')) {
              setPlayers(parsed);
            }
          } catch {
            setStorageError('تعذر قراءة قائمة الأسماء المحفوظة؛ يمكنك البدء بقائمة جديدة.');
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setStorageError('تعذر الوصول إلى التخزين المحلي على هذا الجهاز.');
        setReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(players))
      .then(() => setStorageError(''))
      .catch(() => setStorageError('تعذر حفظ الأسماء على هذا الجهاز.'));
  }, [players, ready]);

  function savePlayer(nameValue: string, index?: number) {
    const name = nameValue.trim();
    if (!name) {
      setError('اكتبوا اسماً قبل الحفظ.');
      return;
    }
    if (players.some((player, playerIndex) => playerIndex !== index && player.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError('هذا الاسم موجود بالفعل، جرّبوا اسماً آخر.');
      return;
    }
    if (index === undefined) {
      setPlayers((current) => [...current, name]);
      setDraft('');
    } else {
      setPlayers((current) => current.map((player, playerIndex) => playerIndex === index ? name : player));
      setEditing(null);
    }
    setEditDraft('');
    setError('');
  }

  function renderHome() {
    return (
      <KeyboardAvoidingView style={styles.keyboardWrapper} behavior="padding" keyboardVerticalOffset={0}>
      <PageShell>
        <BrandHeader />
        <View style={[styles.hero, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View>
              <Label>وقتكم سوا، على طريقتكم</Label>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>اللعب أحلى{'\n'}لما نكون فِلّة.</Text>
            </View>
            <Image source={require('../assets/images/icon.png')} style={styles.heroIcon} accessibilityLabel="شعار فِلّة" />
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            اختاروا لعبة ومرّروا الجوال. الباقي علينا.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionText}>
            <Title subtitle="قائمة محلية تبقى على هذا الجهاز.">مين معنا اليوم؟</Title>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{players.length}</Text>
          </View>
        </View>

        <Panel>
          <View style={styles.rosterHeader}>
            <Label>قائمة الجلسة</Label>
            <Text style={[styles.small, { color: colors.mutedForeground }]}>
              {players.length} {players.length === 1 ? 'لاعب' : 'لاعبين'}
            </Text>
          </View>
          {players.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.muted }]}>
              <Feather name="users" size={23} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>الجلسة بانتظاركم</Text>
              <Text style={[styles.small, { color: colors.mutedForeground }]}>أضيفوا اسمين على الأقل للبدء.</Text>
            </View>
          ) : (
            <View style={styles.playerList}>
              {players.map((name, index) => (
                <View key={`${name}-${index}`} style={[styles.playerRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{name.trim().slice(0, 1)}</Text>
                  </View>
                  {editing === index ? (
                    <TextInput
                      accessibilityLabel={`تعديل اسم ${name}`}
                      autoFocus
                      maxLength={32}
                      onChangeText={setEditDraft}
                      onSubmitEditing={() => savePlayer(editDraft, index)}
                      placeholder="اسم اللاعب"
                      returnKeyType="done"
                      style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                      testID={`input-edit-player-${index}`}
                      value={editDraft}
                    />
                  ) : (
                    <Text style={[styles.playerText, { color: colors.foreground }]}>{name}</Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={editing === index ? 'حفظ الاسم' : `تعديل ${name}`}
                    onPress={() => {
                      if (editing === index) savePlayer(editDraft, index);
                      else { setEditing(index); setEditDraft(name); setError(''); }
                    }}
                    testID={`button-edit-player-${index}`}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Feather name={editing === index ? 'check' : 'edit-2'} size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`حذف ${name}`}
                    onPress={() => {
                      setPlayers((current) => current.filter((_, playerIndex) => playerIndex !== index));
                      if (editing === index) setEditing(null);
                    }}
                    testID={`button-delete-player-${index}`}
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={styles.addRow}>
            <TextInput
              accessibilityLabel="اسم لاعب جديد"
              maxLength={32}
              onChangeText={(value) => { setDraft(value); setError(''); }}
              onSubmitEditing={() => savePlayer(draft)}
              placeholder="اكتبوا اسم لاعب جديد..."
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              style={[styles.nameInput, styles.newNameInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              testID="input-player-name"
              value={draft}
            />
            <AppButton label="إضافة" onPress={() => savePlayer(draft)} testID="button-add-player" />
          </View>
          {error ? <Notice error>{error}</Notice> : null}
        </Panel>

        <View style={styles.gamesHeading}>
          <Title subtitle="ثلاث ألعاب، وجوال واحد بينكم.">اختاروا لعبتكم</Title>
        </View>
        <View style={styles.gamesGrid}>
          <GameCard
            title="سؤال على الطاير"
            description="أسئلة خفيفة وعميقة تفتح سوالف حلوة."
            icon="message-circle"
            onPress={() => setScreen('questions')}
             color={colors.primary}
            background={colors.secondary}
            testID="card-game-questions"
          />
          <GameCard
            title="تحديات لطيفة"
            description="حركات وكلمات بسيطة، والضحكة مضمونة."
            icon="zap"
            onPress={() => setScreen('challenges')}
            color={colors.accentForeground}
            background={`${colors.accent}55`}
            testID="card-game-challenges"
          />
          <GameCard
            title="برا السالفة"
            description="كلمة سرية واحدة، وشخص واحد يحاول يواكب."
            icon="users"
            onPress={() => setScreen('undercover')}
            color={colors.primary}
            background={colors.secondary}
            testID="card-game-undercover"
          />
        </View>
        <Notice>
          {players.length >= 3
            ? 'الجلسة جاهزة للانطلاق.'
            : players.length === 2
              ? 'سؤال وتحديات جاهزة؛ أضيفوا لاعباً ثالثاً لبرا السالفة.'
              : 'أضيفوا اسمين على الأقل للبدء بألعاب فِلّة.'}
        </Notice>
        {storageError ? <Notice error>{storageError}</Notice> : null}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>فِلّة · جلسة تجمعكم، وضحكة تبقى معكم</Text>
      </PageShell>
      </KeyboardAvoidingView>
    );
  }

  if (!ready) {
    return (
      <PageShell scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.small, { color: colors.mutedForeground }]}>نجهّز جلستكم...</Text>
        </View>
      </PageShell>
    );
  }

  if (screen === 'undercover') {
    return <UndercoverGame players={players} onBack={() => setScreen('home')} />;
  }
  if (screen === 'questions' || screen === 'challenges') {
    return <SessionPromptGame kind={screen} players={players} onBack={() => setScreen('home')} />;
  }
  return renderHome();
}

function GameCard({
  title,
  description,
  icon,
  onPress,
  color,
  background,
  testID,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  color: string;
  background: string;
  testID: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.gameCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.gameIcon, { backgroundColor: background }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.gameCopy}>
        <Text style={[styles.gameTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.gameDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Feather name="arrow-left" size={16} color={colors.mutedForeground} style={styles.gameArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboardWrapper: { flex: 1 },
  hero: { borderWidth: 1, borderRadius: 28, padding: 20, gap: 8, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  heroIcon: { width: 66, height: 66, borderRadius: 22 },
  heroTitle: { fontFamily: 'Alexandria_800ExtraBold', fontSize: 26, textAlign: 'right', lineHeight: 40, marginTop: 9 },
  body: { fontFamily: 'Alexandria_400Regular', fontSize: 12, textAlign: 'right', lineHeight: 23 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  sectionText: { flex: 1 },
  countBadge: { minWidth: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: 'Alexandria_700Bold', fontSize: 15 },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontFamily: 'Alexandria_400Regular', fontSize: 10, textAlign: 'right', lineHeight: 19 },
  empty: { minHeight: 120, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 15 },
  emptyTitle: { fontFamily: 'Alexandria_600SemiBold', fontSize: 13 },
  playerList: { gap: 8 },
  playerRow: { minHeight: 58, borderWidth: 1, borderRadius: 17, paddingHorizontal: 9, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  avatar: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Alexandria_700Bold', fontSize: 14 },
  playerText: { flex: 1, fontFamily: 'Alexandria_600SemiBold', fontSize: 12, textAlign: 'right' },
  iconButton: { width: 35, height: 38, justifyContent: 'center', alignItems: 'center' },
  nameInput: { minHeight: 43, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, flex: 1, fontFamily: 'Alexandria_400Regular', fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  addRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  newNameInput: { minWidth: 0 },
  gamesHeading: { marginTop: 7 },
  gamesGrid: { gap: 9 },
  gameCard: { minHeight: 91, borderWidth: 1, borderRadius: 21, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, overflow: 'hidden' },
  gameIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  gameCopy: { flex: 1, gap: 4 },
  gameTitle: { fontFamily: 'Alexandria_700Bold', fontSize: 13, textAlign: 'right' },
  gameDescription: { fontFamily: 'Alexandria_400Regular', fontSize: 10, lineHeight: 17, textAlign: 'right' },
  gameArrow: { marginLeft: 1 },
  footer: { fontFamily: 'Alexandria_400Regular', fontSize: 9, textAlign: 'center', marginTop: 4 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
