import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { GoalCard } from '@/components/GoalCard';
import { DraggableList } from '@/components/DraggableList';
import { EmptyState } from '@/components/EmptyState';
import { ProgressRing } from '@/components/ProgressRing';
import { CreateGoalScreen } from './CreateGoal';
import { GoalDetailScreen } from './GoalDetail';
import type { Goal, GoalTaskRecurrenceType } from '@/types/goal.types';
import type { GoalTaskForToday } from '@/database/queries/goals.queries';
import * as Haptics from 'expo-haptics';
import { calcGoalProgress } from '@/services/goals.service';
import { NotebooksScreen } from './NotebooksScreen';
import { useNotebookStore } from '@/store/notebookStore';

type Screen = 'list' | 'create' | 'detail' | 'notebooks';
type TaskFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'free';

const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'daily', label: 'Diárias' },
  { key: 'weekly', label: 'Semanais' },
  { key: 'monthly', label: 'Mensais' },
  { key: 'free', label: 'Livres' },
];

function recurrenceShortLabel(type: GoalTaskRecurrenceType, count: number): string {
  switch (type) {
    case 'daily':
      return 'Diário';
    case 'times_per_week':
      return `${count}x/sem`;
    case 'times_per_month':
      return `${count}x/mês`;
    case 'specific_days':
      return 'Dias espec.';
    case 'none':
      return 'Total';
    default:
      return '';
  }
}

function isTaskVisibleForFilter(t: GoalTaskForToday, filter: TaskFilter): boolean {
  const { task, isDue } = t;

  if (task.type === 'wildcard') {
    if (task.completedCount >= task.targetCount) return false;

    return filter === 'free';
  }

  if (!isDue) return false;

  switch (filter) {
    case 'all':
      if (task.recurrenceType === 'none' && task.completedToday) {
        return true;
      }
      return true;
    case 'daily':
      return task.recurrenceType === 'daily' || task.recurrenceType === 'specific_days';
    case 'weekly':
      return task.recurrenceType === 'times_per_week';
    case 'monthly':
      return task.recurrenceType === 'times_per_month';
    case 'free':
      return task.recurrenceType === 'none';
    default:
      return true;
  }
}

