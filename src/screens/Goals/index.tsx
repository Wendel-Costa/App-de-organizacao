import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { GoalCard } from '@/components/GoalCard';
import { EmptyState } from '@/components/EmptyState';
import { CreateGoalScreen } from './CreateGoal';
import { GoalDetailScreen } from './GoalDetail';
import type { Goal, GoalTaskRecurrenceType } from '@/types/goal.types';
import * as Haptics from 'expo-haptics';

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

  useEffect(() => {
    fetchGoals();
  }, []);

  async function handleCompleteTask(goalId: string, taskId: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await completeTask(goalId, taskId);
  }

  async function handleUncompleteTask(goalId: string, taskId: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await uncompleteTask(goalId, taskId);
  }

  function handlePress(goal: Goal) {
    setSelectedGoal(goal);
    setScreen('detail');
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
          data={goals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="flag-outline"
              title="Nenhuma meta criada"
              description="Defina metas com hábitos e tarefas para acompanhar seu progresso"
              actionLabel="Criar meta"
              onAction={() => setScreen('create')}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            dueTodayTasks.length > 0 ? (
              <View style={styles.todaySection}>
                <Text style={styles.todaySectionTitle}>
                  Hábitos e tarefas de hoje ({dueTodayTasks.length})
                </Text>

                {dueTodayTasks.map(({ task, goalTitle, goalColor }) => {
                  const accentColor = goalColor ?? colors.primary;
                  const canComplete =
                    task.recurrenceType === 'daily' || task.recurrenceType === 'specific_days'
                      ? !task.completedToday
                      : true;

                  return (
                    <Card
                      key={task.id}
                      style={[styles.todayTask, { borderLeftColor: accentColor }]}
                    >
                      <View style={globalStyles.rowBetween}>
                        <View style={styles.todayTaskLeft}>
                          <Text style={styles.todayTaskGoal}>{goalTitle}</Text>
                          <Text style={styles.todayTaskTitle}>{task.title}</Text>
                          <Text style={styles.todayTaskRec}>
                            {recurrenceShortLabel(task.recurrenceType, task.recurrenceCount)}
                            {' · '}
                            {task.completedCount}/{task.targetCount} total
                          </Text>
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
                              { backgroundColor: accentColor },
                              !canComplete && styles.doneBtnDisabled,
                            ]}
                            onPress={() => handleCompleteTask(task.goalId, task.id)}
                            disabled={!canComplete}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons
                              name={task.completedToday ? 'check' : 'plus'}
                              size={18}
                              color={colors.textOnPrimary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.miniProgress}>
                        <View
                          style={[
                            styles.miniProgressFill,
                            {
                              width: `${Math.min(task.completedCount / task.targetCount, 1) * 100}%`,
                              backgroundColor: accentColor,
                            },
                          ]}
                        />
                      </View>
                    </Card>
                  );
                })}

                {goals.length > 0 && <Text style={styles.goalsListTitle}>Todas as metas</Text>}
              </View>
            ) : goals.length > 0 ? (
              <Text style={styles.goalsListTitle}>Todas as metas</Text>
            ) : null
          }
          renderItem={({ item }) => <GoalCard goal={item} onPress={handlePress} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  todaySection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  todaySectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  todayTask: {
    borderLeftWidth: 4,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  todayTaskLeft: {
    flex: 1,
    gap: 2,
  },
  todayTaskGoal: {
    ...typography.xs,
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todayTaskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  todayTaskRec: {
    ...typography.xs,
    color: colors.textSecondary,
  },
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
  doneBtnDisabled: {
    opacity: 0.4,
  },
  miniProgress: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  goalsListTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
