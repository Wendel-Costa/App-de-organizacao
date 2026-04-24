import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, typography } from '@/styles/theme';
import type { Priority } from '@/types/task.types';

interface PriorityBadgeProps {
  priority: Priority;
}

const config = {
  high: { color: colors.priorityHigh, label: 'Alta', icon: 'arrow-up-circle' },
  medium: { color: colors.priorityMed, label: 'Média', icon: 'minus-circle' },
  low: { color: colors.priorityLow, label: 'Baixa', icon: 'arrow-down-circle' },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { color, label, icon } = config[priority];

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <MaterialCommunityIcons name={icon as any} size={13} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
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
  },
  label: {
    ...typography.xs,
    fontWeight: '600',
  },
});
