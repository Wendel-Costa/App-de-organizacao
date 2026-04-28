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
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';

const COLORS = [
  '#F5C518',
  '#5DB88A',
  '#5B9BD5',
  '#FF6B6B',
  '#FFB347',
  '#9B7DD4',
  '#4ECDC4',
  '#F9B8C4',
];

interface CreateGoalScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateGoalScreen({ onBack, onSuccess }: CreateGoalScreenProps) {
  const { addGoal } = useGoalStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<string | undefined>(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState<string | undefined>();
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Atenção', 'O título da meta é obrigatório.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Atenção', 'Informe as datas de início e término.');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Atenção', 'A data de término deve ser após o início.');
      return;
    }

    setLoading(true);
    try {
      await addGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        color,
      });
      onSuccess();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a meta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Nova meta" onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Aprender matemática"
          placeholderTextColor={colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
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

        <DatePicker
          label="Data de início *"
          value={startDate}
          onChange={setStartDate}
          placeholder="Selecionar data"
        />

        <DatePicker
          label="Data de término *"
          value={endDate}
          onChange={setEndDate}
          placeholder="Selecionar data"
          minimumDate={startDate ? new Date(startDate + 'T12:00:00') : new Date()}
        />

        <Text style={styles.label}>Cor de destaque</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
              onPress={() => setColor(c)}
              activeOpacity={0.8}
            />
          ))}
        </View>

        <Button
          label="Criar meta"
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
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.textPrimary,
    transform: [{ scale: 1.15 }],
  },
  saveButton: {
    marginTop: spacing.xl,
  },
});
