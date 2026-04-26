import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusStore } from '@/store/focusStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';

interface ManualRegisterScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

function timeStringToDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function diffInMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

export function ManualRegisterScreen({ onBack, onSuccess }: ManualRegisterScreenProps) {
  const { addSession, themes } = useFocusStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string | undefined>(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!date) {
      Alert.alert('Atenção', 'Selecione uma data.');
      return;
    }

    const start = timeStringToDate(date, startTime);
    const end = timeStringToDate(date, endTime);
    const duration = diffInMinutes(start, end);

    if (duration <= 0) {
      Alert.alert('Atenção', 'O horário de término deve ser após o início.');
      return;
    }

    if (duration > 480) {
      Alert.alert('Atenção', 'A sessão não pode ser maior que 8 horas.');
      return;
    }

    setLoading(true);
    try {
      const theme = themes.find((t) => t.id === selectedThemeId);
      await addSession({
        themeId: theme?.id,
        themeName: theme?.name,
        mode: 'free',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        isManual: true,
      });
      onSuccess();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o registro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={globalStyles.screen}>
      <Header title="Registro manual" onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Data */}
        <DatePicker label="Data" value={date} onChange={setDate} placeholder="Selecionar data" />

        <Text style={styles.label}>Horário de início</Text>
        <View style={styles.timeRow}>
          {[
            '06:00',
            '07:00',
            '08:00',
            '09:00',
            '10:00',
            '12:00',
            '14:00',
            '16:00',
            '18:00',
            '20:00',
            '22:00',
          ].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, startTime === t && styles.timeChipActive]}
              onPress={() => setStartTime(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timeChipLabel, startTime === t && styles.timeChipLabelActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Horário de término</Text>
        <View style={styles.timeRow}>
          {[
            '07:00',
            '08:00',
            '09:00',
            '10:00',
            '11:00',
            '13:00',
            '15:00',
            '17:00',
            '19:00',
            '21:00',
            '23:00',
          ].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.timeChip, endTime === t && styles.timeChipActive]}
              onPress={() => setEndTime(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timeChipLabel, endTime === t && styles.timeChipLabelActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {date && startTime && endTime && (
          <View style={styles.durationBadge}>
            <MaterialCommunityIcons name="timer-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.durationText}>
              {(() => {
                const d = diffInMinutes(
                  timeStringToDate(date, startTime),
                  timeStringToDate(date, endTime),
                );
                if (d <= 0) return 'Horário inválido';
                if (d < 60) return `${d} minutos`;
                const h = Math.floor(d / 60);
                const m = d % 60;
                return m > 0 ? `${h}h ${m}min` : `${h}h`;
              })()}
            </Text>
          </View>
        )}

        {themes.length > 0 && (
          <>
            <Text style={styles.label}>Tema (opcional)</Text>
            <View style={styles.themesRow}>
              <TouchableOpacity
                style={[styles.themeChip, !selectedThemeId && styles.themeChipActive]}
                onPress={() => setSelectedThemeId(undefined)}
                activeOpacity={0.7}
              >
                <Text style={[styles.themeLabel, !selectedThemeId && styles.themeLabelActive]}>
                  Geral
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

        <Button
          label="Salvar registro"
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
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  timeChipLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  timeChipLabelActive: {
    color: colors.textOnPrimary,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  durationText: {
    ...typography.label,
    color: colors.primaryDark,
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
  saveButton: {
    marginTop: spacing.xl,
  },
});
