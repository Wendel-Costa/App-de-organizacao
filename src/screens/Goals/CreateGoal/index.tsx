import { useState, useRef, useEffect } from 'react';
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
import { useRewardStore } from '@/store/rewardStore';
import { useFocusStore } from '@/store/focusStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import type { Goal, GoalTaskRecurrenceType, GoalTaskType, LocalGoalTask } from '@/types/goal.types';
import type { RecurrenceDay } from '@/types/task.types';
import { TOLERANCE_OPTIONS } from '@/services/goals.service';

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

const TASK_TYPE_OPTIONS: { key: GoalTaskType; label: string; icon: string; desc: string }[] = [
  {
    key: 'habit',
    label: 'Hábito / Tarefa',
    icon: 'checkbox-marked-outline',
    desc: 'Ação recorrente ou com meta de repetições',
  },
  {
    key: 'focus_hours',
    label: 'Horas de foco',
    icon: 'timer-outline',
    desc: 'Horas acumuladas em sessões de foco',
  },
  {
    key: 'wildcard',
    label: 'Coringa',
    icon: 'lightning-bolt',
    desc: 'Ao concluir, a meta vai para 100%',
  },
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
  initialGoal?: Goal;
}

export function CreateGoalScreen({ onBack, onSuccess, initialGoal }: CreateGoalScreenProps) {
  const isEditing = !!initialGoal;
  const { addGoal, editGoal } = useGoalStore();
  const { addReward } = useRewardStore();
  const { themes, fetchThemes } = useFocusStore();
  const [title, setTitle] = useState(initialGoal?.title ?? '');
  const [description, setDesc] = useState(initialGoal?.description ?? '');
  const [startDate, setStartDate] = useState<string | undefined>(
    initialGoal?.startDate ?? new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState<string | undefined>(initialGoal?.endDate);
  const [color, setColor] = useState(initialGoal?.color ?? COLORS[0]);
  const [tolerance, setTolerance] = useState(initialGoal?.tolerance ?? 0);
  const [allowOverflow, setAllowOverflow] = useState(initialGoal?.allowOverflow ?? false);
  const [loading, setLoading] = useState(false);
  const [localTasks, setLocalTasks] = useState<LocalGoalTask[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskSectionY, setTaskSectionY] = useState(0);
  const [newTaskType, setNewTaskType] = useState<GoalTaskType>('habit');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRecType, setTaskRecType] = useState<GoalTaskRecurrenceType>('daily');
  const [taskRecCount, setTaskRecCount] = useState(1);
  const [taskRecDays, setTaskRecDays] = useState<RecurrenceDay[]>([]);
  const [newTaskHours, setNewTaskHours] = useState(10);
  const [newTaskThemeId, setNewTaskThemeId] = useState<string | undefined>();
  const [newTaskThemeName, setNewTaskThemeName] = useState<string | undefined>();
  const [createRewardToggle, setCreateRewardToggle] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  function toggleDay(day: RecurrenceDay) {
    setTaskRecDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function resetTaskForm() {
    setTaskTitle('');
    setNewTaskType('habit');
    setTaskRecType('daily');
    setTaskRecCount(1);
    setTaskRecDays([]);
    setNewTaskHours(10);
    setNewTaskThemeId(undefined);
    setNewTaskThemeName(undefined);
  }

  function handleAddTask() {
    if (!taskTitle.trim()) {
      Alert.alert('Atenção', 'Dê um nome ao fator/hábito.');
      return;
    }
    if (newTaskType === 'habit' && taskRecType === 'specific_days' && taskRecDays.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia da semana.');
      return;
    }

    const newTask: LocalGoalTask = {
      title: taskTitle.trim(),
      type: newTaskType,
      recurrenceType: newTaskType === 'habit' ? taskRecType : 'none',
      recurrenceCount: newTaskType === 'habit' ? taskRecCount : 1,
      recurrenceDays: newTaskType === 'habit' ? taskRecDays : [],
      themeId: newTaskType === 'focus_hours' ? newTaskThemeId : undefined,
      themeName: newTaskType === 'focus_hours' ? newTaskThemeName : undefined,
      targetHours: newTaskType === 'focus_hours' ? newTaskHours : undefined,
    };

    setLocalTasks((prev) => [...prev, newTask]);
    resetTaskForm();
    setShowTaskForm(false);
  }

  function removeLocalTask(index: number) {
    setLocalTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function localTaskLabel(task: LocalGoalTask): string {
    if (task.type === 'focus_hours') {
      return `${task.targetHours}h de foco${task.themeName ? ` · ${task.themeName}` : ''}`;
    }
    if (task.type === 'wildcard') return 'Ação coringa';
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
      default:
        return '';
    }
  }

  function localTaskIcon(type: GoalTaskType): string {
    switch (type) {
      case 'focus_hours':
        return 'timer-outline';
      case 'wildcard':
        return 'lightning-bolt';
      default:
        return 'checkbox-marked-circle-outline';
    }
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
      if (isEditing && initialGoal) {
        await editGoal(initialGoal.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate,
          color,
          tolerance,
          allowOverflow,
          allowBeyond100: initialGoal.allowBeyond100,
          archived: initialGoal.archived,
        });
      } else {
        const goal = await addGoal(
          {
            title: title.trim(),
            description: description.trim() || undefined,
            startDate,
            endDate,
            color,
            tolerance,
            allowOverflow,
            allowBeyond100: false,
            archived: false,
          },
          localTasks,
        );

        if (createRewardToggle && rewardTitle.trim()) {
          await addReward({
            title: rewardTitle.trim(),
            condition: { type: 'goal_completed', target: 1, period: 'anytime', goalId: goal.id },
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar a meta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title={isEditing ? 'Editar meta' : 'Nova meta'} onBack={onBack} />

      <ScrollView
        ref={scrollRef}
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

        {!isEditing && (
          <>
            <View
              style={styles.taskSectionHeader}
              onLayout={(e) => setTaskSectionY(e.nativeEvent.layout.y)}
            >
              <Text style={styles.sectionTitle}>Fatores da meta</Text>
              <TouchableOpacity
                style={styles.addTaskBtn}
                onPress={() => {
                  const opening = !showTaskForm;
                  setShowTaskForm(opening);
                  if (opening) {
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({
                        y: Math.max(taskSectionY - 20, 0),
                        animated: true,
                      });
                    }, 100);
                  }
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={showTaskForm ? 'close' : 'plus'}
                  size={18}
                  color={colors.primaryDark}
                />
                <Text style={styles.addTaskBtnLabel}>
                  {showTaskForm ? 'Cancelar' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>

            {showTaskForm && (
              <View style={styles.taskForm}>
                <Text style={styles.formLabel}>Tipo de fator</Text>
                {TASK_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.taskTypeRow,
                      newTaskType === opt.key && styles.taskTypeRowActive,
                    ]}
                    onPress={() => setNewTaskType(opt.key)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon as any}
                      size={20}
                      color={newTaskType === opt.key ? colors.textOnPrimary : colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.taskTypeLabel,
                          newTaskType === opt.key && styles.taskTypeLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.taskTypeDesc,
                          newTaskType === opt.key && styles.taskTypeDescActive,
                        ]}
                      >
                        {opt.desc}
                      </Text>
                    </View>
                    {newTaskType === opt.key && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={colors.textOnPrimary}
                      />
                    )}
                  </TouchableOpacity>
                ))}

                <Text style={styles.formLabel}>
                  {newTaskType === 'wildcard' ? 'Nome da ação coringa *' : 'Nome do fator *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    newTaskType === 'focus_hours'
                      ? 'Ex: Horas de estudo de inglês...'
                      : newTaskType === 'wildcard'
                        ? 'Ex: Aprovação no exame B2...'
                        : 'Ex: Ver videoaula, Treinar...'
                  }
                  placeholderTextColor={colors.textDisabled}
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  maxLength={80}
                />

                {newTaskType === 'focus_hours' && (
                  <>
                    <Text style={styles.formLabel}>Meta de horas</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setNewTaskHours((p) => Math.max(1, p - 1))}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{newTaskHours}h</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setNewTaskHours((p) => p + 1)}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.formLabel}>Tema de foco (opcional)</Text>
                    {themes.length === 0 ? (
                      <Text style={styles.noThemesText}>
                        Nenhum tema criado ainda. Crie temas na aba Foco.
                      </Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.themesRow}
                      >
                        <TouchableOpacity
                          style={[styles.themeChip, !newTaskThemeId && styles.themeChipActive]}
                          onPress={() => {
                            setNewTaskThemeId(undefined);
                            setNewTaskThemeName(undefined);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.themeChipLabel,
                              !newTaskThemeId && styles.themeChipLabelActive,
                            ]}
                          >
                            Todos
                          </Text>
                        </TouchableOpacity>
                        {themes.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            style={[
                              styles.themeChip,
                              newTaskThemeId === t.id && styles.themeChipActive,
                            ]}
                            onPress={() => {
                              setNewTaskThemeId(t.id);
                              setNewTaskThemeName(t.name);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.themeChipLabel,
                                newTaskThemeId === t.id && styles.themeChipLabelActive,
                              ]}
                            >
                              {t.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                {newTaskType === 'wildcard' && (
                  <View style={styles.wildcardInfo}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={14}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.wildcardInfoText}>
                      Ao concluir esta ação, a meta inteira será marcada como 100% automaticamente —
                      independente dos outros fatores.
                    </Text>
                  </View>
                )}

                {newTaskType === 'habit' && (
                  <>
                    <Text style={styles.formLabel}>Frequência</Text>
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
                            color={
                              taskRecType === opt.key ? colors.textOnPrimary : colors.textSecondary
                            }
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
                      <View style={styles.counterRowLabel}>
                        <Text style={styles.formLabel}>
                          {taskRecType === 'times_per_week' && 'Vezes por semana'}
                          {taskRecType === 'times_per_month' && 'Vezes por mês'}
                          {taskRecType === 'none' && 'Total no período'}
                        </Text>
                        <View style={styles.counterRow}>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => setTaskRecCount((p) => Math.max(1, p - 1))}
                          >
                            <MaterialCommunityIcons
                              name="minus"
                              size={18}
                              color={colors.textPrimary}
                            />
                          </TouchableOpacity>
                          <Text style={styles.counterValue}>{taskRecCount}</Text>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => setTaskRecCount((p) => p + 1)}
                          >
                            <MaterialCommunityIcons
                              name="plus"
                              size={18}
                              color={colors.textPrimary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {taskRecType === 'specific_days' && (
                      <>
                        <Text style={styles.formLabel}>Dias da semana</Text>
                        <View style={styles.daysRow}>
                          {WEEKDAYS.map((d) => (
                            <TouchableOpacity
                              key={d.key}
                              style={[
                                styles.dayChip,
                                taskRecDays.includes(d.key) && styles.dayChipActive,
                              ]}
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
                  </>
                )}

                <Button
                  label="Adicionar"
                  onPress={handleAddTask}
                  variant="secondary"
                  fullWidth
                  style={styles.saveButton}
                />
              </View>
            )}

            {localTasks.length > 0 && (
              <View style={styles.taskList}>
                {localTasks.map((task, index) => (
                  <View key={index} style={styles.taskItem}>
                    <MaterialCommunityIcons
                      name={localTaskIcon(task.type) as any}
                      size={16}
                      color={task.type === 'wildcard' ? '#FFD700' : colors.primary}
                    />
                    <View style={styles.taskItemLeft}>
                      <Text style={styles.taskItemTitle}>{task.title}</Text>
                      <Text style={styles.taskItemSub}>{localTaskLabel(task)}</Text>
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
                  Nenhum fator adicionado ainda.{'\n'}
                  Adicione hábitos, metas de foco ou ações coringa.
                </Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.label}>Margem de erro</Text>
        <Text style={styles.toleranceHint}>
          Com margem, você atinge 100% mesmo sem completar todos os fatores.
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

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setAllowOverflow((p) => !p)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={allowOverflow ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={allowOverflow ? colors.primary : colors.textDisabled}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Permitir compensação entre fatores</Text>
            <Text style={styles.toggleDesc}>
              O excesso em um fator compensa o déficit de outro na média geral
            </Text>
          </View>
        </TouchableOpacity>

        {!isEditing && (
          <>
            <TouchableOpacity
              style={[styles.toggleRow, { marginTop: spacing.xs }]}
              onPress={() => setCreateRewardToggle((p) => !p)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={createRewardToggle ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={createRewardToggle ? colors.primary : colors.textDisabled}
              />
              <Text style={styles.toggleLabel}>Criar recompensa ao completar esta meta</Text>
            </TouchableOpacity>

            {createRewardToggle && (
              <>
                <Text style={styles.label}>Nome da recompensa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Viagem, Presente, Dia de folga..."
                  placeholderTextColor={colors.textDisabled}
                  value={rewardTitle}
                  onChangeText={setRewardTitle}
                  maxLength={60}
                />
              </>
            )}
          </>
        )}

        <Button
          label={isEditing ? 'Salvar alterações' : 'Criar meta'}
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
  formLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
    gap: spacing.xs,
  },

  taskTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  taskTypeRowActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  taskTypeLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  taskTypeLabelActive: {
    color: colors.textOnPrimary,
  },
  taskTypeDesc: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  taskTypeDescActive: {
    color: colors.textOnPrimary,
    opacity: 0.85,
  },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  counterRowLabel: {
    gap: spacing.xs,
  },
  counterBtn: {
    width: 32,
    height: 32,
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
    minWidth: 48,
    textAlign: 'center',
  },

  themesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  themeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  themeChipLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  themeChipLabelActive: {
    color: colors.textOnPrimary,
  },
  noThemesText: {
    ...typography.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },

  wildcardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryDark + '44',
  },
  wildcardInfoText: {
    ...typography.xs,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 16,
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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  toggleDesc: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
  },
});
