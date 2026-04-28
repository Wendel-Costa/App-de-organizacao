import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ProgressRing } from '@/components/ProgressRing';
import { TextInputModal } from '@/components/TextInputModal';
import type { Goal } from '@/types/goal.types';

function calcProgress(goal: Goal): number {
  if (goal.tasks.length === 0) return 0;
  const total = goal.tasks.reduce((acc, t) => acc + t.targetCount, 0);
  const completed = goal.tasks.reduce((acc, t) => acc + t.completedCount, 0);
  return total > 0 ? completed / total : 0;
}

interface GoalDetailScreenProps {
  goal: Goal;
  onBack: () => void;
  onDeleted: () => void;
}

export function GoalDetailScreen({ goal, onBack, onDeleted }: GoalDetailScreenProps) {
  const { addTask, incrementTask, decrementTask, removeTask, removeGoal } = useGoalStore();
  const [showAddTask, setShowAddTask] = useState(false);
  const [targetCount, setTargetCount] = useState(30);

  const progress = calcProgress(goal);
  const accentColor = goal.color ?? colors.primary;

  function handleDelete() {
    Alert.alert('Excluir meta', 'Deseja excluir esta meta e todas as suas tarefas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removeGoal(goal.id);
          onDeleted();
        },
      },
    ]);
  }

  function handleRemoveTask(taskId: string) {
    Alert.alert('Remover tarefa', 'Deseja remover esta tarefa da meta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeTask(goal.id, taskId) },
    ]);
  }

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Detalhe da meta"
        onBack={onBack}
        rightAction={{ icon: 'trash-can-outline', onPress: handleDelete }}
      />

      <TextInputModal
        visible={showAddTask}
        title="Nova tarefa da meta"
        placeholder="Ex: Ver videoaula"
        confirmLabel="Adicionar"
        onConfirm={async (title) => {
          await addTask({ goalId: goal.id, title, targetCount });
          setShowAddTask(false);
        }}
        onCancel={() => setShowAddTask(false)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card elevated style={[styles.headerCard, { borderTopColor: accentColor }]}>
          <View style={globalStyles.rowBetween}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{goal.title}</Text>
              {goal.description && <Text style={styles.description}>{goal.description}</Text>}
              <Text style={styles.period}>
                {new Date(goal.startDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                {' → '}
                {new Date(goal.endDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <ProgressRing progress={progress} size={80} color={accentColor} />
          </View>
        </Card>

        <Card style={styles.configCard}>
          <Text style={styles.configLabel}>Meta padrão por tarefa nova</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              onPress={() => setTargetCount((p) => Math.max(1, p - 1))}
              style={styles.counterBtn}
            >
              <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{targetCount}x</Text>
            <TouchableOpacity
              onPress={() => setTargetCount((p) => Math.min(365, p + 1))}
              style={styles.counterBtn}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.taskHeader}>
          <Text style={styles.sectionTitle}>Tarefas ({goal.tasks.length})</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: accentColor + '22' }]}
            onPress={() => setShowAddTask(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={18} color={accentColor} />
            <Text style={[styles.addBtnLabel, { color: accentColor }]}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {goal.tasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhuma tarefa ainda. Adicione tarefas para acompanhar o progresso desta meta.
            </Text>
          </Card>
        ) : (
          goal.tasks.map((task) => {
            const taskProgress = task.completedCount / task.targetCount;
            return (
              <Card key={task.id} style={styles.taskCard}>
                <View style={globalStyles.rowBetween}>
                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveTask(task.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={colors.textDisabled} />
                  </TouchableOpacity>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(taskProgress, 1) * 100}%`,
                        backgroundColor: accentColor,
                      },
                    ]}
                  />
                </View>

                <View style={globalStyles.rowBetween}>
                  <Text style={styles.taskProgress}>
                    {task.completedCount}/{task.targetCount} vezes
                    {' · '}
                    {Math.round(taskProgress * 100)}%
                  </Text>

                  <View style={styles.taskControls}>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => decrementTask(goal.id, task.id)}
                      disabled={task.completedCount === 0}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={16}
                        color={task.completedCount === 0 ? colors.textDisabled : colors.textPrimary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.controlBtn,
                        styles.controlBtnPrimary,
                        { backgroundColor: accentColor },
                      ]}
                      onPress={() => incrementTask(goal.id, task.id)}
                      disabled={task.completedCount >= task.targetCount}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color={colors.textOnPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        <Button
          label="Excluir meta"
          onPress={handleDelete}
          variant="danger"
          fullWidth
          style={styles.deleteButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  headerCard: {
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  description: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  period: {
    ...typography.xs,
    color: colors.textDisabled,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  configCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configLabel: {
    ...typography.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterValue: {
    ...typography.label,
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  addBtnLabel: {
    ...typography.label,
  },
  emptyCard: {
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 20,
  },
  taskCard: {
    gap: spacing.sm,
  },
  taskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  taskProgress: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  taskControls: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  controlBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlBtnPrimary: {
    borderWidth: 0,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
});
