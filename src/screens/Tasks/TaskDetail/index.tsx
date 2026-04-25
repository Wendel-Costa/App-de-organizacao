import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PriorityBadge } from '@/components/PriorityBadge';
import type { Task } from '@/types/task.types';

const typeLabel = {
  anytime: 'Livre',
  scheduled: 'Agendada',
  recurring: 'Recorrente',
};

const typeIcon = {
  anytime: 'infinity',
  scheduled: 'calendar',
  recurring: 'repeat',
};

const recurrenceLabel: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
  daily: 'Todo dia',
};

interface TaskDetailScreenProps {
  task: Task;
  onBack: () => void;
  onDeleted: () => void;
}

export function TaskDetailScreen({ task, onBack, onDeleted }: TaskDetailScreenProps) {
  const { toggleComplete, toggleSubtask, removeTask } = useTaskStore();
  const [localTask, setLocalTask] = useState<Task>(task);

  async function handleToggleComplete() {
    const updated = !localTask.completed;
    await toggleComplete(localTask.id, updated);
    setLocalTask((prev) => ({ ...prev, completed: updated }));
  }

  async function handleToggleSubtask(subtaskId: string, completed: boolean) {
    await toggleSubtask(localTask.id, subtaskId, completed);
    setLocalTask((prev) => ({
      ...prev,
      subtasks: prev.subtasks?.map((s) => (s.id === subtaskId ? { ...s, completed } : s)),
    }));
  }

  function handleDelete() {
    Alert.alert(
      'Excluir tarefa',
      'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removeTask(localTask.id);
            onDeleted();
          },
        },
      ],
    );
  }

  const completedSubtasks = localTask.subtasks?.filter((s) => s.completed).length ?? 0;
  const totalSubtasks = localTask.subtasks?.length ?? 0;
  const progress = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

  return (
    <View style={globalStyles.screen}>
      <Header
        title="Detalhes"
        onBack={onBack}
        rightAction={{ icon: 'trash-can-outline', onPress: handleDelete }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card elevated style={styles.mainCard}>
          <View style={globalStyles.rowBetween}>
            <TouchableOpacity
              onPress={handleToggleComplete}
              style={styles.checkRow}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={localTask.completed ? 'check-circle' : 'circle-outline'}
                size={28}
                color={localTask.completed ? colors.success : colors.textDisabled}
              />
              <Text style={[styles.title, localTask.completed && styles.titleCompleted]}>
                {localTask.title}
              </Text>
            </TouchableOpacity>
          </View>

          {localTask.description && <Text style={styles.description}>{localTask.description}</Text>}
        </Card>

        <Text style={styles.sectionTitle}>Informações</Text>
        <Card style={styles.infoCard}>
          <InfoRow icon={typeIcon[localTask.type]} label="Tipo" value={typeLabel[localTask.type]} />

          {localTask.priority && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="flag-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Prioridade</Text>
              <PriorityBadge priority={localTask.priority} />
            </View>
          )}

          {localTask.scheduledDate && (
            <InfoRow
              icon="calendar"
              label="Agendada para"
              value={new Date(localTask.scheduledDate).toLocaleDateString('pt-BR')}
            />
          )}

          {localTask.dueDate && (
            <InfoRow
              icon="calendar-clock"
              label="Data limite"
              value={new Date(localTask.dueDate).toLocaleDateString('pt-BR')}
            />
          )}

          {localTask.recurrenceDays && localTask.recurrenceDays.length > 0 && (
            <InfoRow
              icon="repeat"
              label="Recorrência"
              value={localTask.recurrenceDays.map((d) => recurrenceLabel[d]).join(', ')}
            />
          )}

          <InfoRow
            icon="clock-outline"
            label="Criada em"
            value={new Date(localTask.createdAt).toLocaleDateString('pt-BR')}
          />
        </Card>

        {totalSubtasks > 0 && (
          <>
            <View style={styles.subtaskHeader}>
              <Text style={styles.sectionTitle}>
                Subtarefas ({completedSubtasks}/{totalSubtasks})
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <Card style={styles.subtasksCard}>
              {localTask.subtasks?.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.subtaskRow}
                  onPress={() => handleToggleSubtask(sub.id, !sub.completed)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={sub.completed ? 'check-circle' : 'circle-outline'}
                    size={22}
                    color={sub.completed ? colors.success : colors.textDisabled}
                  />
                  <Text style={[styles.subtaskTitle, sub.completed && styles.subtaskCompleted]}>
                    {sub.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          </>
        )}

        <Button
          label={localTask.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
          onPress={handleToggleComplete}
          variant={localTask.completed ? 'secondary' : 'primary'}
          fullWidth
          style={styles.actionButton}
        />

        <Button
          label="Excluir tarefa"
          onPress={handleDelete}
          variant="danger"
          fullWidth
          style={styles.actionButton}
        />
      </ScrollView>
    </View>
  );
}

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={18} color={colors.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  mainCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 22,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  infoCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radius.full,
  },
  subtasksCard: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  subtaskTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  subtaskCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },

  actionButton: {
    marginBottom: spacing.sm,
  },
});
