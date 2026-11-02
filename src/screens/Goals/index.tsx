import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography, shadow } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { GoalCard } from '@/components/GoalCard';
import { DraggableList } from '@/components/DraggableList';
import { ProgressRing } from '@/components/ProgressRing';
import { CreateGoalScreen } from './CreateGoal';
import { GoalDetailScreen } from './GoalDetail';
import type { Goal, GoalTaskForToday, GoalTaskRecurrenceType } from '@/types/goal.types';
import * as Haptics from 'expo-haptics';
import { calcGoalProgress } from '@/services/goals.service';
import { NotebooksScreen } from './NotebooksScreen';
import { useNotebookStore } from '@/store/notebookStore';
import { MultiSelectModal } from '@/components/MultiSelectModal';

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
    case 'every_x_days':
      return `A cada ${count} dia(s)`;
    case 'none':
      return 'Total';
    default:
      return '';
  }
}

function isTaskVisibleForFilter(t: GoalTaskForToday, filter: TaskFilter): boolean {
  const { task, isDue } = t;
  if (task.type === 'notebook') return false;

  if (task.type === 'wildcard') {
    if (task.completedCount >= task.targetCount) return false;
    return filter === 'free';
  }

  if (!isDue) return false;

  switch (filter) {
    case 'all':
      return true;
    case 'daily':
      return task.recurrenceType === 'daily' || task.recurrenceType === 'specific_days';
    case 'weekly':
      return task.recurrenceType === 'times_per_week' && !task.completedToday;
    case 'monthly':
      return task.recurrenceType === 'times_per_month';
    case 'free':
      return task.recurrenceType === 'none';
    default:
      return true;
  }
}

