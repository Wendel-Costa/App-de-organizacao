import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { ProgressRing } from '@/components/ProgressRing';
import { calcGoalProgress } from '@/services/goals.service';
import type { Goal } from '@/types/goal.types';

interface GoalCardProps {
  goal: Goal;
  onPress: (goal: Goal) => void;
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate + 'T23:59:59');
  const today = new Date();
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const progress = calcGoalProgress(goal);
  const daysLeft = getDaysRemaining(goal.endDate);
  const accentColor = goal.color ?? colors.primary;
  const isExpired = daysLeft < 0;

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: accentColor }]}
      onPress={() => onPress(goal)}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {goal.title}
        </Text>

        {goal.description && (
          <Text style={styles.description} numberOfLines={2}>
            {goal.description}
          </Text>
        )}

        <View style={styles.meta}>
          <MaterialCommunityIcons name="calendar-range" size={13} color={colors.textDisabled} />
          <Text style={styles.metaText}>
            {new Date(goal.startDate + 'T12:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
            {' → '}
            {new Date(goal.endDate + 'T12:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.meta}>
          <MaterialCommunityIcons
            name={isExpired ? 'alert-circle-outline' : 'clock-outline'}
            size={13}
            color={isExpired ? colors.error : colors.textDisabled}
          />
          <Text style={[styles.metaText, isExpired && { color: colors.error }]}>
            {isExpired
              ? `Encerrada há ${Math.abs(daysLeft)} dia(s)`
              : `${daysLeft} dia(s) restante(s)`}
          </Text>
        </View>

        <Text style={styles.taskCount}>
          {goal.tasks.length} tarefa(s)
          {goal.tolerance > 0 && ` · ${Math.round(goal.tolerance * 100)}% de margem`}
        </Text>
      </View>

      <ProgressRing progress={progress} size={72} color={accentColor} />
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
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  description: {
    ...typography.sm,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.xs,
    color: colors.textDisabled,
    textTransform: 'capitalize',
  },
  taskCount: {
    ...typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
