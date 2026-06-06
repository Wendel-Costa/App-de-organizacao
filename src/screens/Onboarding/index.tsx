import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useSettingsStore } from '@/store/settingsStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  onDone: () => void;
}

const FEATURES = [
  {
    icon: 'check-circle-outline',
    color: '#FFB347',
    title: 'Tarefas & Hábitos',
    desc: 'Organize tarefas diárias, agendadas e recorrentes',
  },
  {
    icon: 'timer-outline',
    color: '#FFB347',
    title: 'Sessões de Foco',
    desc: 'Modo livre ou Pomodoro com histórico detalhado',
  },
  {
    icon: 'flag-outline',
    color: '#FFB347',
    title: 'Metas com Progresso',
    desc: 'Defina objetivos e acompanhe cada fator de forma organizada',
  },
  {
    icon: 'trophy-outline',
    color: '#FFB347',
    title: 'Recompensas',
    desc: 'Comemore conquistas ao bater suas metas e aumente sua motivação',
  },
] as const;

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { setName } = useSettingsStore();
  const inputRef = useRef<TextInput>(null);
  const [name, setLocalName] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    await setName(trimmed);
    setLoading(false);
    onDone();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.appName}>FocoMais</Text>
          <Text style={styles.tagline}>Per aspera ad astra</Text>
        </View>

        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
                <MaterialCommunityIcons name={f.icon as any} size={22} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formQuestion}>Como posso te chamar?</Text>
          <Text style={styles.formHint}>Será exibido na tela inicial como saudação</Text>

          <TouchableOpacity
            style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            <MaterialCommunityIcons
              name="account-outline"
              size={20}
              color={focused ? colors.primary : colors.textDisabled}
              style={styles.inputIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Seu nome..."
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setLocalName}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleStart}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {name.length > 0 && (
              <TouchableOpacity
                onPress={() => setLocalName('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textDisabled} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !name.trim() && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <MaterialCommunityIcons name="loading" size={22} color={colors.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.buttonText}>Começar agora</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textOnPrimary} />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Seus dados ficam apenas neste dispositivo (não é necessário criar uma conta).
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },

  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  featureDesc: {
    ...typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  formSection: {
    gap: spacing.sm,
  },
  formQuestion: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  formHint: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    ...typography.h3,
    color: colors.textPrimary,
    padding: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    ...typography.h3,
    color: colors.textOnPrimary,
  },
  disclaimer: {
    ...typography.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.xs,
  },
});
