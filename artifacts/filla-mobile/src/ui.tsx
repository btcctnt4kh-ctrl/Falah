import React, { type ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const logo = require('../assets/images/icon.png');

export function PageShell({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const content = {
    paddingHorizontal: 20,
    paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12),
    paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
    gap: 18,
    flexGrow: 1,
    direction: 'rtl' as const,
  };
  if (!scroll) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <View style={content}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      style={[styles.page, { backgroundColor: colors.background }]}
      contentContainerStyle={content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function BrandHeader({
  subtitle,
  onBack,
}: {
  subtitle?: string;
  onBack?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="العودة للرئيسية"
          onPress={onBack}
          testID="button-back-home"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>الرئيسية</Text>
        </Pressable>
      ) : (
        <View style={styles.backSpacer} />
      )}
      <View style={styles.brand}>
        <Image source={logo} style={styles.brandIcon} accessibilityLabel="شعار فِلّة" />
        <View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>فِلّة</Text>
          <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>
            {subtitle ?? 'اللعب أحلى مع بعض'}
          </Text>
        </View>
      </View>
      <View style={styles.backSpacer} />
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'outline' | 'danger';
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const palette = {
    primary: { backgroundColor: colors.primary, color: colors.primaryForeground, borderColor: colors.primary },
    soft: { backgroundColor: colors.secondary, color: colors.secondaryForeground, borderColor: colors.secondary },
    outline: { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
    danger: { backgroundColor: colors.destructive, color: colors.destructiveForeground, borderColor: colors.destructive },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, { color: palette.color }]}>{label}</Text>
    </Pressable>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 7, shadowColor: colors.foreground },
      ]}
    >
      {children}
    </View>
  );
}

export function Title({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.titleBlock}>
      <Text style={[styles.title, { color: colors.foreground }]}>{children}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.label, { color: colors.primary }]}>{children}</Text>;
}

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const colors = useColors();
  return (
    <Text
      accessibilityRole={error ? 'alert' : undefined}
      style={[
        styles.notice,
        {
          backgroundColor: error ? `${colors.destructive}18` : `${colors.accent}35`,
          color: error ? colors.destructive : colors.mutedForeground,
        },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  backText: { fontFamily: 'Alexandria_600SemiBold', fontSize: 12 },
  backSpacer: { width: 72 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 48, height: 48, borderRadius: 16 },
  brandName: { fontFamily: 'Alexandria_800ExtraBold', fontSize: 20, textAlign: 'right' },
  brandSubtitle: { fontFamily: 'Alexandria_400Regular', fontSize: 9, textAlign: 'right', marginTop: -1 },
  titleBlock: { gap: 7, marginBottom: 2 },
  title: { fontFamily: 'Alexandria_700Bold', fontSize: 22, textAlign: 'right', lineHeight: 34 },
  subtitle: { fontFamily: 'Alexandria_400Regular', fontSize: 12, textAlign: 'right', lineHeight: 23 },
  label: { fontFamily: 'Alexandria_700Bold', fontSize: 11, textAlign: 'right' },
  panel: { borderWidth: 1, padding: 18, gap: 14, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  button: { minHeight: 48, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  buttonText: { fontFamily: 'Alexandria_600SemiBold', fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.48 },
  notice: { fontFamily: 'Alexandria_400Regular', fontSize: 11, lineHeight: 22, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 14, textAlign: 'right', overflow: 'hidden' },
});
