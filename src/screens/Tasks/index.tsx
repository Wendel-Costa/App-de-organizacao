import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { TaskItem } from '@/components/TaskItem';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { CreateTaskScreen } from './CreateTask';
import { TaskDetailScreen } from './TaskDetail';
import type { Task } from '@/types/task.types';
import type { GoalTaskForToday } from '@/types/goal.types';
import {
  getTodayString,
  applyRecurringReset,
  isRecurringOccurrenceVisibleOn,
  getNextRecurringOccurrenceDate,
  getRecurringTaskFrequencyLabel,
  getRecurringTaskStatus,
} from '@/services/recurrence.service';
import { dateOf } from '@/utils/date';
import { useFocusEffect } from '@react-navigation/native';

type Filter = 'all' | 'today' | 'anytime' | 'recurring';
type Screen = 'list' | 'create' | 'detail' | 'edit';

const COMPLETED_LIMIT = 5;

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoje' },
  { key: 'anytime', label: 'Livre' },
  { key: 'recurring', label: 'Recorrentes' },
];

function isGoalTaskDueForTasksToday(t: GoalTaskForToday): boolean {
  return t.task.type === 'habit' && t.task.recurrenceType === 'daily' && !t.task.completedToday;
}

function getCalendarDayDifference(laterDate: string, earlierDate: string): number {
  const [laterYear, laterMonth, laterDay] = laterDate.split('-').map(Number);
  const [earlierYear, earlierMonth, earlierDay] = earlierDate.split('-').map(Number);
  const later = Date.UTC(laterYear, laterMonth - 1, laterDay);
  const earlier = Date.UTC(earlierYear, earlierMonth - 1, earlierDay);
  return Math.round((later - earlier) / 86400000);
}

function isWithinLastSevenDays(completedAt: string | undefined, today: string): boolean {
  if (!completedAt) return false;
  const completionDate = dateOf(completedAt);
  const daysAgo = getCalendarDayDifference(today, completionDate);
  return daysAgo >= 0 && daysAgo < 7;
}

function formatCalendarDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRecurringStatusLabel(
  task: Task,
  status: ReturnType<typeof getRecurringTaskStatus>,
  today: string,
): string {
  if (status === 'pending') return 'Pendente hoje';
  if (status === 'skipped') return 'Pulada hoje';
  if (status === 'completed') {
    if (!task.completedAt) return 'Concluída (data não registrada)';
    return dateOf(task.completedAt) === today
      ? 'Concluída hoje'
      : `Última ocorrência concluída em ${formatCalendarDate(dateOf(task.completedAt))}`;
  }
  return 'Aguardando próxima ocorrência';
}

function getRecurringStatusColor(status: ReturnType<typeof getRecurringTaskStatus>): string {
  if (status === 'pending') return colors.warning;
  if (status === 'completed') return colors.success;
  if (status === 'skipped') return colors.textDisabled;
  return colors.info;
}

