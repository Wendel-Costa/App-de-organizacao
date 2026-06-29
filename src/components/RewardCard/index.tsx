import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { formatCondition, calcRewardProgress } from '@/services/rewards.service';
import type { Reward } from '@/types/reward.types';
import type { FocusSession } from '@/types/focus.types';
import type { Task } from '@/types/task.types';
import type { Goal } from '@/types/goal.types';

interface RewardCardProps {
  reward: Reward;
  sessions: FocusSession[];
  tasks: Task[];
  goals: Goal[];
  onDelete: (id: string) => void;
  onPress: (reward: Reward) => void;
  draggable?: boolean;
}

export function RewardCard({
  reward,
  sessions,
  tasks,
  goals,
  onDelete,
  onPress,
  draggable,
}: RewardCardProps) {
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

  const conditionText = formatCondition(reward, theme, taskTitles, goalTitle);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(reward)}
      style={[styles.container, reward.unlocked && styles.containerUnlocked]}
    >
      <View style={[styles.iconWrapper, reward.unlocked && styles.iconWrapperUnlocked]}>
        <MaterialCommunityIcons
          name={reward.unlocked ? 'trophy' : 'trophy-outline'}
          size={28}
          color={reward.unlocked ? colors.primary : colors.textDisabled}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, reward.unlocked && styles.titleUnlocked]} numberOfLines={1}>
            {reward.title}
          </Text>
          {reward.unlocked && (
            <View style={styles.unlockedBadge}>
              <MaterialCommunityIcons name="check" size={11} color={colors.textOnPrimary} />
              <Text style={styles.unlockedBadgeText}>Desbloqueada</Text>
            </View>
          )}
        </View>

        {reward.description && (
          <Text style={styles.description} numberOfLines={2}>
            {reward.description}
          </Text>
        )}

        <Text style={styles.condition}>{conditionText}</Text>

        {!reward.unlocked && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{percent}%</Text>
          </View>
        )}

        {reward.unlocked && reward.unlockedAt && (
          <Text style={styles.unlockedAt}>
            {new Date(reward.unlockedAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton]} onPress={() => onDelete(reward.id)}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  containerUnlocked: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperUnlocked: {
    backgroundColor: colors.primary + '33',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  titleUnlocked: {
    color: colors.primaryDark,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  unlockedBadgeText: {
    ...typography.xs,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  description: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  condition: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  unlockedAt: {
    ...typography.xs,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