export function GoalsScreen() {
  const { goals, todayGoalTasks, loading, fetchGoals, completeTask, uncompleteTask, reorderGoals } =
    useGoalStore();
  const { notebooks, fetchNotebooks, toggleTopic } = useNotebookStore();
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showTodayTasks, setShowTodayTasks] = useState(true);
  const [showAllGoals, setShowAllGoals] = useState(true);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotebooks, setShowNotebooks] = useState(true);
  const [showNotebookPicker, setShowNotebookPicker] = useState(false);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [notebookSelectionInitialized, setNotebookSelectionInitialized] = useState(false);
  const knownNotebookIdsRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void fetchGoals();
      void fetchNotebooks();
    }, [fetchGoals, fetchNotebooks]),
  );

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen !== 'list') {
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
    const currentIds = new Set(notebooks.map((notebook) => notebook.id));
    const newIds = notebooks
      .filter((notebook) => !knownNotebookIdsRef.current.has(notebook.id))
      .map((notebook) => notebook.id);

    setSelectedNotebookIds((current) => {
      if (!notebookSelectionInitialized) return notebooks.map((notebook) => notebook.id);
      const kept = current.filter((id) => currentIds.has(id));
      return Array.from(new Set([...kept, ...newIds]));
    });

    knownNotebookIdsRef.current = currentIds;
    if (!notebookSelectionInitialized && notebooks.length > 0) {
      setNotebookSelectionInitialized(true);
    }
  }, [notebooks, notebookSelectionInitialized]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchGoals(), fetchNotebooks()]);
    setRefreshing(false);
  }

  async function handleCompleteTask(goalId: string, taskId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await completeTask(goalId, taskId);
  }

  async function handleUncompleteTask(goalId: string, taskId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await uncompleteTask(goalId, taskId);
  }

  if (screen === 'notebooks') {
    return (
      <NotebooksScreen
        onBack={() => {
          void fetchNotebooks();
          setScreen('list');
        }}
      />
    );
  }

  if (screen === 'create') {
    return (
      <CreateGoalScreen
        onBack={() => setScreen('list')}
        onSuccess={() => {
          fetchGoals();
          setScreen('list');
        }}
      />
    );
  }

  if (screen === 'detail' && selectedGoal) {
    const current = goals.find((g) => g.id === selectedGoal.id) ?? selectedGoal;
    return (
      <GoalDetailScreen
        goal={current}
        onBack={() => setScreen('list')}
        onDeleted={() => setScreen('list')}
      />
    );
  }

  const activeGoals = goals.filter((g) => !g.archived);
  const archivedGoals = goals.filter((g) => g.archived);
  const visibleTodayTasks = todayGoalTasks.filter((t) => isTaskVisibleForFilter(t, taskFilter));

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Metas"
        rightAction={{
          icon: 'book-open-page-variant-outline',
          onPress: () => setScreen('notebooks'),
        }}
      />

      {loading ? (
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeGoals}
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
          ListEmptyComponent={
            activeGoals.length === 0 && archivedGoals.length === 0 ? (
              <EmptyState
                icon="flag-outline"
                title="Nenhuma meta criada"
                description="Defina metas com hábitos e tarefas para acompanhar seu progresso"
                actionLabel="Criar meta"
                onAction={() => setScreen('create')}
              />
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            activeGoals.length > 0 || archivedGoals.length > 0 ? (
              <View style={styles.sectionsContainer}>
                <View style={styles.notebookSection}>
                  <View style={styles.notebookToggleRow}>
                    <TouchableOpacity
                      style={styles.notebookToggle}
                      onPress={() => setShowNotebooks((previous) => !previous)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="book-open-page-variant-outline"
                        size={17}
                        color={colors.primary}
                      />
                      <Text style={styles.notebookEntryText}>Cadernos de estudo</Text>
                      <MaterialCommunityIcons
                        name={showNotebooks ? 'chevron-up' : 'chevron-down'}
                        size={17}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notebookAddButton}
                      onPress={() => setShowNotebookPicker(true)}
                      activeOpacity={0.7}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {showNotebooks &&
                    (notebooks.length === 0 ? (
                      <Text style={styles.filterEmptyText}>Nenhum caderno</Text>
                    ) : (
                      <View style={styles.notebookTopicsList}>
                        {selectedNotebookIds
                          .map((id) => notebooks.find((notebook) => notebook.id === id))
                          .filter((notebook): notebook is (typeof notebooks)[number] =>
                            Boolean(notebook),
                          )
                          .map((notebook) => {
                            const nextTopic = notebook.topics.find((topic) => !topic.completed);
                            if (!nextTopic) return null;

                            return (
                              <Card key={notebook.id} style={styles.notebookTopicCard}>
                                <TouchableOpacity
                                  style={styles.notebookTopicRow}
                                  onPress={async () => {
                                    await toggleTopic(nextTopic.id, true);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <MaterialCommunityIcons
                                    name="checkbox-blank-circle-outline"
                                    size={21}
                                    color={colors.textDisabled}
                                  />
                                  <View style={styles.notebookTopicText}>
                                    <Text style={styles.notebookTopicTitle} numberOfLines={2}>
                                      {nextTopic.title}
                                    </Text>
                                    <Text style={styles.notebookTopicNotebook}>
                                      {notebook.title}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              </Card>
                            );
                          })}
                        {selectedNotebookIds.every((id) => {
                          const notebook = notebooks.find((item) => item.id === id);
                          return !notebook || !notebook.topics.some((topic) => !topic.completed);
                        }) && <Text style={styles.filterEmptyText}>Nenhum tópico pendente</Text>}
                      </View>
                    ))}
                </View>
                {activeGoals.length > 0 && (
                  <View style={styles.todaySection}>
                    <TouchableOpacity
                      style={styles.sectionToggle}
                      onPress={() => setShowTodayTasks((p) => !p)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionToggleText}>Hábitos e tarefas de hoje</Text>
                      <MaterialCommunityIcons
                        name={showTodayTasks ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {showTodayTasks && (
                      <View style={styles.filterRow}>
                        {TASK_FILTERS.map((f) => (
                          <TouchableOpacity
                            key={f.key}
                            style={[
                              styles.filterChip,
                              taskFilter === f.key && styles.filterChipActive,
                            ]}
                            onPress={() => setTaskFilter(f.key)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.filterChipText,
                                taskFilter === f.key && styles.filterChipTextActive,
                              ]}
                            >
                              {f.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {showTodayTasks &&
                      (visibleTodayTasks.length === 0 ? (
                        <Text style={styles.filterEmptyText}>Nenhuma tarefa no momento</Text>
                      ) : (
                        visibleTodayTasks.map(({ task, goalTitle, goalColor }) => {
                          const accent = goalColor ?? colors.primary;
                          const canComplete =
                            task.type === 'wildcard'
                              ? !task.completedToday
                              : task.recurrenceType === 'daily' ||
                                  task.recurrenceType === 'specific_days'
                                ? !task.completedToday
                                : true;

                          return (
                            <Card
                              key={task.id}
                              style={[styles.todayTask, { borderLeftColor: accent }]}
                            >
                              <View style={globalStyles.rowBetween}>
                                <View style={styles.todayTaskLeft}>
                                  <Text style={styles.todayTaskGoal}>{goalTitle}</Text>
                                  <View style={styles.todayTaskTitleRow}>
                                    {task.type === 'wildcard' && (
                                      <MaterialCommunityIcons
                                        name="lightning-bolt"
                                        size={14}
                                        color="#FFD700"
                                      />
                                    )}
                                    <Text style={styles.todayTaskTitle}>{task.title}</Text>
                                  </View>
                                  {task.type !== 'wildcard' && (
                                    <Text style={styles.todayTaskRec}>
                                      {recurrenceShortLabel(
                                        task.recurrenceType,
                                        task.recurrenceCount,
                                      )}
                                      {' · '}
                                      {task.completedCount}/{task.targetCount} total
                                    </Text>
                                  )}
                                </View>

                                <View style={styles.todayTaskActions}>
                                  {(task.completedToday ||
                                    task.completionsThisWeek > 0 ||
                                    task.completionsThisMonth > 0) && (
                                    <TouchableOpacity
                                      style={styles.undoBtn}
                                      onPress={() => handleUncompleteTask(task.goalId, task.id)}
                                      activeOpacity={0.7}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      <MaterialCommunityIcons
                                        name="undo"
                                        size={16}
                                        color={colors.textDisabled}
                                      />
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity
                                    style={[
                                      styles.doneBtn,
                                      { backgroundColor: accent },
                                      !canComplete && styles.doneBtnDisabled,
                                    ]}
                                    onPress={() => handleCompleteTask(task.goalId, task.id)}
                                    disabled={!canComplete}
                                    activeOpacity={0.8}
                                  >
                                    <MaterialCommunityIcons
                                      name={
                                        task.completedToday
                                          ? 'plus'
                                          : task.type === 'wildcard'
                                            ? 'lightning-bolt'
                                            : 'plus'
                                      }
                                      size={18}
                                      color={colors.textOnPrimary}
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {task.type !== 'wildcard' && (
                                <View style={styles.miniProgress}>
                                  <View
                                    style={[
                                      styles.miniProgressFill,
                                      {
                                        width: `${Math.min(task.completedCount / task.targetCount, 1) * 100}%`,
                                        backgroundColor: accent,
                                      },
                                    ]}
                                  />
                                </View>
                              )}
                            </Card>
                          );
                        })
                      ))}
                  </View>
                )}

                {activeGoals.length > 0 && (
                  <TouchableOpacity
                    style={styles.sectionToggle}
                    onPress={() => setShowAllGoals((p) => !p)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sectionToggleText}>Todas as metas</Text>
                    <MaterialCommunityIcons
                      name={showAllGoals ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}

                {showAllGoals && (
                  <DraggableList
                    data={activeGoals}
                    keyExtractor={(item) => item.id}
                    onReorder={(newOrder) => reorderGoals(newOrder.map((g) => g.id))}
                    renderItem={(item) => (
                      <GoalCard
                        goal={item}
                        draggable={activeGoals.length > 1}
                        onPress={(g) => {
                          setSelectedGoal(g);
                          setScreen('detail');
                        }}
                      />
                    )}
                  />
                )}

                {archivedGoals.length > 0 && (
                  <View style={styles.archivedSection}>
                    <TouchableOpacity
                      style={styles.sectionToggle}
                      onPress={() => setShowArchived((p) => !p)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionToggleText}>Metas concluídas</Text>
                      <MaterialCommunityIcons
                        name={showArchived ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {showArchived &&
                      archivedGoals.map((goal) => {
                        const progress = calcGoalProgress(goal);
                        const accent = goal.color ?? colors.primary;
                        return (
                          <TouchableOpacity
                            key={goal.id}
                            style={styles.archivedCard}
                            onPress={() => {
                              setSelectedGoal(goal);
                              setScreen('detail');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.archivedDot, { backgroundColor: accent }]} />
                            <View style={styles.archivedInfo}>
                              <Text style={styles.archivedTitle} numberOfLines={1}>
                                {goal.title}
                              </Text>
                              <Text style={styles.archivedDates}>
                                {new Date(goal.endDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </Text>
                            </View>
                            <ProgressRing progress={progress} size={40} color={accent} />
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </View>
            ) : null
          }
          renderItem={() => null}
        />
      )}

      <Modal
        visible={showNotebookPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotebookPicker(false)}
      >
        <View style={styles.notebookModalOverlay}>
          <View style={styles.notebookModalCard}>
            <View style={styles.notebookModalHeader}>
              <Text style={styles.notebookModalTitle}>Adicionar caderno</Text>
              <TouchableOpacity onPress={() => setShowNotebookPicker(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {notebooks.filter((notebook) => !selectedNotebookIds.includes(notebook.id)).length ===
            0 ? (
              <Text style={styles.filterEmptyText}>Nenhum caderno</Text>
            ) : (
              notebooks
                .filter((notebook) => !selectedNotebookIds.includes(notebook.id))
                .map((notebook) => (
                  <TouchableOpacity
                    key={notebook.id}
                    style={styles.notebookPickerItem}
                    onPress={() => {
                      setSelectedNotebookIds((current) => [...current, notebook.id]);
                      setShowNotebookPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="book-open-outline"
                      size={19}
                      color={colors.primary}
                    />
                    <Text style={styles.notebookPickerText}>{notebook.title}</Text>
                    <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                  </TouchableOpacity>
                ))
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xxl },

  notebookSection: { gap: spacing.xs },
  notebookToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  notebookToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  notebookEntryText: { ...typography.label, color: colors.textPrimary, flex: 1 },
  notebookAddButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notebookTopicsList: { gap: spacing.xs },
  notebookTopicCard: { padding: spacing.sm },
  notebookTopicRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notebookTopicText: { flex: 1, gap: 2 },
  notebookTopicTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  notebookTopicNotebook: { ...typography.xs, color: colors.textSecondary },
  notebookModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  notebookModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  notebookModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  notebookModalTitle: { ...typography.h3, color: colors.textPrimary },
  notebookPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  notebookPickerText: { flex: 1, ...typography.body, color: colors.textPrimary },
  sectionsContainer: { gap: spacing.md },

  todaySection: { gap: spacing.sm },

  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  sectionToggleText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  filterEmptyText: {
    ...typography.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },

  todayTask: { borderLeftWidth: 4, gap: spacing.sm, paddingVertical: spacing.sm },
  todayTaskLeft: { flex: 1, gap: 2 },
  todayTaskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todayTaskGoal: {
    ...typography.xs,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todayTaskTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  todayTaskRec: { ...typography.xs, color: colors.textSecondary },
  todayTaskActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  undoBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnDisabled: { opacity: 0.4 },
  miniProgress: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', borderRadius: radius.full },

  dragHint: {
    ...typography.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginTop: -spacing.xs,
  },

  archivedSection: { gap: spacing.sm },
  archivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  archivedDot: { width: 8, height: 8, borderRadius: radius.full },
  archivedInfo: { flex: 1, gap: 2 },
  archivedTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  archivedDates: { ...typography.xs, color: colors.textDisabled },
});
