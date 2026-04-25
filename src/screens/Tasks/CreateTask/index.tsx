import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import type { TaskType, Priority, RecurrenceDay, SubTask } from '@/types/task.types';

const RECURRENCE_DAYS: { key: RecurrenceDay; label: string }[] = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
  { key: 'daily', label: 'Todo dia' },
];

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: 'high', label: 'Alta', color: colors.priorityHigh },
  { key: 'medium', label: 'Média', color: colors.priorityMed },
  { key: 'low', label: 'Baixa', color: colors.priorityLow },
];

interface CreateTaskScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateTaskScreen({ onBack, onSuccess }: CreateTaskScreenProps) {
  const { addTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('anytime');
  const [priority, setPriority] = useState<Priority | undefined>();
  const [scheduledDate, setScheduledDate] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState<string | undefined>();
  const [recurrenceDays, setRecurrenceDays] = useState<RecurrenceDay[]>([]);
  const [subtasks, setSubtasks] = useState<Omit<SubTask, 'id'>[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleRecurrenceDay(day: RecurrenceDay) {
    if (day === 'daily') {
      setRecurrenceDays(['daily']);
      return;
    }
    setRecurrenceDays((prev) => {
      const withoutDaily = prev.filter((d) => d !== 'daily');
      return withoutDaily.includes(day)
        ? withoutDaily.filter((d) => d !== day)
        : [...withoutDaily, day];
    });
  }

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  }

  function removeSubtask(index: number) {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Atenção', 'O título da tarefa é obrigatório.');
      return;
    }
    if (type === 'scheduled' && !scheduledDate) {
      Alert.alert('Atenção', 'Informe a data agendada para essa tarefa.');
      return;
    }
    if (type === 'recurring' && recurrenceDays.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia de recorrência.');
      return;
    }

    setLoading(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        completed: false,
        scheduledDate: type === 'scheduled' ? scheduledDate : undefined,
        dueDate,
        recurrenceDays: type === 'recurring' ? recurrenceDays : undefined,
        subtasks: subtasks.map((s, i) => ({ ...s, id: String(i) })),
      });
      onSuccess();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a tarefa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Nova tarefa" onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Estudar matemática"
          placeholderTextColor={colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Detalhes opcionais..."
          placeholderTextColor={colors.textDisabled}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={300}
        />

        <Text style={styles.label}>Tipo de tarefa</Text>
        <View style={styles.typeRow}>
          {(
            [
              { key: 'anytime', label: 'Livre', icon: 'infinity' },
              { key: 'scheduled', label: 'Agendada', icon: 'calendar' },
              { key: 'recurring', label: 'Recorrente', icon: 'repeat' },
            ] as { key: TaskType; label: string; icon: string }[]
          ).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeChip, type === t.key && styles.typeChipActive]}
              onPress={() => setType(t.key)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={t.icon as any}
                size={16}
                color={type === t.key ? colors.textOnPrimary : colors.textSecondary}
              />
              <Text style={[styles.typeChipLabel, type === t.key && styles.typeChipLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'scheduled' && (
          <DatePicker
            label="Data agendada *"
            value={scheduledDate}
            onChange={setScheduledDate}
            placeholder="Selecionar data"
            minimumDate={new Date()}
          />
        )}

        {type === 'recurring' && (
          <>
            <Text style={styles.label}>Dias de recorrência *</Text>
            <View style={styles.daysRow}>
              {RECURRENCE_DAYS.map((d) => {
                const active = recurrenceDays.includes(d.key);
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => toggleRecurrenceDay(d.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipLabel, active && styles.dayChipLabelActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.priorityChip,
                { borderColor: p.color },
                priority === p.key && { backgroundColor: p.color },
              ]}
              onPress={() => setPriority(priority === p.key ? undefined : p.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.priorityLabel,
                  { color: priority === p.key ? colors.surface : p.color },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <DatePicker
          label="Data limite"
          value={dueDate}
          onChange={setDueDate}
          placeholder="Selecionar data limite (opcional)"
          minimumDate={
            type === 'scheduled' && scheduledDate
              ? new Date(scheduledDate + 'T12:00:00')
              : new Date()
          }
        />

        <Text style={styles.label}>Subtarefas</Text>
        <View style={styles.subtaskInput}>
          <TextInput
            style={styles.subtaskTextInput}
            placeholder="Nova subtarefa..."
            placeholderTextColor={colors.textDisabled}
            value={newSubtask}
            onChangeText={setNewSubtask}
            onSubmitEditing={addSubtask}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={addSubtask}
            style={styles.subtaskAddButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {subtasks.map((sub, index) => (
          <View key={index} style={styles.subtaskItem}>
            <MaterialCommunityIcons name="circle-outline" size={18} color={colors.textDisabled} />
            <Text style={styles.subtaskTitle}>{sub.title}</Text>
            <TouchableOpacity
              onPress={() => removeSubtask(index)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
        ))}

        <Button
          label="Salvar tarefa"
          onPress={handleSave}
          fullWidth
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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

  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  typeChipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  typeChipLabelActive: {
    color: colors.textOnPrimary,
  },

  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dayChipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  dayChipLabelActive: {
    color: colors.textOnPrimary,
  },

  priorityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  priorityLabel: {
    ...typography.label,
  },

  subtaskInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  subtaskTextInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },
  subtaskAddButton: {
    padding: spacing.xs,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  subtaskTitle: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
});