export function GoalsScreen() {
  const goals = useGoalStore((state) => state.goals);
  const todayGoalTasks = useGoalStore((state) => state.todayGoalTasks);
  const loading = useGoalStore((state) => state.loading);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);
  const completeTask = useGoalStore((state) => state.completeTask);
  const uncompleteTask = useGoalStore((state) => state.uncompleteTask);
  const reorderGoals = useGoalStore((state) => state.reorderGoals);

  const notebooks = useNotebookStore((state) => state.notebooks);
  const fetchNotebooks = useNotebookStore((state) => state.fetchNotebooks);
  const toggleTopic = useNotebookStore((state) => state.toggleTopic);

  const [screen, setScreen] = useState<Screen>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showTodayTasks, setShowTodayTasks] = useState(true);
  const [showAllGoals, setShowAllGoals] = useState(true);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotebooks, setShowNotebooks] = useState(true);
  const [showNotebookPicker, setShowNotebookPicker] = useState(false);
  const [openCreateNotebookOnMount, setOpenCreateNotebookOnMount] = useState(false);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [notebookSelectionInitialized, setNotebookSelectionInitialized] = useState(false);
  const knownNotebookIdsRef = useRef<Set<string>>(new Set());
  const notebookPickerItems = useMemo(
    () =>
      notebooks.map((notebook) => ({
        id: notebook.id,
        title: notebook.title,
        meta: `${notebook.completedTopics}/${notebook.totalTopics} tópicos`,
      })),
    [notebooks],
  );

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
    await Promise.all([fetchGoals(true), fetchNotebooks(true)]);
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

  const activeGoals = goals.filter((g) => !g.archived);
  const archivedGoals = goals.filter((g) => g.archived);
  const visibleTodayTasks = todayGoalTasks.filter((task) =>
    isTaskVisibleForFilter(task, taskFilter),
  );

  const pendingTodayTasks = todayGoalTasks.filter(({ task, isDue }) => {
    if (!isDue) return false;
    if (task.type === 'wildcard') return task.completedCount < task.targetCount;
    if (task.recurrenceType === 'none') return true;
    return !task.completedToday;
  }).length;

  if (screen === 'notebooks') {
    return (
      <NotebooksScreen
        openCreateOnMount={openCreateNotebookOnMount}
        onBack={() => {
          void fetchNotebooks();
          setOpenCreateNotebookOnMount(false);
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
          void fetchGoals();
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

  return (
    <View style={globalStyles.screen}>
      <Header title="Metas" />

      {loading ? (
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.navigationActions}>
            <TouchableOpacity
              style={styles.navigationAction}
              onPress={() => setScreen('create')}
              activeOpacity={0.78}
            >
              <View style={[styles.navigationActionIcon, styles.navigationActionIconPrimary]}>
                <MaterialCommunityIcons name="flag-plus-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.navigationActionText}>Criar nova meta</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navigationAction, styles.navigationActionLast]}
              onPress={() => {
                setOpenCreateNotebookOnMount(false);
                setScreen('notebooks');
              }}
              activeOpacity={0.78}
            >
              <View style={[styles.navigationActionIcon, styles.navigationActionIconNotebook]}>
                <MaterialCommunityIcons
                  name="book-open-page-variant-outline"
                  size={20}
                  color={colors.info}
                />
              </View>
              <Text style={styles.navigationActionText}>Abrir cadernos</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {activeGoals.length > 0 && (
            <View style={styles.sectionBlock}>
              <TouchableOpacity
                style={styles.minimalToggle}
                onPress={() => setShowTodayTasks((value) => !value)}
                activeOpacity={0.7}
              >
                <Text style={styles.minimalToggleText}>Hábitos e tarefas de hoje</Text>
                <View style={styles.minimalToggleRight}>
                  <MaterialCommunityIcons
                    name={showTodayTasks ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {showTodayTasks && (
                <View style={styles.todaySectionContent}>
                  <View style={styles.filterRowMinimal}>
                    {TASK_FILTERS.map((filter) => (
                      <TouchableOpacity
                        key={filter.key}
                        style={[
                          styles.filterChipMinimal,
                          taskFilter === filter.key && styles.filterChipMinimalActive,
                        ]}
                        onPress={() => setTaskFilter(filter.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipTextMinimal,
                            taskFilter === filter.key && styles.filterChipTextMinimalActive,
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {visibleTodayTasks.length === 0 ? (
                    <Text style={styles.minimalEmptyText}>Nenhuma tarefa no momento</Text>
                  ) : (
                    <View style={styles.todayTaskList}>
                      {visibleTodayTasks.map(({ task, goalTitle, goalColor }) => {
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
                                <View style={styles.goalBadge}>
                                  <View
                                    style={[styles.goalBadgeDot, { backgroundColor: accent }]}
                                  />
                                  <Text style={styles.todayTaskGoal}>{goalTitle}</Text>
                                </View>
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
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.sectionBlock}>
            <TouchableOpacity
              style={styles.minimalToggle}
              onPress={() => setShowAllGoals((value) => !value)}
              activeOpacity={0.7}
            >
              <Text style={styles.minimalToggleText}>Todas as metas</Text>
              <View style={styles.minimalToggleRight}>
                <MaterialCommunityIcons
                  name={showAllGoals ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {showAllGoals &&
              (activeGoals.length > 0 ? (
                <View style={styles.goalsListWrap}>
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
                </View>
              ) : (
                <View style={styles.compactEmptyRow}>
                  <MaterialCommunityIcons
                    name="flag-outline"
                    size={20}
                    color={colors.textDisabled}
                  />
                  <Text style={styles.compactEmptyText}>Nenhuma meta criada</Text>
                  <TouchableOpacity onPress={() => setScreen('create')} activeOpacity={0.7}>
                    <Text style={styles.compactEmptyAction}>Criar</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>

          <View style={[styles.sectionBlock, styles.notebookBlock]}>
            <View style={styles.notebookSectionHeader}>
              <TouchableOpacity
                style={styles.minimalToggleNotebook}
                onPress={() => setShowNotebooks((value) => !value)}
                activeOpacity={0.7}
              >
                <Text style={styles.minimalToggleText}>Cadernos de estudo</Text>
                <View style={styles.minimalToggleRight}>
                  <MaterialCommunityIcons
                    name={showNotebooks ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {notebooks.length > 0 && (
                <TouchableOpacity
                  style={styles.notebookSelectAction}
                  onPress={() => setShowNotebookPicker(true)}
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <MaterialCommunityIcons
                    name="tune-variant"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {showNotebooks &&
              (notebooks.length === 0 ? (
                <View style={styles.compactEmptyRow}>
                  <MaterialCommunityIcons
                    name="book-open-outline"
                    size={20}
                    color={colors.textDisabled}
                  />
                  <Text style={styles.compactEmptyText}>Nenhum caderno criado</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setOpenCreateNotebookOnMount(true);
                      setScreen('notebooks');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.compactEmptyAction, { color: colors.info }]}>Criar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.notebookTopicsList}>
                  {selectedNotebookIds
                    .map((id) => notebooks.find((notebook) => notebook.id === id))
                    .filter((notebook): notebook is (typeof notebooks)[number] => Boolean(notebook))
                    .map((notebook) => {
                      const nextTopic = notebook.topics.find((topic) => !topic.completed);
                      const hasTopics = notebook.totalTopics > 0;
                      const percentage = Math.round(notebook.progress * 100);

                      return (
                        <View key={notebook.id} style={styles.notebookItem}>
                          <View style={styles.notebookItemTop}>
                            <View style={styles.notebookItemIcon}>
                              <MaterialCommunityIcons
                                name="book-open-outline"
                                size={18}
                                color={colors.info}
                              />
                            </View>
                            <View style={styles.notebookItemMain}>
                              <Text style={styles.notebookItemTitle} numberOfLines={1}>
                                {notebook.title}
                              </Text>
                              <Text style={styles.notebookItemMeta}>
                                {notebook.completedTopics}/{notebook.totalTopics} tópicos
                              </Text>
                            </View>
                            {nextTopic ? (
                              <TouchableOpacity
                                style={styles.notebookTopicCheck}
                                onPress={async () => {
                                  Haptics.selectionAsync().catch(() => {});
                                  await toggleTopic(nextTopic.id, true);
                                }}
                                activeOpacity={0.7}
                                hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
                              >
                                <MaterialCommunityIcons
                                  name="checkbox-blank-circle-outline"
                                  size={22}
                                  color={colors.info}
                                />
                              </TouchableOpacity>
                            ) : (
                              <MaterialCommunityIcons
                                name="check-circle"
                                size={22}
                                color={colors.success}
                              />
                            )}
                          </View>

                          {nextTopic ? (
                            <View style={styles.notebookNextTopic}>
                              <Text style={styles.notebookNextTitle} numberOfLines={2}>
                                {nextTopic.title}
                              </Text>
                            </View>
                          ) : hasTopics ? (
                            <View style={styles.notebookCompleteState}>
                              <Text style={styles.notebookCompleteText}>Caderno concluído</Text>
                            </View>
                          ) : (
                            <View style={styles.notebookCompleteState}>
                              <Text style={styles.notebookEmptyTopicText}>
                                Nenhum tópico adicionado
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}

                  {selectedNotebookIds.length === 0 && (
                    <View style={styles.notebookEmptySelection}>
                      <Text style={styles.notebookEmptySelectionText}>
                        Nenhum caderno selecionado.
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowNotebookPicker(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.notebookEmptySelectionAction}>Selecionar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
          </View>

          {archivedGoals.length > 0 && (
            <View style={styles.sectionBlock}>
              <TouchableOpacity
                style={styles.minimalToggle}
                onPress={() => setShowArchived((value) => !value)}
                activeOpacity={0.7}
              >
                <Text style={styles.minimalToggleText}>Metas concluídas</Text>
                <View style={styles.minimalToggleRight}>
                  <Text style={styles.minimalToggleCount}>{archivedGoals.length}</Text>
                  <MaterialCommunityIcons
                    name={showArchived ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {showArchived && (
                <View style={styles.archivedList}>
                  {archivedGoals.map((goal) => {
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
                            {goal.archivedAt
                              ? `Arquivada em ${new Date(goal.archivedAt).toLocaleDateString(
                                  'pt-BR',
                                  {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  },
                                )}`
                              : 'Data de arquivamento não registrada'}
                          </Text>
                        </View>
                        <ProgressRing progress={progress} size={40} color={accent} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <MultiSelectModal
        visible={showNotebookPicker}
        title="Cadernos exibidos"
        subtitle="Escolha quais aparecem na aba Metas."
        items={notebookPickerItems}
        selectedIds={selectedNotebookIds}
        onToggle={(id) =>
          setSelectedNotebookIds((current) =>
            current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
          )
        }
        onSelectAll={() => setSelectedNotebookIds(notebooks.map((notebook) => notebook.id))}
        onDeselectAll={() => setSelectedNotebookIds([])}
        onConfirm={() => setShowNotebookPicker(false)}
        onCancel={() => setShowNotebookPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navigationActions: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  navigationAction: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  navigationActionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationActionIconPrimary: {
    backgroundColor: colors.primaryLight,
  },
  navigationActionIconNotebook: {
    backgroundColor: '#EAF5FC',
  },
  navigationActionText: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },
  navigationActionLast: {
    borderBottomWidth: 0,
  },
  minimalToggle: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimalToggleNotebook: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimalToggleText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  minimalToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  minimalToggleCount: {
    ...typography.xs,
    color: colors.textDisabled,
    fontWeight: '700',
  },
  todaySectionContent: {
    gap: spacing.sm,
  },
  filterRowMinimal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChipMinimal: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipMinimalActive: {
    backgroundColor: colors.primaryLight,
  },
  filterChipTextMinimal: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextMinimalActive: {
    color: colors.primaryDark,
  },
  minimalEmptyText: {
    ...typography.xs,
    color: colors.textDisabled,
    paddingVertical: spacing.xs,
  },
  goalsListWrap: {
    gap: spacing.sm,
  },
  reorderHintCompact: {
    ...typography.xs,
    color: colors.textDisabled,
    paddingHorizontal: 2,
  },
  compactEmptyRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  compactEmptyText: {
    ...typography.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  compactEmptyAction: {
    ...typography.xs,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  notebookSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notebookSelectAction: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  introCopy: { flex: 1, gap: 4 },
  introTitle: { ...typography.h3, color: colors.textPrimary },
  introSubtitle: { ...typography.sm, color: colors.textSecondary },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadow.sm,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  actionButtonTextPrimary: {
    color: colors.textOnPrimary,
  },

  sectionBlock: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  sectionHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconMuted: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  sectionTitleWrap: { flex: 1, gap: 1 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  sectionSubtitle: { ...typography.xs, color: colors.textSecondary },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  textActionLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadow.sm,
  },

  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  inlineEmptyCopy: { flex: 1, gap: 2 },
  inlineEmptyTitle: { ...typography.label, color: colors.textPrimary },
  inlineEmptyText: { ...typography.xs, color: colors.textSecondary, lineHeight: 17 },
  inlineEmptyAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  inlineEmptyActionText: {
    ...typography.xs,
    color: colors.primaryDark,
    fontWeight: '700',
  },

  reorderHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  reorderHintText: { ...typography.xs, color: colors.textDisabled },

  filterHeader: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterHeaderLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '700',
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

  taskEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  taskEmptyTitle: { ...typography.label, color: colors.textPrimary },
  taskEmptyText: { ...typography.xs, color: colors.textSecondary, textAlign: 'center' },
  todayTaskList: { gap: spacing.sm },
  todayTask: {
    borderLeftWidth: 4,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  todayTaskLeft: { flex: 1, gap: 3, paddingRight: spacing.sm },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goalBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  todayTaskGoal: {
    ...typography.xs,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todayTaskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayTaskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  todayTaskRec: { ...typography.xs, color: colors.textSecondary },
  todayTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
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
  doneBtnDisabled: { opacity: 0.42 },
  miniProgress: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', borderRadius: radius.full },

  notebookBlock: {
    marginTop: spacing.xs,
  },
  notebookSectionCard: {
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: '#DCECF8',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  notebookToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#DCECF8',
  },
  notebookToolbarTitle: { ...typography.label, color: colors.textPrimary },
  notebookToolbarSubtitle: { ...typography.xs, color: colors.textSecondary, marginTop: 2 },
  notebookAddLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#CFE3F1',
  },
  notebookAddLabelText: { ...typography.xs, fontWeight: '700', color: colors.info },
  notebookTopicsList: { gap: spacing.sm, paddingTop: spacing.sm },
  notebookItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 5,
  },
  notebookItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notebookItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5FC',
  },
  notebookItemMain: { flex: 1, gap: 1 },
  notebookItemTitle: { ...typography.label, color: colors.textPrimary },
  notebookItemMeta: { ...typography.xs, color: colors.textSecondary },
  notebookTopicCheck: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FD',
  },
  notebookNextTopic: {
    paddingLeft: 40,
    paddingRight: spacing.sm,
  },
  notebookNextLabel: {
    ...typography.xs,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  notebookNextTitle: {
    ...typography.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notebookCompleteState: {
    paddingLeft: 40,
  },
  notebookCompleteText: { ...typography.xs, color: colors.success, fontWeight: '600' },
  notebookEmptyTopicText: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  notebookEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notebookEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5FC',
  },
  notebookEmptySelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  notebookEmptySelectionText: { ...typography.xs, color: colors.textSecondary, flex: 1 },
  notebookEmptySelectionAction: { ...typography.xs, fontWeight: '700', color: colors.info },

  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  archivedToggleMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  archivedToggleTitle: { ...typography.label, color: colors.textPrimary },
  archivedToggleSubtitle: { ...typography.xs, color: colors.textSecondary, marginTop: 1 },
  archivedList: { gap: spacing.sm, paddingTop: spacing.sm },
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
