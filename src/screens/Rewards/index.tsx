import { useState, useCallback, useEffect, useRef } from 'react';
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
  BackHandler,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewardStore } from '@/store/rewardStore';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { RewardCard } from '@/components/RewardCard';
import { EmptyState } from '@/components/EmptyState';
import { DatePicker } from '@/components/DatePicker';
import { DraggableList } from '@/components/DraggableList';
import type {
  PurchasableReward,
  Reward,
  RewardConditionType,
  RewardPeriod,
} from '@/types/reward.types';
import { RewardDetailScreen } from './RewardDetail';
import { useGamificationStore } from '@/store/gamificationStore';
import { formatWholeNumber } from '@/utils/number';
import { Card } from '@/components/Card';

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

function EditableValue({
  value,
  onChange,
  suffix = '',
  style,
  min = 1,
  scrollViewRef,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  style?: any;
  min?: number;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const containerRef = useRef<View>(null);

  function commit() {
    const v = parseInt(text, 10);
    if (!isNaN(v) && v >= min) onChange(v);
    setEditing(false);
  }

  function scrollIntoView() {
    requestAnimationFrame(() => {
      const scrollNode = scrollViewRef?.current ? findNodeHandle(scrollViewRef.current) : null;
      const containerNode = containerRef.current ? findNodeHandle(containerRef.current) : null;
      if (!scrollNode || !containerNode) return;
      UIManager.measureLayout(
        containerNode,
        scrollNode,
        () => {},
        (_x: number, y: number) => {
          scrollViewRef?.current?.scrollTo({ y: Math.max(y - 160, 0), animated: true });
        },
      );
    });
  }

  if (editing) {
    return (
      <View ref={containerRef} collapsable={false}>
        <TextInput
          style={[style, { padding: 0, minWidth: 60, textAlign: 'center' }]}
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          autoFocus
          onFocus={scrollIntoView}
          onBlur={commit}
          onSubmitEditing={commit}
          returnKeyType="done"
          selectTextOnFocus
        />
      </View>
    );
  }
  return (
    <View ref={containerRef} collapsable={false}>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => {
          setText(String(value));
          setEditing(true);
        }}
      >
        <Text style={style}>
          {value}
          {suffix}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function RewardsScreen() {
  const rewards = useRewardStore((state) => state.rewards);
  const loading = useRewardStore((state) => state.loading);
  const fetchRewards = useRewardStore((state) => state.fetchRewards);
  const addReward = useRewardStore((state) => state.addReward);
  const editReward = useRewardStore((state) => state.editReward);
  const removeReward = useRewardStore((state) => state.removeReward);
  const checkAndUnlock = useRewardStore((state) => state.checkAndUnlock);
  const unarchiveReward = useRewardStore((state) => state.unarchiveReward);
  const reorderRewards = useRewardStore((state) => state.reorderRewards);
  const purchasableRewards = useRewardStore((state) => state.purchasableRewards);
  const fetchPurchasableRewards = useRewardStore((state) => state.fetchPurchasableRewards);
  const addPurchasableReward = useRewardStore((state) => state.addPurchasableReward);
  const buyPurchasableReward = useRewardStore((state) => state.buyPurchasableReward);
  const editPurchasableReward = useRewardStore((state) => state.editPurchasableReward);
  const removePurchasableReward = useRewardStore((state) => state.removePurchasableReward);
  const purchases = useRewardStore((state) => state.purchases);
  const fetchPurchases = useRewardStore((state) => state.fetchPurchases);
  const archivePurchase = useRewardStore((state) => state.archivePurchase);

  const sessions = useFocusStore((state) => state.sessions);
  const themes = useFocusStore((state) => state.themes);
  const fetchSessions = useFocusStore((state) => state.fetchSessions);
  const fetchThemes = useFocusStore((state) => state.fetchThemes);
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const goals = useGoalStore((state) => state.goals);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);

  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  type Screen = 'list' | 'create' | 'detail';
  const [screen, setScreen] = useState<Screen>('list');
  const [showArchivedRewards, setShowArchivedRewards] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conditionType, setConditionType] = useState<RewardConditionType>('focus_hours');
  const [target, setTarget] = useState(10);
  const [period, setPeriod] = useState<RewardPeriod>('anytime');
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const gameSummary = useGamificationStore((state) => state.summary);
  const fetchGamification = useGamificationStore((state) => state.fetch);
  const [shopModal, setShopModal] = useState(false);
  const [shopTitle, setShopTitle] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopCost, setShopCost] = useState('50');
  const [editingShopReward, setEditingShopReward] = useState<PurchasableReward | null>(null);
  const [shopActionReward, setShopActionReward] = useState<PurchasableReward | null>(null);
  const [showArchivedPurchases, setShowArchivedPurchases] = useState(false);
  const insets = useSafeAreaInsets();

  const scrollRef = useRef<ScrollView>(null);
  const longPressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchRewards();
    fetchSessions();
    fetchThemes();
    fetchTasks();
    fetchGoals();
    fetchPurchasableRewards();
    fetchPurchases();
    fetchGamification();
  }, []);

  useEffect(() => {
    if (rewards.length > 0 && (sessions.length > 0 || tasks.length > 0 || goals.length > 0)) {
      checkAndUnlock(sessions, tasks, goals);
    }
  }, [sessions, tasks, goals, rewards, checkAndUnlock]);

  useEffect(() => {
    return () => {
      stopContinuous();
    };
  }, []);

  function startContinuous(action: () => void) {
    longPressIntervalRef.current = setInterval(action, 150);
  }

  function stopContinuous() {
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
  }

  function hasUnsavedChanges() {
    if (editingReward)
      return title !== editingReward.title || description !== (editingReward.description ?? '');
    return title.trim().length > 0;
  }

  function openShopEditor(reward?: PurchasableReward) {
    if (reward) {
      setEditingShopReward(reward);
      setShopTitle(reward.title);
      setShopDescription(reward.description ?? '');
      setShopCost(String(reward.cost));
    } else {
      setEditingShopReward(null);
      setShopTitle('');
      setShopDescription('');
      setShopCost('50');
    }
    setShopModal(true);
  }

  function handleShopAction(reward: PurchasableReward) {
    setShopActionReward(reward);
  }

  function closeShopAction() {
    setShopActionReward(null);
  }

  function handleBack() {
    if (hasUnsavedChanges()) {
      Alert.alert(
        editingReward ? 'Descartar alterações?' : 'Descartar recompensa?',
        'Você tem informações não salvas. Deseja voltar?',
        [
          { text: 'Continuar editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => {
              resetForm();
              setScreen('list');
            },
          },
        ],
      );
    } else {
      resetForm();
      setScreen('list');
    }
  }

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (screen === 'create') {
          handleBack();
          return true;
        }
        if (screen === 'detail') {
          setScreen('list');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [screen, title, description, editingReward]),
  );

  const activeUnlocked = rewards.filter((r) => r.unlocked && !r.archived);
  const locked = rewards.filter((r) => !r.unlocked && !r.archived);
  const archivedRewards = rewards.filter((r) => r.archived);

  function resetForm() {
    setTitle('');
    setDescription('');
    setConditionType('focus_hours');
    setTarget(10);
    setPeriod('anytime');
    setSelectedThemeIds([]);
    setSelectedTaskIds([]);
    setSelectedGoalIds([]);
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
    setSelectedThemeIds(
      reward.condition.themeIds ?? (reward.condition.themeId ? [reward.condition.themeId] : []),
    );
    setSelectedTaskIds(reward.condition.taskIds ?? []);
    setSelectedGoalIds(
      reward.condition.goalIds ?? (reward.condition.goalId ? [reward.condition.goalId] : []),
    );
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
    if (conditionType === 'goal_completed' && selectedGoalIds.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma meta.');
      return;
    }
    if (conditionType === 'focus_hours' && target <= 0) {
      Alert.alert('Atenção', 'Defina quantas horas.');
      return;
    }

    setSaving(true);
    try {
      const conditionData = {
        type: conditionType,
        target,
        period,
        themeIds: selectedThemeIds.length > 0 ? selectedThemeIds : undefined,
        taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
        goalIds: selectedGoalIds.length > 0 ? selectedGoalIds : undefined,
        customStartDate: period === 'custom' ? customStart : undefined,
        customEndDate: period === 'custom' ? customEnd : undefined,
      };
      const rewardData = {
        title: title.trim(),
        description: description.trim() || undefined,
        condition: conditionData,
      };

      if (editingReward) {
        await editReward(editingReward.id, rewardData);
        setEditingReward(null);
      } else {
        await addReward(rewardData);
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

  if (screen === 'detail' && selectedReward) {
    return (
      <RewardDetailScreen
        reward={rewards.find((r) => r.id === selectedReward.id) ?? selectedReward}
        sessions={sessions}
        themes={themes}
        tasks={tasks}
        goals={goals}
        onBack={() => setScreen('list')}
        onEdit={() => {
          handleEdit(selectedReward);
          setScreen('create');
        }}
        onDeleted={() => setScreen('list')}
      />
    );
  }

  if (screen === 'create') {
    return (
      <View style={globalStyles.screen}>
        <Header
          title={editingReward ? 'Editar recompensa' : 'Nova recompensa'}
          onBack={handleBack}
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
          ref={scrollRef}
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
              <Text style={styles.label}>Temas de foco (opcional)</Text>
              <Text style={styles.helperText}>Sem seleção, todos os temas serão considerados.</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.themeRow}
              >
                <TouchableOpacity
                  style={[
                    styles.themeChip,
                    selectedThemeIds.length === 0 && styles.themeChipActive,
                  ]}
                  onPress={() => setSelectedThemeIds([])}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.themeLabel,
                      selectedThemeIds.length === 0 && styles.themeLabelActive,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {themes.map((t) => {
                  const selected = selectedThemeIds.includes(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.themeChip, selected && styles.themeChipActive]}
                      onPress={() =>
                        setSelectedThemeIds((current) =>
                          current.includes(t.id)
                            ? current.filter((id) => id !== t.id)
                            : [...current, t.id],
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.themeLabel, selected && styles.themeLabelActive]}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
              <Text style={styles.label}>Metas *</Text>
              <Text style={styles.helperText}>
                Todas as metas selecionadas precisam ser concluídas.
              </Text>
              {goals.length === 0 ? (
                <Text style={styles.emptyNote}>Nenhuma meta criada ainda.</Text>
              ) : (
                goals.map((g) => {
                  const selected = selectedGoalIds.includes(g.id);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.goalItem, selected && styles.goalItemActive]}
                      onPress={() =>
                        setSelectedGoalIds((current) =>
                          current.includes(g.id)
                            ? current.filter((id) => id !== g.id)
                            : [...current, g.id],
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[styles.goalDot, { backgroundColor: g.color ?? colors.primary }]}
                      />
                      <Text style={[styles.goalItemTitle, selected && styles.goalItemTitleActive]}>
                        {g.title}
                      </Text>
                      {selected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color={colors.textOnPrimary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
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
                  onLongPress={() => startContinuous(() => setTarget((p) => Math.max(1, p - 1)))}
                  onPressOut={stopContinuous}
                  delayLongPress={300}
                >
                  <MaterialCommunityIcons name="minus" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <EditableValue
                  value={target}
                  onChange={setTarget}
                  suffix={conditionType === 'focus_hours' ? 'h' : ''}
                  style={styles.counterValue}
                  min={1}
                  scrollViewRef={scrollRef}
                />
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTarget((p) => p + 1)}
                  onLongPress={() => startContinuous(() => setTarget((p) => p + 1))}
                  onPressOut={stopContinuous}
                  delayLongPress={300}
                >
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
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.gameSummaryCard}>
              <View style={styles.gameTopRow}>
                <View>
                  <Text style={styles.gameLevel}>Nível {gameSummary.level}</Text>
                  <Text style={styles.gamePoints}>
                    {formatWholeNumber(gameSummary.points)} pontos
                  </Text>
                </View>
                <View style={styles.coinPill}>
                  <MaterialCommunityIcons name="cash" size={16} color={colors.primary} />
                  <Text style={styles.coinText}>{formatWholeNumber(gameSummary.coins)} moedas</Text>
                </View>
              </View>
              <View style={styles.levelTrack}>
                <View
                  style={[
                    styles.levelFill,
                    { width: `${Math.max(0, Math.min(1, gameSummary.progress)) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.levelHint}>
                {formatWholeNumber(gameSummary.points)} /{' '}
                {formatWholeNumber(gameSummary.nextLevelPoints ?? gameSummary.points)} pontos para o
                próximo nível
              </Text>
            </View>

            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="store-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Loja</Text>
                <TouchableOpacity onPress={() => openShopEditor()} hitSlop={6}>
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {purchasableRewards.length === 0 ? (
              <Text style={styles.emptyNote}>Nenhuma recompensa comprável ainda.</Text>
            ) : (
              purchasableRewards.map((shopReward) => (
                <Card key={shopReward.id} style={styles.shopCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopTitle}>{shopReward.title}</Text>
                    {shopReward.description ? (
                      <Text style={styles.shopDescription}>{shopReward.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleShopAction(shopReward)}
                    style={styles.shopManageButton}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() =>
                      Alert.alert(
                        'Comprar recompensa',
                        `Gastar ${formatWholeNumber(shopReward.cost)} moedas em “${shopReward.title}”?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Comprar',
                            onPress: async () => {
                              try {
                                await buyPurchasableReward(shopReward);
                                await fetchGamification();
                                Alert.alert('Compra realizada', 'A recompensa foi resgatada.');
                              } catch {
                                Alert.alert(
                                  'Saldo insuficiente',
                                  'Você não possui moedas suficientes.',
                                );
                              }
                            },
                          },
                        ],
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name="cash-minus"
                      size={15}
                      color={colors.textOnPrimary}
                    />
                    <Text style={styles.buyText}>{formatWholeNumber(shopReward.cost)}</Text>
                  </TouchableOpacity>
                </Card>
              ))
            )}

            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="trophy-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Conquistas</Text>
              </View>
            </View>
            {activeUnlocked.length === 0 ? (
              <Text style={styles.emptyNote}>Nenhuma conquista</Text>
            ) : null}
            {activeUnlocked.length > 0 && (
              <DraggableList
                data={activeUnlocked}
                keyExtractor={(r) => r.id}
                gap={spacing.sm}
                onReorder={(newOrder) => reorderRewards(newOrder.map((r) => r.id))}
                renderItem={(r) => (
                  <RewardCard
                    reward={r}
                    sessions={sessions}
                    themes={themes}
                    tasks={tasks}
                    goals={goals}
                    onDelete={handleDelete}
                    draggable={activeUnlocked.length > 1}
                    onPress={(reward) => {
                      setSelectedReward(reward);
                      setScreen('detail');
                    }}
                  />
                )}
              />
            )}

            {locked.length > 0 && (
              <>
                <View
                  style={[
                    styles.sectionHeader,
                    { marginTop: activeUnlocked.length > 0 ? spacing.lg : 0 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.sectionTitle}>Em progresso ({locked.length})</Text>
                </View>
                <DraggableList
                  data={locked}
                  keyExtractor={(r) => r.id}
                  gap={spacing.sm}
                  onReorder={(newOrder) => reorderRewards(newOrder.map((r) => r.id))}
                  renderItem={(r) => (
                    <RewardCard
                      reward={r}
                      sessions={sessions}
                      themes={themes}
                      tasks={tasks}
                      goals={goals}
                      onDelete={handleDelete}
                      draggable={locked.length > 1}
                      onPress={(reward) => {
                        setSelectedReward(reward);
                        setScreen('detail');
                      }}
                    />
                  )}
                />
              </>
            )}

            {archivedRewards.length > 0 && (
              <View style={styles.archivedSection}>
                <TouchableOpacity
                  style={styles.archivedHeader}
                  onPress={() => setShowArchivedRewards((p) => !p)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="archive-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.archivedHeaderText}>
                    Recompensas guardadas ({archivedRewards.length})
                  </Text>
                  <MaterialCommunityIcons
                    name={showArchivedRewards ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {showArchivedRewards &&
                  archivedRewards.map((r) => (
                    <View key={r.id} style={styles.archivedCard}>
                      <TouchableOpacity
                        style={styles.archivedCardInner}
                        onPress={() => {
                          setSelectedReward(r);
                          setScreen('detail');
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="trophy" size={18} color="#B8860B" />
                        <Text style={styles.archivedTitle} numberOfLines={1}>
                          {r.title}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => unarchiveReward(r.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name="archive-arrow-up-outline"
                          size={16}
                          color={colors.textDisabled}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {purchases.length > 0 && (
              <View style={styles.purchaseSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="history" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Histórico de compras</Text>
                </View>
                {purchases
                  .filter((p) => !p.archived)
                  .map((purchase) => (
                    <Card key={purchase.id} style={styles.purchaseCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shopTitle}>{purchase.title}</Text>
                        <Text style={styles.purchaseMeta}>
                          {new Date(purchase.purchasedAt).toLocaleDateString('pt-BR')} ·{' '}
                          {formatWholeNumber(purchase.cost)} moedas
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => archivePurchase(purchase.id)} hitSlop={8}>
                        <MaterialCommunityIcons
                          name="archive-outline"
                          size={18}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </Card>
                  ))}
                {purchases.some((p) => p.archived) && (
                  <>
                    <TouchableOpacity
                      style={styles.archivedPurchaseToggle}
                      onPress={() => setShowArchivedPurchases((value) => !value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.archivedPurchaseNote}>
                        Compras arquivadas ({purchases.filter((p) => p.archived).length})
                      </Text>
                      <MaterialCommunityIcons
                        name={showArchivedPurchases ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {showArchivedPurchases &&
                      purchases
                        .filter((p) => p.archived)
                        .map((purchase) => (
                          <Card key={purchase.id} style={styles.purchaseCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.shopTitle}>{purchase.title}</Text>
                              <Text style={styles.purchaseMeta}>
                                {new Date(purchase.purchasedAt).toLocaleDateString('pt-BR')} ·{' '}
                                {formatWholeNumber(purchase.cost)} moedas
                              </Text>
                            </View>
                            <MaterialCommunityIcons
                              name="archive-check-outline"
                              size={18}
                              color={colors.textDisabled}
                            />
                          </Card>
                        ))}
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <Modal
            visible={shopModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShopModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContainer,
                  {
                    maxHeight: '80%',
                    paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm),
                  },
                ]}
              >
                <Text style={styles.modalTitle}>
                  {editingShopReward ? 'Editar item da loja' : 'Nova recompensa da loja'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome"
                  value={shopTitle}
                  onChangeText={setShopTitle}
                  placeholderTextColor={colors.textDisabled}
                />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Descrição (opcional)"
                  value={shopDescription}
                  onChangeText={setShopDescription}
                  multiline
                  placeholderTextColor={colors.textDisabled}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Custo em moedas"
                  value={shopCost}
                  onChangeText={(v) => setShopCost(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textDisabled}
                />
                <Button
                  label={editingShopReward ? 'Salvar alterações' : 'Adicionar à loja'}
                  fullWidth
                  onPress={async () => {
                    const cost = Number(shopCost);
                    if (!shopTitle.trim() || cost <= 0) {
                      Alert.alert('Atenção', 'Informe nome e custo válido.');
                      return;
                    }
                    try {
                      if (editingShopReward) {
                        await editPurchasableReward(editingShopReward.id, {
                          title: shopTitle.trim(),
                          description: shopDescription.trim() || undefined,
                          cost,
                        });
                      } else {
                        await addPurchasableReward({
                          title: shopTitle.trim(),
                          description: shopDescription.trim() || undefined,
                          cost,
                        });
                      }
                      setShopTitle('');
                      setShopDescription('');
                      setShopCost('50');
                      setEditingShopReward(null);
                      setShopModal(false);
                    } catch {
                      Alert.alert('Erro', 'Não foi possível salvar o item da loja.');
                    }
                  }}
                />
                <Button
                  label="Cancelar"
                  fullWidth
                  variant="secondary"
                  onPress={() => {
                    setShopModal(false);
                    setEditingShopReward(null);
                  }}
                />
              </View>
            </View>
          </Modal>

          <Modal
            visible={shopActionReward !== null}
            transparent
            animationType="fade"
            onRequestClose={closeShopAction}
          >
            <View style={styles.shopActionOverlay}>
              <View style={styles.shopActionCard}>
                <Text style={styles.shopActionTitle} numberOfLines={2}>
                  {shopActionReward?.title}
                </Text>

                <TouchableOpacity
                  style={[styles.shopActionButton, styles.shopActionCancel]}
                  onPress={closeShopAction}
                  activeOpacity={0.75}
                >
                  <Text style={styles.shopActionCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shopActionButton}
                  onPress={() => {
                    const reward = shopActionReward;
                    closeShopAction();
                    if (reward) openShopEditor(reward);
                  }}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                  <Text style={styles.shopActionButtonText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shopActionButton, styles.shopActionButtonDanger]}
                  onPress={() => {
                    const reward = shopActionReward;
                    closeShopAction();
                    if (!reward) return;
                    Alert.alert(
                      'Excluir item?',
                      'Tem certeza que deseja excluir este item da loja?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Excluir',
                          style: 'destructive',
                          onPress: () => {
                            void removePurchasableReward(reward.id);
                          },
                        },
                      ],
                    );
                  }}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={[styles.shopActionButtonText, styles.shopActionDangerText]}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionDivider: { gap: spacing.xs, marginTop: spacing.sm },
  dividerLine: { height: 1, backgroundColor: colors.divider },
  gameSummaryCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameLevel: { ...typography.h2, color: colors.textPrimary },
  gamePoints: { ...typography.sm, color: colors.textSecondary, marginTop: 2 },
  coinPill: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  coinText: { ...typography.label, color: colors.primaryDark },
  levelTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  levelFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  levelHint: { ...typography.xs, color: colors.textSecondary, marginTop: spacing.xs },
  shopCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shopManageButton: { width: 28, alignItems: 'center', justifyContent: 'center' },
  purchaseSection: { gap: spacing.sm, marginTop: spacing.md },
  purchaseCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  purchaseMeta: { ...typography.xs, color: colors.textSecondary, marginTop: 3 },
  archivedPurchaseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  archivedPurchaseNote: { ...typography.xs, color: colors.textDisabled, textAlign: 'center' },
  shopTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  shopDescription: { ...typography.xs, color: colors.textSecondary, marginTop: 2 },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buyText: { ...typography.label, color: colors.textOnPrimary },
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
  helperText: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
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

  shopActionOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shopActionCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  shopActionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  shopActionButton: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
  },
  shopActionButtonDanger: {
    borderColor: colors.error + '44',
    backgroundColor: colors.error + '0A',
  },
  shopActionButtonText: {
    ...typography.label,
    color: colors.primaryDark,
  },
  shopActionDangerText: {
    color: colors.error,
  },
  shopActionCancel: {
    width: '100%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  shopActionCancelText: {
    ...typography.label,
    color: colors.textSecondary,
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
  dragHint: {
    ...typography.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },

  archivedSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
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
  archivedHeaderText: {
    ...typography.label,
    color: colors.textSecondary,
    flex: 1,
  },
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
  archivedCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  archivedTitle: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
});
