import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '@/styles/theme';
import type { Task } from '@/types/task.types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onPress: (task: Task) => void;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  high: { color: colors.priorityHigh, label: 'Alta', icon: 'arrow-up-circle' },
  medium: { color: colors.priorityMed, label: 'Média', icon: 'minus-circle' },
  low: { color: colors.priorityLow, label: 'Baixa', icon: 'arrow-down-circle' },
};

export function TaskItem({ task, onToggle, onPress, onDelete }: TaskItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const priority = task.priority ? priorityConfig[task.priority] : null;
  const completedSubs = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubs = task.subtasks?.length ?? 0;

  async function handleToggle() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    if (!task.completed) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onToggle(task.id, !task.completed);
  }

  return (
    <TouchableOpacity
      style={[styles.container, task.completed && styles.completed]}
      onPress={() => onPress(task)}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <MaterialCommunityIcons
            name={task.completed ? 'check-circle' : 'circle-outline'}
            size={24}
            color={task.completed ? colors.success : colors.textDisabled}
          />
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, task.completed && styles.titleCompleted]} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.badges}>
          {priority && (
            <View style={[styles.badge, { backgroundColor: priority.color + '22' }]}>
              <MaterialCommunityIcons
                name={priority.icon as any}
                size={12}
                color={priority.color}
              />
              <Text style={[styles.badgeText, { color: priority.color }]}>{priority.label}</Text>
            </View>
          )}

          {task.dueDate && (
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.badgeText}>
                {new Date(task.dueDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}

          {totalSubs > 0 && (
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name="format-list-checks"
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.badgeText}>
                {completedSubs}/{totalSubs}
              </Text>
            </View>
          )}

          {task.type === 'recurring' && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="repeat" size={12} color={colors.info} />
              <Text style={[styles.badgeText, { color: colors.info }]}>Recorrente</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onDelete(task.id)}
        style={styles.deleteButton}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textDisabled} />
      </TouchableOpacity>
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
  completed: {
    opacity: 0.6,
    backgroundColor: colors.surfaceAlt,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  deleteButton: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
