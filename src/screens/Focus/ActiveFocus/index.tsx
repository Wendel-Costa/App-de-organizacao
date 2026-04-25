import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTimer } from '@/hooks/useTimer';

interface ActiveFocusScreenProps {
  onStop: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ActiveFocusScreen({ onStop }: ActiveFocusScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    status,
    mode,
    selectedTheme,
    elapsedSeconds,
    pomodoroRounds,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    isOnBreak,
    startFocus,
    pauseFocus,
    resumeFocus,
    stopFocus,
  } = useTimer();

  useEffect(() => {
    startFocus();
  }, []);

  async function handleStop() {
    Alert.alert('Encerrar sessão', 'Deseja encerrar e salvar a sessão de foco?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        onPress: async () => {
          await stopFocus();
          onStop();
        },
      },
    ]);
  }

  const totalPomodoroSeconds = isOnBreak ? pomodoroBreakMinutes * 60 : pomodoroWorkMinutes * 60;

  const cycleElapsed = mode === 'pomodoro' ? elapsedSeconds % totalPomodoroSeconds : elapsedSeconds;

  const progress = mode === 'pomodoro' ? cycleElapsed / totalPomodoroSeconds : 0;

  const accentColor = isOnBreak ? colors.mint : colors.primary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Tema */}
      <View style={styles.themeRow}>
        <MaterialCommunityIcons name="circle" size={10} color={accentColor} />
        <Text style={styles.themeText}>
          {selectedTheme ? selectedTheme.name : 'Foco geral'}
          {mode === 'pomodoro' && isOnBreak ? ' · Pausa' : ''}
        </Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        {mode === 'pomodoro' && (
          <Text style={styles.pomodoroInfo}>
            {isOnBreak ? '☕ Hora da pausa' : `🍅 Round ${pomodoroRounds + 1}`}
          </Text>
        )}
      </View>

      {mode === 'pomodoro' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {formatTime(totalPomodoroSeconds - cycleElapsed)} restantes
          </Text>
        </View>
      )}

      {mode === 'pomodoro' && pomodoroRounds > 0 && (
        <View style={styles.roundsRow}>
          {Array.from({ length: pomodoroRounds }).map((_, i) => (
            <View key={i} style={[styles.roundDot, { backgroundColor: colors.primary }]} />
          ))}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.stopButton} onPress={handleStop} activeOpacity={0.8}>
          <MaterialCommunityIcons name="stop" size={28} color={colors.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: accentColor }]}
          onPress={status === 'running' ? pauseFocus : resumeFocus}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={status === 'running' ? 'pause' : 'play'}
            size={40}
            color={colors.textOnPrimary}
          />
        </TouchableOpacity>

        <View style={styles.stopButton} />
      </View>

      <Text style={styles.hint}>
        {status === 'running' ? 'Sessão em andamento' : 'Sessão pausada'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  themeText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timer: {
    fontSize: 80,
    fontWeight: '200',
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  pomodoroInfo: {
    ...typography.body,
    color: colors.textSecondary,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  progressLabel: {
    ...typography.sm,
    color: colors.textDisabled,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  roundDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...typography.sm,
    color: colors.textDisabled,
  },
});
