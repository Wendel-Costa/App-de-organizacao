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
import { useRewardStore } from '@/store/rewardStore';
import { useFocusStore } from '@/store/focusStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ProgressRing } from '@/components/ProgressRing';
import { TextInputModal } from '@/components/TextInputModal';
import type {
  Goal,
  GoalTask,
  GoalTaskRecurrenceType,
  GoalTaskType,
  LocalGoalTask,
} from '@/types/goal.types';
import type { RecurrenceDay } from '@/types/task.types';
import { calcGoalProgress, calcTaskProgress, toleranceLabel } from '@/services/goals.service';
import { CreateGoalScreen } from '../CreateGoal';

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

const NEW_TASK_TYPE_OPTIONS: { key: GoalTaskType; label: string; icon: string }[] = [
  { key: 'habit', label: 'Hábito / Tarefa', icon: 'checkbox-marked-outline' },
  { key: 'focus_hours', label: 'Horas de foco', icon: 'timer-outline' },
  { key: 'wildcard', label: 'Coringa', icon: 'lightning-bolt' },
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
    default:
      return '';
  }
}

function getOverflowColor(progress: number): string {
  if (progress <= 2.0) return '#08d120';
  if (progress <= 3.0) return '#03c2c5';
  return '#1a04c3';
}

interface GoalDetailScreenProps {
  goal: Goal;
  onBack: () => void;
  onDeleted: () => void;
}

