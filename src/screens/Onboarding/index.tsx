import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useSettingsStore } from '@/store/settingsStore';

interface OnboardingScreenProps {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { setName } = useSettingsStore();
  const [name, setLocalName] = useState('');

  async function handleStart() {
    if (!name.trim()) return;
    await setName(name.trim());
    onDone();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="timer-outline" size={64} color={colors.textOnPrimary} />
        </View>
        <Text style={styles.appName}>FocoMais</Text>
        <Text style={styles.tagline}>Organize, foque e alcance seus objetivos</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.question}>Como posso te chamar?</Text>
        <Text style={styles.hint}>Seu nome aparecerá na tela inicial</Text>

        <TextInput
          style={styles.input}
          placeholder="Seu nome..."
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setLocalName}
          maxLength={30}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleStart}
        />

        <TouchableOpacity
          style={[styles.button, !name.trim() && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Começar</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logoArea: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    ...typography.h1,
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    gap: spacing.md,
  },
  question: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.h3,
    color: colors.textPrimary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.h3,
    color: colors.textOnPrimary,
  },
});
