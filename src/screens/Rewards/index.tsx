import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useRewardStore } from '@/store/rewardStore';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RewardCard } from '@/components/RewardCard';
import { EmptyState } from '@/components/EmptyState';
import { DatePicker } from '@/components/DatePicker';
import type { Reward, RewardConditionType, RewardPeriod } from '@/types/reward.types';

type Screen = 'list' | 'create';

const CONDITION_OPTIONS: { key: RewardConditionType; label: string; icon: string }[] = [
  { key: 'focus_hours', label: 'Horas de foco', icon: 'timer-outline' },
  { key: 'tasks_completed', label: 'N tarefas concluídas', icon: 'check-circle-outline' },
  { key: 'tasks_specific', label: 'Tarefas específicas', icon: 'format-list-checks' },
  { key: 'goal_completed', label: 'Completar meta', icon: 'flag-checkered' },
];

const PERIOD_OPTIONS: { key: RewardPeriod; label: string }[] = [
  { key: 'anytime', label: 'Desde a criação' },
  { key: 'day', label: 'Em um dia' },
  { key: 'week', label: 'Em uma semana' },
  { key: 'month', label: 'Em um mês' },
  { key: 'custom', label: 'Período personalizado' },
];

export function RewardsScreen() {
  const { rewards, loading, fetchRewards, addReward, editReward, removeReward, checkAndUnlock } =
    useRewardStore();

  const { sessions, themes, fetchSessions, fetchThemes } = useFocusStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { goals, fetchGoals } = useGoalStore();

  const [screen, setScreen] = useState<Screen>('list');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conditionType, setConditionType] = useState<RewardConditionType>('focus_hours');
  const [target, setTarget] = useState(10);
  const [period, setPeriod] = useState<RewardPeriod>('anytime');
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>();
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  useEffect(() => {
    fetchRewards();
    fetchSessions();
    fetchThemes();
    fetchTasks();
    fetchGoals();
  }, []);

  useEffect(() => {
    if (rewards.length > 0 && (sessions.length > 0 || tasks.length > 0)) {
      checkAndUnlock(sessions, tasks, goals).then((newOnes) => {
        if (newOnes.length > 0) {
          Alert.alert('🏆 Recompensa desbloqueada!', newOnes.map((r) => r.title).join('\n'));
        }
      });
    }
  }, [sessions, tasks, goals]);

  const unlocked = rewards.filter((r) => r.unlocked);
  const locked = rewards.filter((r) => !r.unlocked);

  function resetForm() {
    setTitle('');
    setDescription('');
    setConditionType('focus_hours');
    setTarget(10);
    setPeriod('anytime');
    setSelectedThemeId(undefined);
    setSelectedTaskIds([]);
    setSelectedGoalId(undefined);
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setEditingReward(null);
  }

  function handleEdit(reward: Reward) {
    setTitle(reward.title);
    setDescription(reward.description ?? '');
    setConditionType(reward.condition.type);
    setTarget(reward.condition.target);
    setPeriod(reward.condition.period);
    setSelectedThemeId(reward.condition.themeId);
    setSelectedTaskIds(reward.condition.taskIds ?? []);
    setSelectedGoalId(reward.condition.goalId);
    setCustomStart(reward.condition.customStartDate);
    setCustomEnd(reward.condition.customEndDate);
    setEditingReward(reward);
    setScreen('create');
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Dê um nome à recompensa.');
      return;
    }
    if (conditionType === 'tasks_specific' && selectedTaskIds.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma tarefa.');
      return;
    }
    if (conditionType === 'goal_completed' && !selectedGoalId) {
      Alert.alert('Atenção', 'Selecione uma meta.');
      return;
    }
    if (conditionType === 'focus_hours' && target <= 0) {
      Alert.alert('Atenção', 'Defina quantas horas.');
      return;
    }

    setSaving(true);
    try {
      if (editingReward) {
        await editReward(editingReward.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          condition: {
            type: conditionType,
            target,
            period,
            themeId: selectedThemeId,
            taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
            goalId: selectedGoalId,
            customStartDate: period === 'custom' ? customStart : undefined,
            customEndDate: period === 'custom' ? customEnd : undefined,
          },
        });

        setEditingReward(null);
      } else {
        await addReward({
          title: title.trim(),
          description: description.trim() || undefined,
          condition: {
            type: conditionType,
            target,
            period,
            themeId: selectedThemeId,
            taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
            goalId: selectedGoalId,
            customStartDate: period === 'custom' ? customStart : undefined,
            customEndDate: period === 'custom' ? customEnd : undefined,
          },
        });
      }

      resetForm();
      setScreen('list');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Excluir', 'Deseja excluir esta recompensa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => removeReward(id) },
    ]);
  }

  const needsPeriod = conditionType === 'focus_hours' || conditionType === 'tasks_completed';
  const needsTarget = conditionType === 'focus_hours' || conditionType === 'tasks_completed';

  if (screen === 'create') {
    return (
      <View style={globalStyles.screen}>
        <Header
          title={editingReward ? 'Editar recompensa' : 'Nova recompensa'}
          onBack={() => {
            resetForm();
            setScreen('list');
          }}
        />

        <Modal visible={showTaskModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Selecionar tarefas</Text>
              <ScrollView style={styles.modalScroll}>
                {tasks.map((task) => {
                  const selected = selectedTaskIds.includes(task.id);
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.modalItem}
                      onPress={() =>
                        setSelectedTaskIds((prev) =>
                          selected ? prev.filter((id) => id !== task.id) : [...prev, task.id],
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={selected ? colors.primary : colors.textDisabled}
                      />
                      <Text style={styles.modalItemText} numberOfLines={2}>
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Button
                label={`Confirmar (${selectedTaskIds.length} selecionadas)`}
                onPress={() => setShowTaskModal(false)}
                fullWidth
              />
            </View>
          </View>
        </Modal>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Recompensa *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Sorvete, Dia de folga, Viagem..."
            placeholderTextColor={colors.textDisabled}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />

          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Detalhes..."
            placeholderTextColor={colors.textDisabled}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />

          <Text style={styles.label}>Tipo de condição</Text>
          <View style={styles.optionGrid}>
            {CONDITION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.condChip, conditionType === opt.key && styles.condChipActive]}
                onPress={() => setConditionType(opt.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={18}
                  color={conditionType === opt.key ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text
                  style={[styles.condLabel, conditionType === opt.key && styles.condLabelActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {conditionType === 'focus_hours' && (
            <>
              <Text style={styles.label}>Tema de foco (opcional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.themeRow}
              >
                <TouchableOpacity
                  style={[styles.themeChip, !selectedThemeId && styles.themeChipActive]}
                  onPress={() => setSelectedThemeId(undefined)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.themeLabel, !selectedThemeId && styles.themeLabelActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {themes.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.themeChip, selectedThemeId === t.id && styles.themeChipActive]}
                    onPress={() => setSelectedThemeId(t.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.themeLabel,
                        selectedThemeId === t.id && styles.themeLabelActive,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {conditionType === 'tasks_specific' && (
            <>
              <Text style={styles.label}>Tarefas *</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowTaskModal(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="format-list-checks"
                  size={20}
                  color={colors.primaryDark}
                />
                <Text style={styles.selectorBtnText}>
                  {selectedTaskIds.length === 0
                    ? 'Selecionar tarefas...'
                    : `${selectedTaskIds.length} tarefa(s) selecionada(s)`}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.textDisabled}
                />
              </TouchableOpacity>
              {selectedTaskIds.length > 0 && (
                <View style={styles.selectedTasks}>
                  {selectedTaskIds.map((id) => {
                    const task = tasks.find((t) => t.id === id);
                    return task ? (
                      <View key={id} style={styles.selectedTaskChip}>
                        <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setSelectedTaskIds((p) => p.filter((i) => i !== id))}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={14}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : null;
                  })}
                </View>
              )}
            </>
          )}

          {conditionType === 'goal_completed' && (
            <>
              <Text style={styles.label}>Meta *</Text>
              {goals.length === 0 ? (
                <Text style={styles.emptyNote}>Nenhuma meta criada ainda.</Text>
              ) : (
                goals.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.goalItem, selectedGoalId === g.id && styles.goalItemActive]}
                    onPress={() => setSelectedGoalId(g.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.goalDot, { backgroundColor: g.color ?? colors.primary }]}
                    />
                    <Text
                      style={[
                        styles.goalItemTitle,
                        selectedGoalId === g.id && styles.goalItemTitleActive,
                      ]}
                    >
                      {g.title}
                    </Text>
                    {selectedGoalId === g.id && (
                      <MaterialCommunityIcons name="check" size={16} color={colors.textOnPrimary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {needsTarget && (
            <>
              <Text style={styles.label}>
                {conditionType === 'focus_hours' ? 'Horas necessárias' : 'Tarefas necessárias'}
              </Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTarget((p) => Math.max(1, p - 1))}
                >
                  <MaterialCommunityIcons name="minus" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>
                  {target}
                  {conditionType === 'focus_hours' ? 'h' : ''}
                </Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setTarget((p) => p + 1)}>
                  <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {needsPeriod && (
            <>
              <Text style={styles.label}>Período</Text>
              <View style={styles.optionRow}>
                {PERIOD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.periodChip, period === opt.key && styles.periodChipActive]}
                    onPress={() => setPeriod(opt.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.periodLabel, period === opt.key && styles.periodLabelActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {period === 'custom' && (
                <View style={styles.customDateRow}>
                  <View style={styles.customDateFlex}>
                    <DatePicker
                      label="De"
                      value={customStart}
                      onChange={setCustomStart}
                      placeholder="Início"
                    />
                  </View>
                  <View style={styles.customDateFlex}>
                    <DatePicker
                      label="Até"
                      value={customEnd}
                      onChange={setCustomEnd}
                      placeholder="Fim"
                      minimumDate={customStart ? new Date(customStart + 'T12:00:00') : undefined}
                    />
                  </View>
                </View>
              )}
            </>
          )}

          <Button
            label={editingReward ? 'Salvar alterações' : 'Criar recompensa'}
            onPress={handleSave}
            fullWidth
            loading={saving}
            style={styles.saveButton}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Recompensas"
        rightAction={{ icon: 'plus', onPress: () => setScreen('create') }}
      />

      {loading ? (
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : rewards.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="Nenhuma recompensa criada"
          description="Defina recompensas para se motivar a estudar e concluir tarefas"
          actionLabel="Criar recompensa"
          onAction={() => setScreen('create')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {unlocked.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="trophy" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Desbloqueadas ({unlocked.length})</Text>
              </View>
              {unlocked.map((r) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  sessions={sessions}
                  tasks={tasks}
                  goals={goals}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </>
          )}

          {locked.length > 0 && (
            <>
              <View
                style={[styles.sectionHeader, { marginTop: unlocked.length > 0 ? spacing.lg : 0 }]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>Em progresso ({locked.length})</Text>
              </View>
              {locked.map((r) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  sessions={sessions}
                  tasks={tasks}
                  goals={goals}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
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
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  condChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '45%',
  },
  condChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  condLabel: {
    ...typography.label,
    color: colors.textSecondary,
    flex: 1,
  },
  condLabelActive: {
    color: colors.textOnPrimary,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  themeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  themeLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  themeLabelActive: {
    color: colors.textOnPrimary,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  selectorBtnText: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  selectedTasks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  selectedTaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    maxWidth: '90%',
  },
  selectedTaskTitle: {
    ...typography.xs,
    color: colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  goalItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  goalDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  goalItemTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  goalItemTitleActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  emptyNote: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterValue: {
    ...typography.h2,
    color: colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  periodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  periodLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  periodLabelActive: {
    color: colors.textOnPrimary,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customDateFlex: {
    flex: 1,
  },
  saveButton: {
    marginTop: spacing.xl,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
