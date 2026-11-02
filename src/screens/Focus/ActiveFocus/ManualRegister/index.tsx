import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusStore } from '@/store/focusStore';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import { dateOf, localDateStr } from '@/utils/date';

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
  const addSession = useFocusStore((state) => state.addSession);
  const themes = useFocusStore((state) => state.themes);
  const sessions = useFocusStore((state) => state.sessions);
  const geralThemeHidden = useFocusStore((state) => state.geralThemeHidden);
  const fetchThemes = useFocusStore((state) => state.fetchThemes);
  const fetchGeralThemeVisibility = useFocusStore((state) => state.fetchGeralThemeVisibility);
  const [themeSettingsLoaded, setThemeSettingsLoaded] = useState(false);
  const [themesLoadError, setThemesLoadError] = useState(false);

  const todayStr = localDateStr();

  const [date, setDate] = useState<string | undefined>(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([fetchThemes(), fetchGeralThemeVisibility()])
      .then((results) => {
        if (mounted) setThemesLoadError(results[0].status === 'rejected');
      })
      .finally(() => {
        if (mounted) setThemeSettingsLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [fetchThemes, fetchGeralThemeVisibility]);

  async function handleSave() {
    if (!date) {
      Alert.alert('Atenção', 'Selecione uma data.');
      return;
    }

    const start = timeStringToDate(date, startTime);
    const end = timeStringToDate(date, endTime);
    const duration = diffInMinutes(start, end);

    const hasConflict = sessions.some((session) => {
      const sessionStart = new Date(session.startTime);
      const sessionEnd = new Date(session.endTime);

      const sameDay = dateOf(session.startTime) === date;

      if (!sameDay) return false;

      return start < sessionEnd && end > sessionStart;
    });

    if (hasConflict) {
      Alert.alert(
        'Conflito de horário',
        'Já existe uma sessão registrada nesse horário neste dia.',
      );
      return;
    }

    if (duration <= 0) {
      Alert.alert('Atenção', 'O horário de término deve ser após o início.');
      return;
    }

    if (duration > 720) {
      Alert.alert(
        'Atenção',
        'A sessão não pode ser maior que 12 horas, tente estudar durante um período humanamente aceitável',
      );
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

  const duration = date
    ? diffInMinutes(timeStringToDate(date, startTime), timeStringToDate(date, endTime))
    : 0;

  return (
    <View style={globalStyles.screen}>
      <Header title="Registro manual" onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DatePicker label="Data" value={date} onChange={setDate} placeholder="Selecionar data" />

        <View style={styles.timeRow}>
          <View style={styles.timeFlex}>
            <TimePicker label="Início" value={startTime} onChange={setStartTime} />
          </View>
          <View style={styles.timeSeparator}>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textDisabled} />
          </View>
          <View style={styles.timeFlex}>
            <TimePicker label="Término" value={endTime} onChange={setEndTime} />
          </View>
        </View>

        {duration > 0 ? (
          <View style={styles.durationBadge}>
            <MaterialCommunityIcons name="timer-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.durationText}>
              {duration < 60
                ? `${duration} minutos`
                : `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`}
            </Text>
          </View>
        ) : date ? (
          <View style={styles.durationBadge}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.durationText, { color: colors.error }]}>Horário inválido</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Tema (opcional)</Text>
        <View style={styles.themesRow}>
          {themeSettingsLoaded && !geralThemeHidden && (
            <TouchableOpacity
              style={[styles.themeChip, !selectedThemeId && styles.themeChipActive]}
              onPress={() => setSelectedThemeId(undefined)}
              activeOpacity={0.7}
            >
              <Text style={[styles.themeLabel, !selectedThemeId && styles.themeLabelActive]}>
                Geral
              </Text>
            </TouchableOpacity>
          )}
          {themes.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[styles.themeChip, selectedThemeId === theme.id && styles.themeChipActive]}
              onPress={() => setSelectedThemeId(theme.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.themeLabel, selectedThemeId === theme.id && styles.themeLabelActive]}
              >
                {theme.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {themeSettingsLoaded && themes.length === 0 && (
          <Text style={styles.emptyThemesText}>
            {themesLoadError
              ? 'Não foi possível carregar os temas de foco.'
              : 'Nenhum tema de foco cadastrado.'}
          </Text>
        )}

        <Button
          label="Salvar registro"
          onPress={handleSave}
          fullWidth
          loading={loading}
          disabled={duration <= 0}
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
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  timeFlex: {
    flex: 1,
  },
  timeSeparator: {
    paddingBottom: spacing.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  emptyThemesText: {
    ...typography.xs,
    color: colors.textDisabled,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
