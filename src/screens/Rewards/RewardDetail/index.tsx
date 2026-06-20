import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useRewardStore } from '@/store/rewardStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCondition, calcRewardProgress } from '@/services/rewards.service';
import type { Reward } from '@/types/reward.types';
import type { FocusSession } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import type { Goal } from '@/types/goal.types';

interface RewardDetailScreenProps {
  reward: Reward;
  sessions: FocusSession[];
  tasks: Task[];
  goals: Goal[];
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function RewardDetailScreen({
  reward,
  sessions,
  tasks,
  goals,
  onBack,
  onEdit,
  onDeleted,
}: RewardDetailScreenProps) {
  const { removeReward, archiveReward } = useRewardStore();

  const progress = reward.unlocked ? 1 : calcRewardProgress(reward, sessions, tasks, goals);
  const percent = Math.round(progress * 100);
  const theme = reward.condition.themeId
    ? sessions.find((s) => s.themeId === reward.condition.themeId)?.themeName
    : undefined;
  const taskTitles = reward.condition.taskIds
    ?.map((id) => tasks.find((t) => t.id === id)?.title)
    .filter(Boolean) as string[] | undefined;
  const goalTitle = reward.condition.goalId
    ? goals.find((g) => g.id === reward.condition.goalId)?.title
    : undefined;

  function handleDelete() {
    Alert.alert('Excluir', 'Deseja excluir esta recompensa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removeReward(reward.id);
          onDeleted();
        },
      },
    ]);
  }

  function handleArchive() {
    Alert.alert(
      'Guardar recompensa',
      'A recompensa será movida para a seção "Guardadas". Ela não será apagada e você ainda poderá acessá-la.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            await archiveReward(reward.id);
            onDeleted();
          },
        },
      ],
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Recompensa"
        onBack={onBack}
        rightAction={{ icon: 'pencil-outline', onPress: onEdit }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, reward.unlocked && styles.heroIconUnlocked]}>
            <MaterialCommunityIcons
              name={reward.unlocked ? 'trophy' : 'trophy-outline'}
              size={48}
              color={reward.unlocked ? colors.primary : colors.textDisabled}
            />
          </View>
          {reward.unlocked && (
            <View style={styles.unlockedBadge}>
              <MaterialCommunityIcons name="check" size={14} color={colors.textOnPrimary} />
              <Text style={styles.unlockedBadgeText}>Desbloqueada!</Text>
            </View>
          )}
        </View>

        <Card elevated style={styles.mainCard}>
          <Text style={styles.title}>{reward.title}</Text>
          {reward.description && <Text style={styles.description}>{reward.description}</Text>}
        </Card>

        {reward.unlocked && !reward.archived && (
          <Card style={[styles.archiveCard, { borderColor: '#FFD700' + '55' }]}>
            <View style={styles.archiveCardContent}>
              <MaterialCommunityIcons name="archive-check-outline" size={22} color="#B8860B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.archiveCardTitle}>Guardar recompensa</Text>
                <Text style={styles.archiveCardDesc}>
                  Mover para a seção "Guardadas" sem excluir
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.archiveIconBtn, { backgroundColor: '#FFD700' }]}
                onPress={handleArchive}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="archive-outline" size={18} color="#2A2318" />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Condição</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="flag-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {formatCondition(reward, theme, taskTitles, goalTitle)}
            </Text>
          </View>

          {reward.unlockedAt && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.success }]}>
                Desbloqueada em{' '}
                {new Date(reward.unlockedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Criada em{' '}
              {new Date(reward.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </Card>

        {!reward.unlocked && (
          <>
            <Text style={styles.sectionTitle}>Progresso</Text>
            <Card style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressPercent}>{percent}%</Text>
                <Text style={styles.progressLabel}>concluído</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
            </Card>
          </>
        )}

        <Button
          label="Editar recompensa"
          onPress={onEdit}
          variant="secondary"
          fullWidth
          style={styles.actionBtn}
        />
        <Button
          label="Excluir recompensa"
          onPress={handleDelete}
          variant="danger"
          fullWidth
          style={styles.actionBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  heroSection: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconUnlocked: { backgroundColor: colors.primaryLight },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  unlockedBadgeText: { ...typography.label, color: colors.textOnPrimary },
  mainCard: { gap: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  archiveCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  archiveCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  archiveCardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  archiveCardDesc: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  archiveIconBtn: {
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
  infoCard: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  progressCard: { gap: spacing.sm },
  progressHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  progressPercent: { ...typography.h1, color: colors.textPrimary },
  progressLabel: { ...typography.body, color: colors.textSecondary },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  actionBtn: { marginTop: spacing.xs },
});
