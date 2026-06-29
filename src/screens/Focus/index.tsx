import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusStore } from '@/store/focusStore';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextInputModal } from '@/components/TextInputModal';
import { ActiveFocusScreen } from './ActiveFocus';
import { FocusHistoryScreen } from './FocusHistory';

type Screen = 'home' | 'active' | 'history';

export function FocusScreen() {
  const [screen, setScreen] = useState<Screen>('home');
  const [showThemeModal, setShowThemeModal] = useState(false);

  const {
    themes,
    fetchThemes,
    selectedTheme,
    setSelectedTheme,
    mode,
    setMode,
    addTheme,
    removeTheme,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    setPomodoroConfig,
  } = useFocusStore();

  useFocusEffect(
    useCallback(() => {
      fetchThemes();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen === 'active' || screen === 'history') {
          setScreen('home');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [screen]),
  );

  if (screen === 'active') {
    return <ActiveFocusScreen onStop={() => setScreen('home')} />;
  }

  if (screen === 'history') {
    return <FocusHistoryScreen onBack={() => setScreen('home')} />;
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Foco" rightAction={{ icon: 'history', onPress: () => setScreen('history') }} />

      <TextInputModal
        visible={showThemeModal}
        title="Novo tema de foco"
        placeholder="Ex: Matemática, Leitura..."
        confirmLabel="Criar"
        onConfirm={(name) => {
          const themeName = name.trim();

          if (themeName.length > 50) {
            Alert.alert('Nome muito longo', 'O nome do tema deve ter no máximo 50 caracteres.');
            return;
          }

          addTheme(themeName);
          setShowThemeModal(false);
        }}
        onCancel={() => setShowThemeModal(false)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Modo</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'free' && styles.modeCardActive]}
            onPress={() => setMode('free')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="infinity"
              size={28}
              color={mode === 'free' ? colors.textOnPrimary : colors.textSecondary}
            />
            <Text style={[styles.modeTitle, mode === 'free' && styles.modeTitleActive]}>Livre</Text>
            <Text style={[styles.modeSubtitle, mode === 'free' && styles.modeSubtitleActive]}>
              Sem tempo definido
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'pomodoro' && styles.modeCardActive]}
            onPress={() => setMode('pomodoro')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="timer-outline"
              size={28}
              color={mode === 'pomodoro' ? colors.textOnPrimary : colors.textSecondary}
            />
            <Text style={[styles.modeTitle, mode === 'pomodoro' && styles.modeTitleActive]}>
              Pomodoro
            </Text>
            <Text style={[styles.modeSubtitle, mode === 'pomodoro' && styles.modeSubtitleActive]}>
              {pomodoroWorkMinutes}min · {pomodoroBreakMinutes}min pausa
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'pomodoro' && (
          <Card style={styles.pomodoroConfig}>
            <Text style={styles.configTitle}>Configuração do Pomodoro</Text>
            <View style={styles.configRow}>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Foco (min)</Text>
                <View style={styles.configCounter}>
                  <TouchableOpacity
                    onPress={() =>
                      setPomodoroConfig(Math.max(5, pomodoroWorkMinutes - 5), pomodoroBreakMinutes)
                    }
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.configValue}>{pomodoroWorkMinutes}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPomodoroConfig(Math.min(90, pomodoroWorkMinutes + 5), pomodoroBreakMinutes)
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.configDivider} />

              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Pausa (min)</Text>
                <View style={styles.configCounter}>
                  <TouchableOpacity
                    onPress={() =>
                      setPomodoroConfig(pomodoroWorkMinutes, Math.max(1, pomodoroBreakMinutes - 1))
                    }
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.configValue}>{pomodoroBreakMinutes}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPomodoroConfig(pomodoroWorkMinutes, Math.min(30, pomodoroBreakMinutes + 1))
                    }
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Tema de foco</Text>
        </View>

        <View style={styles.themesGrid}>
          <TouchableOpacity
            style={[styles.themeChip, !selectedTheme && styles.themeChipActive]}
            onPress={() => setSelectedTheme(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.themeLabel, !selectedTheme && styles.themeLabelActive]}>
              Geral
            </Text>
          </TouchableOpacity>

          {themes.map((t) => {
            const active = selectedTheme?.id === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.themeChip, active && styles.themeChipActive]}
                onPress={() => setSelectedTheme(t)}
                onLongPress={() => {
                  Alert.alert('Excluir tema', `Excluir "${t.name}"?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: () => removeTheme(t.id) },
                  ]);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.themeLabel, active && styles.themeLabelActive]}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.themeAddChip}
            onPress={() => setShowThemeModal(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.primaryDark} />
            <Text style={styles.themeAddLabel}>Novo tema</Text>
          </TouchableOpacity>
        </View>

        {themes.length === 0 && (
          <Text style={styles.themesEmptyText}>
            Crie temas para organizar seus períodos de foco, como Trabalho, Estudo ou Leitura.
          </Text>
        )}

        <Button
          label="Iniciar sessão de foco"
          onPress={() => setScreen('active')}
          fullWidth
          style={styles.startButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  modeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  modeTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modeTitleActive: {
    color: colors.textOnPrimary,
  },
  modeSubtitle: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modeSubtitleActive: {
    color: colors.textOnPrimary,
  },

  pomodoroConfig: {
    marginTop: spacing.sm,
  },
  configTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  configLabel: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  configCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  configValue: {
    ...typography.h2,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  configDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  themeHint: {
    ...typography.xs,
    color: colors.textDisabled,
  },

  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  themeDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  themeLabel: {
    ...typography.label,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  themeLabelActive: {
    color: colors.textOnPrimary,
  },
  themeAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderStyle: 'dashed',
  },
  themeAddLabel: {
    ...typography.label,
    color: colors.primaryDark,
  },
  themesEmptyText: {
    ...typography.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  startButton: {
    marginTop: spacing.xl,
  },
});
