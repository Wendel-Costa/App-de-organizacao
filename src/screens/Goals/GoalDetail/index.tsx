import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ProgressRing } from '@/components/ProgressRing';
import { TextInputModal } from '@/components/TextInputModal';
import type { Goal, GoalTaskRecurrenceType, LocalGoalTask } from '@/types/goal.types';
import type { RecurrenceDay } from '@/types/task.types';

const RECURRENCE_OPTIONS: { key: GoalTaskRecurrenceType; label: string }[] = [
  { key: 'daily', label: 'Diário' },
  { key: 'times_per_week', label: 'Por semana' },
  { key: 'times_per_month', label: 'Por mês' },
  { key: 'specific_days', label: 'Dias espec.' },
  { key: 'none', label: 'Total' },
];

const WEEKDAYS: { key: RecurrenceDay; label: string }[] = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
];

function recurrenceLabel(
  type: GoalTaskRecurrenceType,
  count: number,
  days: RecurrenceDay[],
): string {
  switch (type) {
    case 'daily':
      return 'Todos os dias';
    case 'times_per_week':
      return `${count}x por semana`;
    case 'times_per_month':
      return `${count}x por mês`;
    case 'specific_days':
      return days.map((d) => WEEKDAYS.find((w) => w.key === d)?.label).join(', ');
    case 'none':
      return `${count}x no período total`;
  }
}

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
  const { addTask, removeTask, removeGoal, completeTask, uncompleteTask } = useGoalStore();

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRecType, setTaskRecType] = useState<GoalTaskRecurrenceType>('daily');
  const [taskRecCount, setTaskRecCount] = useState(1);
  const [taskRecDays, setTaskRecDays] = useState<RecurrenceDay[]>([]);
  const [showForm, setShowForm] = useState(false);

  const progress = calcProgress(goal);
  const accentColor = goal.color ?? colors.primary;

  function toggleDay(day: RecurrenceDay) {
    setTaskRecDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleAddTask() {
    if (!taskTitle.trim()) {
      Alert.alert('Atenção', 'Dê um nome ao hábito/tarefa.');
      return;
    }
    const local: LocalGoalTask = {
      title: taskTitle.trim(),
      recurrenceType: taskRecType,
      recurrenceCount: taskRecCount,
      recurrenceDays: taskRecDays,
    };
    await addTask(goal.id, goal.startDate, goal.endDate, local);
    setTaskTitle('');
    setTaskRecType('daily');
    setTaskRecCount(1);
    setTaskRecDays([]);
    setShowForm(false);
  }

  function handleDelete() {
    Alert.alert('Excluir meta', 'Deseja excluir esta meta?', [
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
    Alert.alert('Remover', 'Remover esta tarefa da meta?', [
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

        <View style={styles.taskSectionHeader}>
          <Text style={styles.sectionTitle}>Hábitos e tarefas ({goal.tasks.length})</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: accentColor + '22' }]}
            onPress={() => setShowForm(!showForm)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={showForm ? 'close' : 'plus'}
              size={16}
              color={accentColor}
            />
            <Text style={[styles.addBtnLabel, { color: accentColor }]}>
              {showForm ? 'Cancelar' : 'Adicionar'}
            </Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <Card style={styles.addForm}>
            <TextInputModal visible={false} title="" onConfirm={() => {}} onCancel={() => {}} />
            <Text style={styles.formLabel}>Nome</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.inlineTextInput}
                placeholder="Nome do hábito/tarefa..."
                placeholderTextColor={colors.textDisabled}
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>

            <Text style={styles.formLabel}>Frequência</Text>
            <View style={styles.recTypeRow}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.recChip, taskRecType === opt.key && styles.recChipActive]}
                  onPress={() => setTaskRecType(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.recChipLabel,
                      taskRecType === opt.key && styles.recChipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(taskRecType === 'times_per_week' ||
              taskRecType === 'times_per_month' ||
              taskRecType === 'none') && (
              <View style={styles.counterInline}>
                <Text style={styles.formLabel}>
                  {taskRecType === 'times_per_week' && 'Vezes/semana'}
                  {taskRecType === 'times_per_month' && 'Vezes/mês'}
                  {taskRecType === 'none' && 'Total no período'}
                </Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTaskRecCount((p) => Math.max(1, p - 1))}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{taskRecCount}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTaskRecCount((p) => p + 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {taskRecType === 'specific_days' && (
              <>
                <Text style={styles.formLabel}>Dias</Text>
                <View style={styles.daysRow}>
                  {WEEKDAYS.map((d) => (
                    <TouchableOpacity
                      key={d.key}
                      style={[styles.dayChip, taskRecDays.includes(d.key) && styles.dayChipActive]}
                      onPress={() => toggleDay(d.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayChipLabel,
                          taskRecDays.includes(d.key) && styles.dayChipLabelActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Button
              label="Adicionar"
              onPress={handleAddTask}
              variant="secondary"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        {goal.tasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhum hábito/tarefa ainda. Adicione o que precisa fazer para cumprir esta meta.
            </Text>
          </Card>
        ) : (
          goal.tasks.map((task) => {
            const taskProgress = task.targetCount > 0 ? task.completedCount / task.targetCount : 0;
            return (
              <Card key={task.id} style={styles.taskCard}>
                <View style={globalStyles.rowBetween}>
                  <View style={styles.taskLeft}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskRec}>
                      {recurrenceLabel(
                        task.recurrenceType,
                        task.recurrenceCount,
                        task.recurrenceDays,
                      )}
                    </Text>
                  </View>
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
                    {task.completedCount}/{task.targetCount} · {Math.round(taskProgress * 100)}%
                    {task.completedToday ? ' · ✓ hoje' : ''}
                  </Text>

                  <View style={styles.taskControls}>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => uncompleteTask(goal.id, task.id)}
                      disabled={task.completedCount === 0}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={14}
                        color={task.completedCount === 0 ? colors.textDisabled : colors.textPrimary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.controlBtn,
                        styles.controlBtnPrimary,
                        { backgroundColor: accentColor },
                      ]}
                      onPress={() => completeTask(goal.id, task.id)}
                      disabled={task.completedCount >= task.targetCount}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="plus" size={14} color={colors.textOnPrimary} />
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
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  taskSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
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
  addForm: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  formLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inlineInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inlineTextInput: {
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  recTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  recChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  recChipLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  recChipLabelActive: {
    color: colors.textOnPrimary,
  },
  counterInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterValue: {
    ...typography.label,
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dayChipLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayChipLabelActive: {
    color: colors.textOnPrimary,
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
  taskLeft: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  taskRec: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 5,
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
    width: 26,
    height: 26,
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
