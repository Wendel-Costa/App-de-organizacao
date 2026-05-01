import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import type { GoalTaskRecurrenceType, LocalGoalTask } from '@/types/goal.types';
import type { RecurrenceDay } from '@/types/task.types';
import { TOLERANCE_OPTIONS, toleranceLabel } from '@/services/goals.service';

const COLORS = [
  '#F5C518',
  '#5DB88A',
  '#5B9BD5',
  '#FF6B6B',
  '#FFB347',
  '#9B7DD4',
  '#4ECDC4',
  '#F9B8C4',
];

const RECURRENCE_OPTIONS: { key: GoalTaskRecurrenceType; label: string; icon: string }[] = [
  { key: 'daily', label: 'Diário', icon: 'calendar-today' },
  { key: 'times_per_week', label: 'Por semana', icon: 'calendar-week' },
  { key: 'times_per_month', label: 'Por mês', icon: 'calendar-month' },
  { key: 'specific_days', label: 'Dias específicos', icon: 'calendar-check' },
  { key: 'none', label: 'Total no período', icon: 'sigma' },
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

interface CreateGoalScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateGoalScreen({ onBack, onSuccess }: CreateGoalScreenProps) {
  const { addGoal } = useGoalStore();
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [startDate, setStartDate] = useState<string | undefined>(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState<string | undefined>();
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [localTasks, setLocalTasks] = useState<LocalGoalTask[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRecType, setTaskRecType] = useState<GoalTaskRecurrenceType>('daily');
  const [taskRecCount, setTaskRecCount] = useState(1);
  const [taskRecDays, setTaskRecDays] = useState<RecurrenceDay[]>([]);
  const [tolerance, setTolerance] = useState(0);

  function toggleDay(day: RecurrenceDay) {
    setTaskRecDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handleAddTask() {
    if (!taskTitle.trim()) {
      Alert.alert('Atenção', 'Dê um nome à tarefa.');
      return;
    }
    if (taskRecType === 'specific_days' && taskRecDays.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia da semana.');
      return;
    }

    setLocalTasks((prev) => [
      ...prev,
      {
        title: taskTitle.trim(),
        recurrenceType: taskRecType,
        recurrenceCount: taskRecCount,
        recurrenceDays: taskRecDays,
      },
    ]);

    setTaskTitle('');
    setTaskRecType('daily');
    setTaskRecCount(1);
    setTaskRecDays([]);
    setShowTaskForm(false);
  }

  function removeLocalTask(index: number) {
    setLocalTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Atenção', 'O título da meta é obrigatório.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Atenção', 'Informe as datas de início e término.');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Atenção', 'A data de término deve ser após o início.');
      return;
    }

    setLoading(true);
    try {
      await addGoal(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate,
          color,
          tolerance,
        },
        localTasks,
      );
      onSuccess();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a meta.');
    } finally {
      setLoading(false);
    }
  }

  function recurrenceLabel(task: LocalGoalTask): string {
    switch (task.recurrenceType) {
      case 'daily':
        return 'Todos os dias';
      case 'times_per_week':
        return `${task.recurrenceCount}x por semana`;
      case 'times_per_month':
        return `${task.recurrenceCount}x por mês`;
      case 'specific_days':
        return task.recurrenceDays.map((d) => WEEKDAYS.find((w) => w.key === d)?.label).join(', ');
      case 'none':
        return `${task.recurrenceCount}x no período`;
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Nova meta" onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Sobre a meta</Text>

        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Dominar matemática"
          placeholderTextColor={colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Descreva sua meta..."
          placeholderTextColor={colors.textDisabled}
          value={description}
          onChangeText={setDesc}
          multiline
          numberOfLines={3}
          maxLength={300}
        />

        <DatePicker
          label="Início *"
          value={startDate}
          onChange={setStartDate}
          placeholder="Selecionar"
        />
        <DatePicker
          label="Término *"
          value={endDate}
          onChange={setEndDate}
          placeholder="Selecionar"
          minimumDate={startDate ? new Date(startDate + 'T12:00:00') : new Date()}
        />

        <Text style={styles.label}>Cor de destaque</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
              onPress={() => setColor(c)}
              activeOpacity={0.8}
            />
          ))}
        </View>

        <View style={styles.taskSectionHeader}>
          <Text style={styles.sectionTitle}>Hábitos e tarefas</Text>
          <TouchableOpacity
            style={styles.addTaskBtn}
            onPress={() => setShowTaskForm(!showTaskForm)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={showTaskForm ? 'close' : 'plus'}
              size={18}
              color={colors.primaryDark}
            />
            <Text style={styles.addTaskBtnLabel}>{showTaskForm ? 'Cancelar' : 'Adicionar'}</Text>
          </TouchableOpacity>
        </View>

        {showTaskForm && (
          <View style={styles.taskForm}>
            <Text style={styles.label}>Nome do hábito/tarefa *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Ver videoaula, Treinar..."
              placeholderTextColor={colors.textDisabled}
              value={taskTitle}
              onChangeText={setTaskTitle}
              maxLength={80}
              autoFocus
            />

            <Text style={styles.label}>Frequência</Text>
            <View style={styles.recTypeRow}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.recChip, taskRecType === opt.key && styles.recChipActive]}
                  onPress={() => setTaskRecType(opt.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={14}
                    color={taskRecType === opt.key ? colors.textOnPrimary : colors.textSecondary}
                  />
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
              <View style={styles.counterRow}>
                <Text style={styles.label}>
                  {taskRecType === 'times_per_week' && 'Vezes por semana'}
                  {taskRecType === 'times_per_month' && 'Vezes por mês'}
                  {taskRecType === 'none' && 'Total no período'}
                </Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTaskRecCount((p) => Math.max(1, p - 1))}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{taskRecCount}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTaskRecCount((p) => p + 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {taskRecType === 'specific_days' && (
              <>
                <Text style={styles.label}>Dias da semana</Text>
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
              label="Adicionar hábito/tarefa"
              onPress={handleAddTask}
              variant="secondary"
              fullWidth
              style={styles.addTaskConfirmBtn}
            />
          </View>
        )}

        {localTasks.length > 0 && (
          <View style={styles.taskList}>
            {localTasks.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <View style={styles.taskItemLeft}>
                  <Text style={styles.taskItemTitle}>{task.title}</Text>
                  <Text style={styles.taskItemSub}>{recurrenceLabel(task)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeLocalTask(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={18} color={colors.textDisabled} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {localTasks.length === 0 && !showTaskForm && (
          <View style={styles.emptyTasks}>
            <Text style={styles.emptyTasksText}>
              Nenhum hábito/tarefa adicionado ainda.{'\n'}
              Adicione o que precisa fazer para cumprir essa meta.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Margem de erro</Text>
        <Text style={styles.toleranceHint}>
          Com margem, você atinge 100% mesmo sem completar todas as tarefas.
        </Text>
        <View style={styles.toleranceRow}>
          {TOLERANCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.toleranceChip, tolerance === opt.value && styles.toleranceChipActive]}
              onPress={() => setTolerance(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toleranceLabel,
                  tolerance === opt.value && styles.toleranceLabelActive,
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[styles.toleranceSub, tolerance === opt.value && styles.toleranceSubActive]}
              >
                {opt.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label="Criar meta"
          onPress={handleSave}
          fullWidth
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.textPrimary,
    transform: [{ scale: 1.15 }],
  },

  taskSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  addTaskBtnLabel: {
    ...typography.label,
    color: colors.primaryDark,
  },
  taskForm: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  recTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  recChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterValue: {
    ...typography.h3,
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    ...typography.label,
    color: colors.textSecondary,
  },
  dayChipLabelActive: {
    color: colors.textOnPrimary,
  },
  previewText: {
    ...typography.xs,
    color: colors.primaryDark,
    flex: 1,
  },
  addTaskConfirmBtn: {
    marginTop: spacing.md,
  },

  taskList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  taskItemLeft: {
    flex: 1,
  },
  taskItemTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  taskItemSub: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyTasks: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  emptyTasksText: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 20,
  },
  saveButton: {
    marginTop: spacing.lg,
  },

  toleranceHint: {
    ...typography.xs,
    color: colors.textDisabled,
    marginBottom: spacing.sm,
  },
  toleranceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  toleranceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 80,
  },
  toleranceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  toleranceLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  toleranceLabelActive: {
    color: colors.textOnPrimary,
  },
  toleranceSub: {
    ...typography.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  toleranceSubActive: {
    color: colors.textOnPrimary,
  },
});
