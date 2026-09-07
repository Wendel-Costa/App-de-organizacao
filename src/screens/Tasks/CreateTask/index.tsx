import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { useFocusStore } from '@/store/focusStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import type { Task, TaskType, ScoreLevel, RecurrenceDay, SubTask } from '@/types/task.types';
import { useGamificationStore } from '@/store/gamificationStore';

type RecurrenceMode = 'weekdays' | 'interval';

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

const SCORE_LEVELS: ScoreLevel[] = [1, 2, 3];

interface CreateTaskScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  initialTask?: Task;
}

export function CreateTaskScreen({ onBack, onSuccess, initialTask }: CreateTaskScreenProps) {
  const isEditing = !!initialTask;
  const { addTask, editTask } = useTaskStore();
  const { themes } = useFocusStore();
  const { config } = useGamificationStore();
  useEffect(() => {
    void useGamificationStore.getState().fetch();
  }, []);

  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [type, setType] = useState<TaskType>(initialTask?.type ?? 'anytime');
  const [scoreLevel, setScoreLevel] = useState<ScoreLevel>(initialTask?.scoreLevel ?? 1);
  const [scheduledDate, setScheduledDate] = useState<string | undefined>(
    initialTask?.scheduledDate,
  );
  const [dueDate, setDueDate] = useState<string | undefined>(initialTask?.dueDate);

  const initialMode: RecurrenceMode = initialTask?.recurrenceDays?.includes('every_x_days')
    ? 'interval'
    : 'weekdays';
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>(initialMode);
  const [recurrenceDays, setRecurrenceDays] = useState<RecurrenceDay[]>(
    initialTask?.recurrenceDays?.includes('every_x_days')
      ? []
      : (initialTask?.recurrenceDays ?? []),
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    initialTask?.recurrenceInterval ?? 2,
  );

  const [subtasks, setSubtasks] = useState<Omit<SubTask, 'id'>[]>(
    initialTask?.subtasks?.map((s) => ({
      title: s.title,
      completed: s.completed,
    })) ?? [],
  );
  const [newSubtask, setNewSubtask] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>(initialTask?.themeId);
  const [loading, setLoading] = useState(false);

  const subtaskInputRef = useRef<TextInput>(null);
  const longPressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startContinuous(action: () => void) {
    longPressRef.current = setInterval(action, 150);
  }
  function stopContinuous() {
    if (longPressRef.current) {
      clearInterval(longPressRef.current);
      longPressRef.current = null;
    }
  }
  useEffect(() => () => stopContinuous(), []);

  function hasUnsavedChanges() {
    if (isEditing) return false;
    return title.trim().length > 0 || description.trim().length > 0 || subtasks.length > 0;
  }

  function handleBack() {
    if (hasUnsavedChanges()) {
      Alert.alert('Descartar tarefa?', 'Você tem informações não salvas. Deseja voltar?', [
        {
          text: 'Continuar',
          style: 'cancel',
        },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: onBack,
        },
      ]);
    } else {
      onBack();
    }
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [title, description, subtasks]);

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
    if (!newSubtask.trim()) {
      subtaskInputRef.current?.focus();
      return;
    }
    setSubtasks((prev) => [
      ...prev,
      {
        title: newSubtask.trim(),
        completed: false,
      },
    ]);
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
    if (newSubtask.trim()) {
      Alert.alert(
        'Subtarefa pendente',
        'Existe uma subtarefa digitada que ainda não foi adicionada. Clique no botão "+" para adicioná-la antes de salvar.',
      );

      subtaskInputRef.current?.focus();
      return;
    }
    if (type === 'scheduled' && !scheduledDate) {
      Alert.alert('Atenção', 'Informe a data agendada para essa tarefa.');
      return;
    }
    if (type === 'recurring') {
      if (recurrenceMode === 'weekdays' && recurrenceDays.length === 0) {
        Alert.alert('Atenção', 'Selecione pelo menos um dia de recorrência.');
        return;
      }
      if (recurrenceMode === 'interval' && recurrenceInterval < 1) {
        Alert.alert('Atenção', 'O intervalo deve ser de pelo menos 1 dia.');
        return;
      }
    }

    setLoading(true);
    try {
      const finalRecurrenceDays: RecurrenceDay[] | undefined =
        type === 'recurring'
          ? recurrenceMode === 'interval'
            ? ['every_x_days']
            : recurrenceDays
          : undefined;

      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        scoreLevel,
        completed: initialTask?.completed ?? false,
        scheduledDate: type === 'scheduled' ? scheduledDate : undefined,
        dueDate,
        recurrenceDays: finalRecurrenceDays,
        recurrenceInterval:
          type === 'recurring' && recurrenceMode === 'interval' ? recurrenceInterval : undefined,
        subtasks: subtasks.map((s, i) => ({
          ...s,
          id: String(i),
        })),
        themeId: selectedThemeId,
      };

      if (isEditing && initialTask) {
        await editTask(initialTask.id, data);
      } else {
        await addTask(data);
      }
      onSuccess();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a tarefa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title={isEditing ? 'Editar tarefa' : 'Nova tarefa'} onBack={handleBack} />

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
              {
                key: 'anytime',
                label: 'Livre',
                icon: 'infinity',
              },
              {
                key: 'scheduled',
                label: 'Agendada',
                icon: 'calendar',
              },
              {
                key: 'recurring',
                label: 'Recorrente',
                icon: 'repeat',
              },
            ] as {
              key: TaskType;
              label: string;
              icon: string;
            }[]
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
            <Text style={styles.label}>Modo de recorrência</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, recurrenceMode === 'weekdays' && styles.modeChipActive]}
                onPress={() => setRecurrenceMode('weekdays')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="calendar-week"
                  size={15}
                  color={
                    recurrenceMode === 'weekdays' ? colors.textOnPrimary : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modeChipLabel,
                    recurrenceMode === 'weekdays' && styles.modeChipLabelActive,
                  ]}
                >
                  Dias da semana
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, recurrenceMode === 'interval' && styles.modeChipActive]}
                onPress={() => setRecurrenceMode('interval')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="calendar-refresh"
                  size={15}
                  color={
                    recurrenceMode === 'interval' ? colors.textOnPrimary : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modeChipLabel,
                    recurrenceMode === 'interval' && styles.modeChipLabelActive,
                  ]}
                >
                  A cada X dias
                </Text>
              </TouchableOpacity>
            </View>

            {recurrenceMode === 'weekdays' && (
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

            {recurrenceMode === 'interval' && (
              <>
                <Text style={styles.label}>Repetir a cada quantos dias? *</Text>
                <Text style={styles.intervalHint}>
                  A tarefa voltará automaticamente após esse número de dias da última conclusão.
                </Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setRecurrenceInterval((p) => Math.max(1, p - 1))}
                    onLongPress={() =>
                      startContinuous(() => setRecurrenceInterval((p) => Math.max(1, p - 1)))
                    }
                    onPressOut={stopContinuous}
                    delayLongPress={300}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.counterValueWrapper}>
                    <Text style={styles.counterValue}>{recurrenceInterval}</Text>
                    <Text style={styles.counterUnit}>
                      {recurrenceInterval === 1 ? 'dia' : 'dias'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setRecurrenceInterval((p) => p + 1)}
                    onLongPress={() => startContinuous(() => setRecurrenceInterval((p) => p + 1))}
                    onPressOut={stopContinuous}
                    delayLongPress={300}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.presetsRow}>
                  {[2, 3, 7, 14, 30].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.presetChip,
                        recurrenceInterval === n && styles.presetChipActive,
                      ]}
                      onPress={() => setRecurrenceInterval(n)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetLabel,
                          recurrenceInterval === n && styles.presetLabelActive,
                        ]}
                      >
                        {n === 7 ? '1 sem' : n === 14 ? '2 sem' : n === 30 ? '1 mês' : `${n}d`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <Text style={styles.label}>Pontuação da tarefa</Text>

        <View style={styles.scoreRow}>
          {SCORE_LEVELS.map((level) => {
            const points =
              level === 1
                ? config.taskLevel1Points
                : level === 2
                  ? config.taskLevel2Points
                  : config.taskLevel3Points;

            const selected = scoreLevel === level;

            return (
              <TouchableOpacity
                key={level}
                style={[styles.scoreChip, selected && styles.scoreChipActive]}
                onPress={() => setScoreLevel(level)}
                activeOpacity={0.7}
              >
                <Text style={[styles.scoreLabel, selected && styles.scoreLabelActive]}>
                  Nível {level} · {points} pts
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.md }}>
          <DatePicker
            label="Data limite (opcional)"
            value={dueDate}
            onChange={setDueDate}
            placeholder="Selecionar data limite"
            minimumDate={
              type === 'scheduled' && scheduledDate
                ? new Date(`${scheduledDate}T12:00:00`)
                : new Date()
            }
          />
        </View>

        {themes.length > 0 && (
          <>
            <Text style={styles.label}>Tema de foco (opcional)</Text>
            <View style={styles.themesRow}>
              <TouchableOpacity
                style={[styles.themeChip, !selectedThemeId && styles.themeChipActive]}
                onPress={() => setSelectedThemeId(undefined)}
                activeOpacity={0.7}
              >
                <Text style={[styles.themeLabel, !selectedThemeId && styles.themeLabelActive]}>
                  Nenhum
                </Text>
              </TouchableOpacity>
              {themes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.themeChip, selectedThemeId === t.id && styles.themeChipActive]}
                  onPress={() => setSelectedThemeId(t.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.themeLabel, selectedThemeId === t.id && styles.themeLabelActive]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Subtarefas</Text>

        <View style={styles.subtaskInput}>
          <TextInput
            ref={subtaskInputRef}
            style={styles.subtaskTextInput}
            placeholder="Adicionar subtarefa..."
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
            <MaterialCommunityIcons
              name="plus"
              size={22}
              color={newSubtask.trim() ? colors.primaryDark : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {subtasks.map((sub, index) => (
          <View key={index} style={styles.subtaskItem}>
            <MaterialCommunityIcons name="circle-outline" size={18} color={colors.textDisabled} />
            <Text style={styles.subtaskTitle}>{sub.title}</Text>
            <TouchableOpacity
              onPress={() => removeSubtask(index)}
              hitSlop={{
                top: 8,
                right: 8,
                bottom: 8,
                left: 8,
              }}
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
        ))}

        <Button
          label={isEditing ? 'Salvar alterações' : 'Salvar tarefa'}
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

  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  modeChipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modeChipLabelActive: {
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

  intervalHint: {
    ...typography.xs,
    color: colors.textDisabled,
    marginBottom: spacing.sm,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueWrapper: {
    alignItems: 'center',
    minWidth: 64,
  },
  counterValue: {
    fontSize: 40,
    fontWeight: '200',
    color: colors.textPrimary,
    lineHeight: 46,
  },
  counterUnit: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  presetLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  presetLabelActive: {
    color: colors.textOnPrimary,
  },

  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  scoreChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },

  scoreChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },

  scoreLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  scoreLabelActive: {
    color: colors.textOnPrimary,
  },
  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
    marginTop: spacing.xs,
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