export function GoalDetailScreen({
  goal: initialGoalProp,
  onBack,
  onDeleted,
}: GoalDetailScreenProps) {
  const {
    goals,
    addTask,
    removeTask,
    removeGoal,
    completeTask,
    uncompleteTask,
    archiveGoal,
    enableBeyond100,
  } = useGoalStore();
  const { addReward } = useRewardStore();
  const { themes } = useFocusStore();

  const goal = goals.find((g) => g.id === initialGoalProp.id) || initialGoalProp;

  const [showForm, setShowForm] = useState(false);
  const [newTaskType, setNewTaskType] = useState<GoalTaskType>('habit');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRecType, setTaskRecType] = useState<GoalTaskRecurrenceType>('daily');
  const [taskRecCount, setTaskRecCount] = useState(1);
  const [taskRecDays, setTaskRecDays] = useState<RecurrenceDay[]>([]);
  const [taskHours, setTaskHours] = useState(10);
  const [taskThemeId, setTaskThemeId] = useState<string | undefined>();
  const [taskThemeName, setTaskThemeName] = useState<string | undefined>();
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const progress = calcGoalProgress(goal);
  const isComplete = progress >= 1;
  const isBeyond = progress > 1;
  const accentColor = goal.color ?? colors.primary;
  const overflowClr = getOverflowColor(progress);

  function toggleDay(day: RecurrenceDay) {
    setTaskRecDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function resetForm() {
    setTaskTitle('');
    setNewTaskType('habit');
    setTaskRecType('daily');
    setTaskRecCount(1);
    setTaskRecDays([]);
    setTaskHours(10);
    setTaskThemeId(undefined);
    setTaskThemeName(undefined);
  }

  async function handleAddTask() {
    if (!taskTitle.trim()) {
      Alert.alert('Atenção', 'Dê um nome ao fator/hábito.');
      return;
    }
    if (newTaskType === 'habit' && taskRecType === 'specific_days' && taskRecDays.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia da semana.');
      return;
    }

    const local: LocalGoalTask = {
      title: taskTitle.trim(),
      type: newTaskType,
      recurrenceType: newTaskType === 'habit' ? taskRecType : 'none',
      recurrenceCount: newTaskType === 'habit' ? taskRecCount : 1,
      recurrenceDays: newTaskType === 'habit' ? taskRecDays : [],
      themeId: newTaskType === 'focus_hours' ? taskThemeId : undefined,
      themeName: newTaskType === 'focus_hours' ? taskThemeName : undefined,
      targetHours: newTaskType === 'focus_hours' ? taskHours : undefined,
    };

    await addTask(goal.id, goal.startDate, goal.endDate, local);
    resetForm();
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
    Alert.alert('Remover fator', 'Remover este fator da meta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeTask(goal.id, taskId) },
    ]);
  }

  function handleArchive() {
    Alert.alert(
      'Guardar meta',
      'A meta será movida para a seção "Concluídas". Ela não será apagada e você ainda poderá acessá-la.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            await archiveGoal(goal.id);
            onDeleted();
          },
        },
      ],
    );
  }

  function handleToggleBeyond100() {
    if (goal.allowBeyond100) {
      Alert.alert('Desativar "Além de 100%"', 'O progresso voltará a ser limitado em 100%.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', onPress: () => enableBeyond100(goal.id, false) },
      ]);
    } else {
      Alert.alert(
        'Ir além de 100%',
        'Ativar este modo permite que o progresso continue acumulando após os 100%. O anel de progresso vai mudar de cor conforme você avança!',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ativar', onPress: () => enableBeyond100(goal.id, true) },
        ],
      );
    }
  }

  function renderTaskProgress(task: GoalTask) {
    const taskProg = calcTaskProgress(task, goal.tolerance, goal.allowOverflow);

    if (task.type === 'wildcard') {
      const done = task.completedCount >= task.targetCount;
      return (
        <Card key={task.id} style={[styles.taskCard, done && styles.taskCardDone]}>
          <View style={globalStyles.rowBetween}>
            <View style={styles.taskLeft}>
              <View style={styles.taskTitleRow}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFD700" />
                <Text style={styles.taskTitle}>{task.title}</Text>
              </View>
              <Text style={[styles.taskRec, done && { color: colors.success }]}>
                {done
                  ? 'Coringa ativado - meta em 100%!'
                  : 'Ação coringa - ao concluir, vai para 100%'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveTask(task.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>

          <View style={styles.taskControls}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => uncompleteTask(goal.id, task.id)}
              disabled={task.completedCount === 0}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="undo"
                size={14}
                color={task.completedCount === 0 ? colors.textDisabled : colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.controlBtnPrimary,
                { backgroundColor: done ? colors.success : '#FFD700' },
              ]}
              onPress={() => completeTask(goal.id, task.id)}
              disabled={done}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={done ? 'check' : 'lightning-bolt'}
                size={16}
                color={colors.textOnPrimary}
              />
            </TouchableOpacity>
          </View>
        </Card>
      );
    }

    if (task.type === 'focus_hours') {
      const hoursPercent = Math.min(Math.round(taskProg * 100), goal.allowOverflow ? 999 : 100);
      return (
        <Card key={task.id} style={styles.taskCard}>
          <View style={globalStyles.rowBetween}>
            <View style={styles.taskLeft}>
              <View style={styles.taskTitleRow}>
                <MaterialCommunityIcons name="timer-outline" size={14} color={accentColor} />
                <Text style={styles.taskTitle}>{task.title}</Text>
              </View>
              <Text style={styles.taskRec}>
                Foco{task.themeName ? ` em ${task.themeName}` : ''}
                {' · '}
                {task.completedCount}h / {task.targetCount}h
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
                { width: `${Math.min(taskProg, 1) * 100}%`, backgroundColor: accentColor },
              ]}
            />
          </View>

          <Text style={styles.taskProgress}>
            {task.completedCount}h de {task.targetCount}h · {hoursPercent}%
            {goal.tolerance > 0 &&
              ` (meta: ${Math.ceil(task.targetCount * (1 - goal.tolerance))}h)`}
          </Text>
        </Card>
      );
    }

    const cappedProg = goal.allowOverflow ? taskProg : Math.min(taskProg, 1);
    const displayPct = Math.round(taskProg * 100);
    return (
      <Card key={task.id} style={styles.taskCard}>
        <View style={globalStyles.rowBetween}>
          <View style={styles.taskLeft}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskRec}>
              {recurrenceLabel(task.recurrenceType, task.recurrenceCount, task.recurrenceDays)}
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
              { width: `${Math.min(cappedProg, 1) * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        <View style={globalStyles.rowBetween}>
          <Text style={styles.taskProgress}>
            {task.completedCount}/{task.targetCount} · {displayPct}%
            {task.completedToday ? ' · ✓ hoje' : ''}
            {goal.tolerance > 0 && ` (meta: ${Math.ceil(task.targetCount * (1 - goal.tolerance))})`}
          </Text>

          <View style={styles.taskControlsRow}>
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
              style={[styles.controlBtnPrimary, { backgroundColor: accentColor }]}
              onPress={() => completeTask(goal.id, task.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={14} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  }

  if (showEdit) {
    return (
      <CreateGoalScreen
        initialGoal={goal}
        onBack={() => setShowEdit(false)}
        onSuccess={() => setShowEdit(false)}
      />
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Detalhe da meta"
        onBack={onBack}
        rightAction={{ icon: 'pencil-outline', onPress: () => setShowEdit(true) }}
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

              <View style={styles.badgesRow}>
                {goal.tolerance > 0 && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={11}
                      color={colors.success}
                    />
                    <Text style={[styles.badgeText, { color: colors.success }]}>
                      {toleranceLabel(goal.tolerance)}
                    </Text>
                  </View>
                )}
                {goal.allowOverflow && (
                  <View style={[styles.badge, { backgroundColor: colors.sky + '44' }]}>
                    <MaterialCommunityIcons name="swap-horizontal" size={11} color={colors.sky} />
                    <Text style={[styles.badgeText, { color: colors.sky }]}>Compensação ativa</Text>
                  </View>
                )}
                {goal.archived && (
                  <View style={[styles.badge, { backgroundColor: colors.textDisabled + '22' }]}>
                    <MaterialCommunityIcons
                      name="archive-outline"
                      size={11}
                      color={colors.textDisabled}
                    />
                    <Text style={[styles.badgeText, { color: colors.textDisabled }]}>Guardada</Text>
                  </View>
                )}
              </View>
            </View>

            <ProgressRing progress={progress} size={80} color={accentColor} />
          </View>

          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(progress, 1) * 100}%`,
                    backgroundColor: isBeyond ? overflowClr : accentColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPct, isBeyond && { color: overflowClr }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </Card>

        {isComplete && !goal.archived && (
          <Card style={[styles.actionCard, { borderColor: '#FFD700' + '55' }]}>
            <View style={styles.actionCardContent}>
              <MaterialCommunityIcons name="archive-check-outline" size={22} color="#B8860B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>Guardar meta concluída</Text>
                <Text style={styles.actionCardDesc}>
                  Mover para a seção "Concluídas" sem excluir
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FFD700' }]}
                onPress={handleArchive}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="archive-outline" size={18} color="#2A2318" />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {isComplete && (
          <Card
            style={[
              styles.actionCard,
              {
                borderColor: (isBeyond ? overflowClr : colors.primary) + '55',
                backgroundColor: isBeyond ? overflowClr + '11' : colors.primaryLight,
              },
            ]}
          >
            <View style={styles.actionCardContent}>
              <MaterialCommunityIcons
                name={isBeyond ? 'infinity' : 'trending-up'}
                size={22}
                color={isBeyond ? overflowClr : colors.primaryDark}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionCardTitle, isBeyond && { color: overflowClr }]}>
                  {isBeyond ? `Indo além! ${Math.round(progress * 100)}%` : 'Ir além de 100%'}
                </Text>
                <Text style={styles.actionCardDesc}>
                  {isBeyond
                    ? 'Continue acumulando - o anel vai mudando de cor'
                    : 'Ative para continuar acumulando progresso após 100%'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: goal.allowBeyond100
                      ? colors.surfaceAlt
                      : isBeyond
                        ? overflowClr
                        : colors.primary,
                  },
                ]}
                onPress={handleToggleBeyond100}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={goal.allowBeyond100 ? 'lock-open-outline' : 'lock-outline'}
                  size={18}
                  color={goal.allowBeyond100 ? colors.textSecondary : colors.textOnPrimary}
                />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <View style={styles.taskSectionHeader}>
          <Text style={styles.sectionTitle}>Fatores ({goal.tasks?.length || 0})</Text>
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
            <Text style={styles.formLabel}>Tipo de fator</Text>
            <View style={styles.typeRow}>
              {NEW_TASK_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.typeChip, newTaskType === opt.key && styles.typeChipActive]}
                  onPress={() => setNewTaskType(opt.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={14}
                    color={newTaskType === opt.key ? colors.textOnPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeChipLabel,
                      newTaskType === opt.key && styles.typeChipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Nome *</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.inlineTextInput}
                placeholder={
                  newTaskType === 'focus_hours'
                    ? 'Ex: Horas de estudo...'
                    : newTaskType === 'wildcard'
                      ? 'Ex: Aprovação no exame...'
                      : 'Nome do hábito/tarefa...'
                }
                placeholderTextColor={colors.textDisabled}
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>

            {newTaskType === 'focus_hours' && (
              <>
                <Text style={styles.formLabel}>Meta de horas</Text>
                <View style={styles.counterInline}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTaskHours((p) => Math.max(1, p - 1))}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{taskHours}h</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTaskHours((p) => p + 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.formLabel}>Tema (opcional)</Text>
                {themes.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.themesRow}
                  >
                    <TouchableOpacity
                      style={[styles.themeChip, !taskThemeId && styles.themeChipActive]}
                      onPress={() => {
                        setTaskThemeId(undefined);
                        setTaskThemeName(undefined);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.themeChipLabel, !taskThemeId && styles.themeChipLabelActive]}
                      >
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {themes.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.themeChip, taskThemeId === t.id && styles.themeChipActive]}
                        onPress={() => {
                          setTaskThemeId(t.id);
                          setTaskThemeName(t.name);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.themeChipLabel,
                            taskThemeId === t.id && styles.themeChipLabelActive,
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
                  size={13}
                  color={colors.primaryDark}
                />
                <Text style={styles.wildcardInfoText}>
                  Ao concluir esta ação, a meta vai para 100% automaticamente.
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
                  <View style={styles.counterInlineRow}>
                    <Text style={styles.formLabel}>
                      {taskRecType === 'times_per_week' && 'Vezes/semana'}
                      {taskRecType === 'times_per_month' && 'Vezes/mês'}
                      {taskRecType === 'none' && 'Total no período'}
                    </Text>
                    <View style={styles.counterInline}>
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
              label="Adicionar fator"
              onPress={handleAddTask}
              variant="secondary"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        {!goal.tasks || goal.tasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhum fator ainda. Adicione hábitos, metas de foco ou ações coringa.
            </Text>
          </Card>
        ) : (
          goal.tasks.map((task) => renderTaskProgress(task))
        )}

        <TextInputModal
          visible={showRewardModal}
          title="Recompensa por completar esta meta"
          placeholder="Ex: Jantar especial, Viagem..."
          confirmLabel="Criar"
          onConfirm={async (rewardTitle) => {
            await addReward({
              title: rewardTitle,
              condition: { type: 'goal_completed', target: 1, period: 'anytime', goalId: goal.id },
            });
            setShowRewardModal(false);
            Alert.alert('Concluído', 'Recompensa criada! Veja em Conquistas.');
          }}
          onCancel={() => setShowRewardModal(false)}
        />

        <Button
          label="Criar recompensa por esta meta"
          onPress={() => setShowRewardModal(true)}
          variant="secondary"
          fullWidth
          style={styles.actionButton}
        />

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
  headerCard: { borderTopWidth: 4 },
  headerLeft: { flex: 1, gap: 4, paddingRight: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  description: { ...typography.sm, color: colors.textSecondary },
  period: {
    ...typography.xs,
    color: colors.textDisabled,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.mint + '44',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: { ...typography.xs, fontWeight: '600' },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: radius.full },
  progressPct: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  actionCard: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionCardTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  actionCardDesc: { ...typography.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  addBtnLabel: { ...typography.label },
  addForm: { gap: spacing.sm, backgroundColor: colors.surfaceAlt },
  formLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.xs },
  inlineInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inlineTextInput: { paddingVertical: spacing.sm, ...typography.body, color: colors.textPrimary },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  typeChipLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  typeChipLabelActive: { color: colors.textOnPrimary },
  counterInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  counterInlineRow: { gap: spacing.xs },
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
    minWidth: 40,
    textAlign: 'center',
  },
  themesRow: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs },
  themeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  themeChipLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  themeChipLabelActive: { color: colors.textOnPrimary },
  wildcardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  wildcardInfoText: { ...typography.xs, color: colors.primaryDark, flex: 1, lineHeight: 15 },
  recTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  recChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  recChipLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  recChipLabelActive: { color: colors.textOnPrimary },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  dayChipLabel: { ...typography.xs, color: colors.textSecondary, fontWeight: '600' },
  dayChipLabelActive: { color: colors.textOnPrimary },
  taskCard: { gap: spacing.sm },
  taskCardDone: { borderColor: colors.success + '66', backgroundColor: colors.success + '0A' },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskLeft: { flex: 1, gap: 2 },
  taskTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  taskRec: { ...typography.xs, color: colors.textSecondary },
  progressTrack: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  taskProgress: { ...typography.xs, color: colors.textSecondary },
  taskControls: { flexDirection: 'row', gap: spacing.xs },
  taskControlsRow: { flexDirection: 'row', gap: spacing.xs },
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
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: { padding: spacing.lg },
  emptyText: { ...typography.sm, color: colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  actionButton: { marginTop: spacing.xs },
  deleteButton: { marginTop: spacing.xs },
});
