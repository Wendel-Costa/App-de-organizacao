import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTimer } from '@/hooks/useTimer';
import { useTaskStore } from '@/store/taskStore';
import { isTaskActiveToday } from '@/services/recurrence.service';

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

  const { tasks, fetchTasks, toggleComplete, addTask } = useTaskStore();
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    startFocus();
    fetchTasks();
  }, []);

  const themeTasks = selectedTheme
    ? tasks.filter((t) => {
        if (t.themeId !== selectedTheme.id) return false;
        if (t.type === 'anytime') return true;
        return isTaskActiveToday(t);
      })
    : [];

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

  async function handleQuickAdd() {
    if (!quickTaskTitle.trim()) return;
    await addTask({
      title: quickTaskTitle.trim(),
      type: 'anytime',
      completed: false,
      themeId: selectedTheme?.id,
    });
    setQuickTaskTitle('');
    setShowQuickAdd(false);
  }

  const totalPomodoroSeconds = isOnBreak ? pomodoroBreakMinutes * 60 : pomodoroWorkMinutes * 60;

  const cycleElapsed = mode === 'pomodoro' ? elapsedSeconds % totalPomodoroSeconds : elapsedSeconds;

  const progress = mode === 'pomodoro' ? cycleElapsed / totalPomodoroSeconds : 0;
  const accentColor = isOnBreak ? colors.mint : colors.primary;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
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
                { width: `${progress * 100}%`, backgroundColor: accentColor },
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

      {selectedTheme && (
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <Text style={styles.tasksSectionTitle}>Tarefas · {selectedTheme.name}</Text>
            <TouchableOpacity
              onPress={() => setShowQuickAdd(!showQuickAdd)}
              style={styles.addTaskButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>

          {showQuickAdd && (
            <View style={styles.quickAddRow}>
              <TextInput
                style={styles.quickAddInput}
                placeholder="Nova tarefa..."
                placeholderTextColor={colors.textDisabled}
                value={quickTaskTitle}
                onChangeText={setQuickTaskTitle}
                onSubmitEditing={handleQuickAdd}
                returnKeyType="done"
                autoFocus
              />
              <TouchableOpacity
                onPress={handleQuickAdd}
                style={styles.quickAddConfirm}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="check" size={18} color={colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {themeTasks.length === 0 && !showQuickAdd ? (
            <Text style={styles.noTasksText}>Nenhuma tarefa para hoje neste tema</Text>
          ) : (
            themeTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskRow}
                onPress={() => toggleComplete(task.id, !task.completed)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={task.completed ? 'check-circle' : 'circle-outline'}
                  size={22}
                  color={task.completed ? colors.success : colors.textDisabled}
                />
                <Text
                  style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}
                  numberOfLines={2}
                >
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
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

  tasksSection: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tasksSectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addTaskButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAddInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  quickAddConfirm: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTasksText: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  taskTitle: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
});
