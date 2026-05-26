import { useEffect, useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { GoalCard } from '@/components/GoalCard';
import { EmptyState } from '@/components/EmptyState';
import { ProgressRing } from '@/components/ProgressRing';
import { CreateGoalScreen } from './CreateGoal';
import { GoalDetailScreen } from './GoalDetail';
import type { Goal, GoalTaskRecurrenceType } from '@/types/goal.types';
import * as Haptics from 'expo-haptics';
import { calcGoalProgress } from '@/services/goals.service';

type Screen = 'list' | 'create' | 'detail';

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
  }
}

export function GoalsScreen() {
  const { goals, todayGoalTasks, loading, fetchGoals, completeTask, uncompleteTask } =
    useGoalStore();
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchGoals();
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
  const dueTodayTasks = todayGoalTasks.filter((t) => t.isDue);

  return (
    <View style={globalStyles.screen}>
      <Header title="Metas" rightAction={{ icon: 'plus', onPress: () => setScreen('create') }} />

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
            archivedGoals.length === 0 ? (
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
            dueTodayTasks.length > 0 ? (
              <View style={styles.todaySection}>
                <Text style={styles.todaySectionTitle}>
                  Hábitos e tarefas de hoje ({dueTodayTasks.length})
                </Text>

                {dueTodayTasks.map(({ task, goalTitle, goalColor }) => {
                  const accent = goalColor ?? colors.primary;
                  const canComplete =
                    task.type === 'wildcard'
                      ? !task.completedToday
                      : task.recurrenceType === 'daily' || task.recurrenceType === 'specific_days'
                        ? !task.completedToday
                        : true;

                  return (
                    <Card key={task.id} style={[styles.todayTask, { borderLeftColor: accent }]}>
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
                              {recurrenceShortLabel(task.recurrenceType, task.recurrenceCount)}
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
                                  ? 'check'
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

                {activeGoals.length > 0 && (
                  <Text style={styles.goalsListTitle}>Todas as metas</Text>
                )}
              </View>
            ) : activeGoals.length > 0 ? (
              <Text style={styles.goalsListTitle}>Todas as metas</Text>
            ) : null
          }
          ListFooterComponent={
            archivedGoals.length > 0 ? (
              <View style={styles.archivedSection}>
                <TouchableOpacity
                  style={styles.archivedHeader}
                  onPress={() => setShowArchived((p) => !p)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="archive-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.archivedHeaderText}>
                    Metas concluídas ({archivedGoals.length})
                  </Text>
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
            ) : null
          }
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              onPress={(g) => {
                setSelectedGoal(g);
                setScreen('detail');
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.xxl },

  todaySection: { marginBottom: spacing.md, gap: spacing.sm },
  todaySectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
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
  goalsListTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  archivedSection: { marginTop: spacing.xl, gap: spacing.sm },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  archivedHeaderText: { ...typography.label, color: colors.textSecondary, flex: 1 },
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