export function TasksScreen() {
  const tasks = useTaskStore((state) => state.tasks);
  const loading = useTaskStore((state) => state.loading);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const removeTask = useTaskStore((state) => state.removeTask);
  const skipRecurringOccurrence = useTaskStore((state) => state.skipRecurringOccurrence);
  const todayGoalTasks = useGoalStore((state) => state.todayGoalTasks);
  const fetchTodayGoalTasks = useGoalStore((state) => state.fetchTodayGoalTasks);
  const completeTask = useGoalStore((state) => state.completeTask);
  const uncompleteTask = useGoalStore((state) => state.uncompleteTask);

  const [filter, setFilter] = useState<Filter>('all');
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks]),
  );

  useEffect(() => {
    if (filter === 'today') {
      void fetchTodayGoalTasks();
    }
  }, [filter, fetchTodayGoalTasks]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen === 'edit') {
          setScreen('detail');
          return true;
        }
        if (screen === 'create' || screen === 'detail') {
          setScreen('list');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [screen]),
  );

  useEffect(() => {
    setShowAllCompleted(false);
  }, [filter]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      fetchTasks(true),
      filter === 'today' ? fetchTodayGoalTasks(true) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }

  const todayStr = getTodayString();

  const filtered = tasks.filter((task) => {
    if (filter === 'today') {
      if (task.type === 'scheduled') return task.scheduledDate === todayStr;
      if (task.type === 'recurring') return isRecurringOccurrenceVisibleOn(task, todayStr);
      return false;
    }
    if (filter === 'anytime') return task.type === 'anytime';
    if (filter === 'all' && task.type === 'recurring') {
      return (
        isRecurringOccurrenceVisibleOn(task, todayStr) ||
        (task.completed && isWithinLastSevenDays(task.completedAt, todayStr))
      );
    }
    if (filter === 'recurring') return task.type === 'recurring';
    return true;
  });

  const effectiveFiltered =
    filter === 'recurring'
      ? filtered
      : applyRecurringReset(filtered, todayStr).filter(
          (task) => !(task.type === 'recurring' && task.skippedDate === todayStr),
        );

  const pending = effectiveFiltered.filter((task) => !task.completed);

  const completedSorted = effectiveFiltered
    .filter((task) => task.completed && isWithinLastSevenDays(task.completedAt, todayStr))
    .sort(
      (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime(),
    );

  const displayedCompleted = showAllCompleted
    ? completedSorted
    : completedSorted.slice(0, COMPLETED_LIMIT);

  const recurringPanelTasks = tasks
    .filter((task) => task.type === 'recurring')
    .sort((a, b) => {
      const nextA = getNextRecurringOccurrenceDate(a, todayStr) ?? '9999-12-31';
      const nextB = getNextRecurringOccurrenceDate(b, todayStr) ?? '9999-12-31';
      return nextA.localeCompare(nextB) || a.title.localeCompare(b.title);
    });

  const dueTodayGoalTasks =
    filter === 'today' ? todayGoalTasks.filter(isGoalTaskDueForTasksToday) : [];

  function handlePress(task: Task) {
    setSelectedTask(task);
    setScreen('detail');
  }

  function handleDelete(task: Task) {
    Alert.alert('Excluir tarefa?', `A tarefa "${task.title}" será excluída permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void removeTask(task.id);
        },
      },
    ]);
  }

  if (screen === 'create') {
    return (
      <CreateTaskScreen
        onBack={() => setScreen('list')}
        onSuccess={() => {
          fetchTasks();
          setScreen('list');
        }}
      />
    );
  }

  if (screen === 'edit' && selectedTask) {
    return (
      <CreateTaskScreen
        initialTask={selectedTask}
        onBack={() => setScreen('detail')}
        onSuccess={() => {
          fetchTasks();
          setScreen('list');
        }}
      />
    );
  }

  if (screen === 'detail' && selectedTask) {
    const rawTask = tasks.find((t) => t.id === selectedTask.id) ?? selectedTask;
    const effectiveTask = applyRecurringReset([rawTask], todayStr)[0];
    return (
      <TaskDetailScreen
        task={effectiveTask}
        onBack={() => setScreen('list')}
        onDeleted={() => setScreen('list')}
        onEdit={() => setScreen('edit')}
      />
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Tarefas" rightAction={{ icon: 'plus', onPress: () => setScreen('create') }} />

      <View style={styles.filtersWrapper}>
        <View style={styles.filters}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filter === 'recurring' ? recurringPanelTasks : [...pending, ...displayedCompleted]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            filter === 'recurring' ? (
              <View style={styles.recurringPanelHeader}>
                <Text style={styles.sectionLabel}>Gerenciamento de recorrências</Text>
                <Text style={styles.recurringPanelCount}>
                  {recurringPanelTasks.length}{' '}
                  {recurringPanelTasks.length === 1 ? 'tarefa recorrente' : 'tarefas recorrentes'}
                </Text>
              </View>
            ) : (
              <>
                {dueTodayGoalTasks.length > 0 && (
                  <View style={styles.goalTasksSection}>
                    <Text style={styles.sectionLabel}>Hábitos diários de metas</Text>
                    {dueTodayGoalTasks.map(({ task, goalTitle, goalColor }) => {
                      const accent = goalColor ?? colors.primary;
                      return (
                        <Card
                          key={task.id}
                          style={[styles.goalTaskCard, { borderLeftColor: accent }]}
                        >
                          <View style={globalStyles.rowBetween}>
                            <View style={styles.goalTaskLeft}>
                              <Text style={styles.goalTaskGoal}>{goalTitle}</Text>
                              <Text style={styles.goalTaskTitle}>{task.title}</Text>
                            </View>
                            <View style={styles.goalTaskActions}>
                              {task.completedToday && (
                                <TouchableOpacity
                                  style={styles.undoBtn}
                                  onPress={() => uncompleteTask(task.goalId, task.id)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <MaterialCommunityIcons
                                    name="undo"
                                    size={14}
                                    color={colors.textDisabled}
                                  />
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.doneBtn, { backgroundColor: accent }]}
                                onPress={() => completeTask(task.goalId, task.id)}
                                activeOpacity={0.8}
                              >
                                <MaterialCommunityIcons
                                  name={task.completedToday ? 'check' : 'plus'}
                                  size={16}
                                  color={colors.textOnPrimary}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                )}

                {pending.length > 0 && completedSorted.length > 0 && (
                  <Text style={styles.sectionLabel}>Pendentes ({pending.length})</Text>
                )}
              </>
            )
          }
          ListEmptyComponent={
            filter === 'recurring' ? (
              <EmptyState
                icon="repeat"
                title="Nenhuma tarefa recorrente"
                description="As tarefas configuradas para se repetir aparecerão aqui."
              />
            ) : dueTodayGoalTasks.length === 0 ? (
              <EmptyState
                icon="playlist-check"
                title="Nenhuma tarefa aqui"
                description="Toque no + para adicionar uma nova tarefa"
              />
            ) : null
          }
          ListFooterComponent={
            filter === 'recurring' ? null : (
              <>
                {completedSorted.length > COMPLETED_LIMIT && !showAllCompleted && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllCompleted(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showMoreText}>
                      Mostrar mais ({completedSorted.length - COMPLETED_LIMIT} tarefas)
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={18}
                      color={colors.primaryDark}
                    />
                  </TouchableOpacity>
                )}
              </>
            )
          }
          renderItem={({ item, index }) => {
            if (filter === 'recurring') {
              const status = getRecurringTaskStatus(item, todayStr);
              const nextOccurrence = getNextRecurringOccurrenceDate(item, todayStr);
              const statusColor = getRecurringStatusColor(status);
              return (
                <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.8}>
                  <Card style={styles.recurringTaskCard}>
                    <View style={styles.recurringTaskTop}>
                      <Text style={styles.recurringTaskTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={colors.textDisabled}
                      />
                    </View>
                    <View style={styles.recurringTaskFrequency}>
                      <MaterialCommunityIcons name="repeat" size={14} color={colors.info} />
                      <Text style={styles.recurringTaskFrequencyText}>
                        {getRecurringTaskFrequencyLabel(item)}
                      </Text>
                    </View>
                    <View style={styles.recurringTaskFooter}>
                      <View style={styles.recurringTaskStatus}>
                        <View
                          style={[styles.recurringTaskStatusDot, { backgroundColor: statusColor }]}
                        />
                        <Text style={[styles.recurringTaskStatusText, { color: statusColor }]}>
                          {getRecurringStatusLabel(item, status, todayStr)}
                        </Text>
                      </View>
                      <Text style={styles.recurringTaskNext}>
                        {nextOccurrence
                          ? `Próxima: ${formatCalendarDate(nextOccurrence)}`
                          : 'Próxima ocorrência não definida'}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            }

            const showCompletedHeader = index === pending.length && displayedCompleted.length > 0;
            return (
              <>
                {showCompletedHeader && (
                  <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                    Concluídas recentemente ({completedSorted.length})
                  </Text>
                )}
                <TaskItem
                  task={item}
                  onToggle={toggleComplete}
                  onPress={handlePress}
                  onDelete={() => handleDelete(item)}
                  onSkip={skipRecurringOccurrence}
                />
              </>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filtersWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  filterLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  filterLabelActive: {
    color: colors.textOnPrimary,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  goalTasksSection: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  goalTaskCard: {
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
  },
  goalTaskLeft: {
    flex: 1,
    gap: 2,
  },
  goalTaskGoal: {
    ...typography.xs,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalTaskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  goalTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  undoBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringPanelHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  recurringPanelCount: {
    ...typography.xs,
    color: colors.textDisabled,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  recurringTaskCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  recurringTaskTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recurringTaskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  recurringTaskFrequency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recurringTaskFrequencyText: {
    ...typography.xs,
    color: colors.info,
    fontWeight: '600',
  },
  recurringTaskFooter: {
    gap: 4,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  recurringTaskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recurringTaskStatusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  recurringTaskStatusText: {
    ...typography.xs,
    fontWeight: '700',
  },
  recurringTaskNext: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  showMoreText: {
    ...typography.label,
    color: colors.primaryDark,
  },
});
