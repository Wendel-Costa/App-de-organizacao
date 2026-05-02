import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { DatePicker } from '@/components/DatePicker';
import type { FocusSession, FocusTheme } from '@/types/focus.types';

interface TimelineBarProps {
  sessions: FocusSession[];
  themes: FocusTheme[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const HOUR_START = 6;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;

const THEME_PALETTE = [
  '#5B9BD5',
  '#5DB88A',
  '#FFB347',
  '#F9B8C4',
  '#9B7DD4',
  '#F5C518',
  '#E05252',
  '#4ECDC4',
];

const GENERAL_COLOR = '#C8C8B8';

function getThemeColor(themeId: string | undefined, themes: FocusTheme[]): string {
  if (!themeId) return GENERAL_COLOR;
  const index = themes.findIndex((t) => t.id === themeId);
  return index >= 0 ? THEME_PALETTE[index % THEME_PALETTE.length] : GENERAL_COLOR;
}

function getMinutesFromMidnight(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';

  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function TimelineBar({ sessions, themes, selectedDate, onDateChange }: TimelineBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const totalMinutes = TOTAL_HOURS * 60;

  const daySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime).toISOString().split('T')[0];
    return sessionDate === selectedDate;
  });

  const activeThemes = themes.filter((t) => daySessions.some((s) => s.themeId === t.id));
  const hasGeneral = daySessions.some((s) => !s.themeId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Linha do tempo</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DatePicker
          value={selectedDate}
          autoOpen
          onChange={(d) => {
            if (d) onDateChange(d);
            setShowDatePicker(false);
          }}
        />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.timeline}>
          <View style={styles.track}>
            {daySessions.map((session) => {
              const startMin = getMinutesFromMidnight(session.startTime);
              const endMin = getMinutesFromMidnight(session.endTime);

              const clampedStart = Math.max(startMin, HOUR_START * 60);
              const clampedEnd = Math.min(endMin, HOUR_END * 60);

              if (clampedEnd <= clampedStart) return null;

              const leftPercent = (clampedStart - HOUR_START * 60) / totalMinutes;
              const widthPercent = (clampedEnd - clampedStart) / totalMinutes;
              const color = getThemeColor(session.themeId, themes);

              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionBlock,
                    {
                      left: `${leftPercent * 100}%`,
                      width: `${widthPercent * 100}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.labelsRow}>
            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
              const hour = HOUR_START + i;
              return (
                <Text
                  key={hour}
                  style={[
                    styles.hourLabel,
                    i === 0 && styles.hourLabelFirst,
                    i === TOTAL_HOURS && styles.hourLabelLast,
                  ]}
                >
                  {formatHour(hour)}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {daySessions.length > 0 && (
        <View style={styles.legend}>
          {hasGeneral && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GENERAL_COLOR }]} />
              <Text style={styles.legendText}>Geral</Text>
            </View>
          )}
          {activeThemes.map((t, i) => (
            <View key={t.id} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: THEME_PALETTE[i % THEME_PALETTE.length] },
                ]}
              />
              <Text style={styles.legendText}>{t.name}</Text>
            </View>
          ))}
        </View>
      )}

      {daySessions.length === 0 && <Text style={styles.emptyText}>Nenhuma sessão neste dia</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  dateLabel: {
    ...typography.label,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  hiddenPicker: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
  },
  timeline: {
    width: 720,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  track: {
    height: 28,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  sessionBlock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
    opacity: 0.85,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  hourLabel: {
    ...typography.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    width: 32,
    transform: [{ translateX: -8 }],
  },
  hourLabelFirst: {
    transform: [{ translateX: 0 }],
  },
  hourLabelLast: {
    transform: [{ translateX: -24 }],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendText: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
