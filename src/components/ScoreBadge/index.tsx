import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, typography } from '@/styles/theme';
import type { ScoreLevel } from '@/types/task.types';

interface ScoreBadgeProps {
  level: ScoreLevel;
  points: number;
}

export function ScoreBadge({ level, points }: ScoreBadgeProps) {
  return (
    <View style={styles.badge}>
      <MaterialCommunityIcons name="star-four-points-outline" size={13} color={colors.primary} />
      <Text style={styles.label}>
        Nível {level} · +{points} pts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.primaryLight,
  },
  label: { ...typography.xs, fontWeight: '600', color: colors.primaryDark },
});
