import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { filterTasksForToday } from '@/services/recurrence.service';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { TaskItem } from '@/components/TaskItem';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function HomeScreen() {
  const { tasks, fetchTasks, toggleComplete, removeTask } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, []);

  const todayTasks = filterTasksForToday(tasks);
  const pending = todayTasks.filter((t) => !t.completed);
  const completed = todayTasks.filter((t) => t.completed);
  const focusToday = 0; // em breve

  return (
    <View style={globalStyles.screen}>
      <Header title="FocoMais" rightAction={{ icon: 'bell-outline', onPress: () => {} }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            icon="check-circle-outline"
            label="Tarefas"
            value={`${completed.length}/${todayTasks.length}`}
            color={colors.mint}
          />
          <SummaryCard
            icon="timer-outline"
            label="Foco hoje"
            value={`${focusToday}h`}
            color={colors.sky}
          />
          <SummaryCard
            icon="flag-outline"
            label="Pendentes"
            value={String(pending.length)}
            color={colors.peach}
          />
        </View>

        <Text style={styles.sectionTitle}>Iniciar foco</Text>
        <Card elevated style={styles.focusCard}>
          <View style={globalStyles.rowBetween}>
            <View>
              <Text style={styles.focusTitle}>Modo livre</Text>
              <Text style={styles.focusSubtitle}>Sem tempo definido</Text>
            </View>
            <TouchableOpacity style={styles.focusButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="play" size={28} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.focusCard}>
          <View style={globalStyles.rowBetween}>
            <View>
              <Text style={styles.focusTitle}>Pomodoro</Text>
              <Text style={styles.focusSubtitle}>25 min foco · 5 min pausa</Text>
            </View>
            <TouchableOpacity style={styles.focusButton} activeOpacity={0.8}>
              <MaterialCommunityIcons name="play" size={28} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Tarefas de hoje ({pending.length} pendentes)</Text>

        {todayTasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="playlist-check" size={40} color={colors.textDisabled} />
              <Text style={styles.emptyText}>Nenhuma tarefa para hoje</Text>
            </View>
          </Card>
        ) : (
          <View style={styles.taskList}>
            {[...pending, ...completed].map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleComplete}
                onPress={() => {}}
                onDelete={removeTask}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface SummaryCardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  greeting: {
    marginBottom: spacing.lg,
  },
  greetingText: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.xs,
    color: colors.textSecondary,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  focusCard: {
    marginBottom: spacing.sm,
  },
  focusTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  focusSubtitle: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  focusButton: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    marginBottom: spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textDisabled,
  },
  taskList: {
    gap: spacing.sm,
  },
});
