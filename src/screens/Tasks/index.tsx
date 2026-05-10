import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { useFocusStore } from '@/store/focusStore';
import { useGoalStore } from '@/store/goalStore';
import { TaskItem } from '@/components/TaskItem';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { CreateTaskScreen } from './CreateTask';
import { TaskDetailScreen } from './TaskDetail';
import type { Task, RecurrenceDay } from '@/types/task.types';

type Filter = 'all' | 'today' | 'anytime' | 'recurring';
type Screen = 'list' | 'create' | 'detail' | 'edit';

const COMPLETED_LIMIT = 5;

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoje' },
  { key: 'anytime', label: 'Livre' },
  { key: 'recurring', label: 'Rotina' },
];

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getTodayWeekday(): RecurrenceDay {
  const days: RecurrenceDay[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[new Date().getDay()];
}

export function TasksScreen() {
  const { tasks, loading, fetchTasks, toggleComplete, removeTask } = useTaskStore();
  const { fetchThemes } = useFocusStore();
  const { goals, todayGoalTasks, fetchGoals, completeTask, uncompleteTask } = useGoalStore();

  const [filter, setFilter] = useState<Filter>('all');
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchThemes();
    fetchGoals();
  }, []);

  useEffect(() => {
    setShowAllCompleted(false);
  }, [filter]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchTasks(), fetchThemes(), fetchGoals()]);
    setRefreshing(false);
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'today') {
      if (t.type === 'scheduled') return t.scheduledDate === getTodayString();
      if (t.type === 'recurring') {
        const today = getTodayWeekday();
        return t.recurrenceDays?.includes('daily') || t.recurrenceDays?.includes(today) || false;
      }
      return false;
    }
    if (filter === 'anytime') return t.type === 'anytime';
    if (filter === 'recurring') return t.type === 'recurring';
    return true;
  });

  const pending = filtered.filter((t) => !t.completed);

  const completedSorted = filtered
    .filter((t) => t.completed)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const displayedCompleted = showAllCompleted
    ? completedSorted
    : completedSorted.slice(0, COMPLETED_LIMIT);

  const dueTodayGoalTasks = filter === 'today' ? todayGoalTasks.filter((t) => t.isDue) : [];

  function handlePress(task: Task) {
    setSelectedTask(task);
    setScreen('detail');
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
    return (
      <TaskDetailScreen
        task={tasks.find((t) => t.id === selectedTask.id) ?? selectedTask}
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
          data={[...pending, ...displayedCompleted]}
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
            <>
              {dueTodayGoalTasks.length > 0 && (
                <View style={styles.goalTasksSection}>
                  <Text style={styles.sectionLabel}>Hábitos de metas</Text>
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
          }
          ListEmptyComponent={
            dueTodayGoalTasks.length === 0 ? (
              <EmptyState
                icon="playlist-check"
                title="Nenhuma tarefa aqui"
                description="Toque no + para adicionar uma nova tarefa"
              />
            ) : null
          }
          ListFooterComponent={
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
          }
          renderItem={({ item, index }) => {
            const showCompletedHeader = index === pending.length && displayedCompleted.length > 0;
            return (
              <>
                {showCompletedHeader && (
                  <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                    Concluídas recentes ({completedSorted.length})
                  </Text>
                )}
                <TaskItem
                  task={item}
                  onToggle={toggleComplete}
                  onPress={handlePress}
                  onDelete={removeTask}
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
