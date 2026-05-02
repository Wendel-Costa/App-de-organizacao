import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useRewardStore } from '@/store/rewardStore';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RewardCard } from '@/components/RewardCard';
import { EmptyState } from '@/components/EmptyState';
import type { RewardConditionType, RewardPeriod } from '@/types/reward.types';

type Screen = 'list' | 'create';

const CONDITION_OPTIONS: { key: RewardConditionType; label: string; icon: string }[] = [
  { key: 'focus_hours', label: 'Horas de foco', icon: 'timer-outline' },
  { key: 'tasks_completed', label: 'Tarefas concluídas', icon: 'check-circle-outline' },
];

const PERIOD_OPTIONS: { key: RewardPeriod; label: string }[] = [
  { key: 'day', label: 'Em um dia' },
  { key: 'week', label: 'Em uma semana' },
  { key: 'month', label: 'Em um mês' },
];

export function RewardsScreen() {
  const { rewards, loading, fetchRewards, addReward, removeReward, checkAndUnlock } =
    useRewardStore();
  const { sessions, fetchSessions } = useFocusStore();
  const { tasks, fetchTasks } = useTaskStore();

  const [screen, setScreen] = useState<Screen>('list');
  const [conditionType, setConditionType] = useState<RewardConditionType>('focus_hours');
  const [conditionTarget, setConditionTarget] = useState(10);
  const [conditionPeriod, setConditionPeriod] = useState<RewardPeriod>('week');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRewards();
    fetchSessions();
    fetchTasks();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 || tasks.length > 0) {
      checkAndUnlock(sessions, tasks).then((newOnes) => {
        if (newOnes.length > 0) {
          Alert.alert('🏆 Recompensa desbloqueada!', newOnes.map((r) => r.title).join('\n'));
        }
      });
    }
  }, [sessions, tasks]);

  const unlocked = rewards.filter((r) => r.unlocked);
  const locked = rewards.filter((r) => !r.unlocked);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Atenção', 'Dê um nome à recompensa.');
      return;
    }

    setSaving(true);
    try {
      await addReward({
        title: title.trim(),
        description: description.trim() || undefined,
        condition: {
          type: conditionType,
          target: conditionTarget,
          period: conditionPeriod,
        },
      });
      setTitle('');
      setDescription('');
      setConditionType('focus_hours');
      setConditionTarget(10);
      setConditionPeriod('week');
      setScreen('list');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a recompensa.');
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

  if (screen === 'create') {
    return (
      <View style={globalStyles.screen}>
        <Header title="Nova recompensa" onBack={() => setScreen('list')} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Recompensa *</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color={colors.textDisabled} />
            <View style={styles.textInputInner}>
              <Text style={[styles.inputPlaceholder, title && { display: 'none' }]}>
                Ex: Sorvete, Filme, Dia de folga...
              </Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ex: Sorvete, Filme, Dia de folga..."
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

          <Text style={styles.label}>Condição</Text>
          <View style={styles.optionRow}>
            {CONDITION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionChip, conditionType === opt.key && styles.optionChipActive]}
                onPress={() => setConditionType(opt.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={16}
                  color={conditionType === opt.key ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    conditionType === opt.key && styles.optionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {conditionType === 'focus_hours' ? 'Horas necessárias' : 'Tarefas necessárias'}
          </Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setConditionTarget((p) => Math.max(1, p - 1))}
            >
              <MaterialCommunityIcons name="minus" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>
              {conditionTarget}
              {conditionType === 'focus_hours' ? 'h' : ''}
            </Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setConditionTarget((p) => p + 1)}
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Período</Text>
          <View style={styles.optionRow}>
            {PERIOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionChip, conditionPeriod === opt.key && styles.optionChipActive]}
                onPress={() => setConditionPeriod(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    conditionPeriod === opt.key && styles.optionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview */}
          <Card style={styles.previewCard}>
            <View style={styles.previewRow}>
              <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
              <Text style={styles.previewText}>
                Para ganhar <Text style={styles.previewBold}>{title || '...'}</Text>
                {' você precisa '}
                <Text style={styles.previewBold}>
                  {conditionType === 'focus_hours'
                    ? `estudar ${conditionTarget}h`
                    : `concluir ${conditionTarget} tarefas`}
                </Text>{' '}
                {PERIOD_OPTIONS.find((p) => p.key === conditionPeriod)?.label.toLowerCase()}.
              </Text>
            </View>
          </Card>

          <Button
            label="Criar recompensa"
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
                  onDelete={handleDelete}
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
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

import { TextInput } from 'react-native';

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

  inputWrapper: { display: 'none' },
  textInputInner: { display: 'none' },
  inputPlaceholder: { display: 'none' },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  optionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  optionLabelActive: {
    color: colors.textOnPrimary,
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
  previewCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '44',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  previewText: {
    ...typography.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  previewBold: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  saveButton: {
    marginTop: spacing.md,
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
