import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { DatePicker } from '@/components/DatePicker';
import type { FocusSession, FocusTheme } from '@/types/focus.types';
import { localDateStr, dateOf, localMinutesSinceMidnight } from '@/utils/date';

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

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

function formatDateLabel(dateStr: string): string {
  const today = localDateStr();
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = localDateStr(yd);

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

  const daySessions = sessions.filter((s) => dateOf(s.startTime) === selectedDate);
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
              const startMin = localMinutesSinceMidnight(session.startTime);
              const endMin = localMinutesSinceMidnight(session.endTime);
              const adjustedEnd = endMin < startMin ? endMin + 24 * 60 : endMin;
              const clampedStart = Math.max(startMin, HOUR_START * 60);
              const clampedEnd = Math.min(adjustedEnd, HOUR_END * 60);
              if (clampedEnd <= clampedStart) return null;
              const leftPct = (clampedStart - HOUR_START * 60) / totalMinutes;
              const widthPct = (clampedEnd - clampedStart) / totalMinutes;
              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionBlock,
                    {
                      left: `${leftPct * 100}%`,
                      width: `${widthPct * 100}%`,
                      backgroundColor: getThemeColor(session.themeId, themes),
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.labelsRow}>
            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
              <View key={HOUR_START + i} style={styles.labelSlot}>
                <Text style={styles.hourLabel}>{formatHour(HOUR_START + i)}</Text>
              </View>
            ))}
            <Text style={styles.hourLabelEnd}>{formatHour(HOUR_END)}</Text>
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
              <Text style={styles.legendText} numberOfLines={1} ellipsizeMode="tail">
                {t.name}
              </Text>
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
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  labelSlot: {
    flex: 1,
    alignItems: 'flex-start',
  },
  hourLabel: {
    fontSize: 9,
    color: colors.textDisabled,
    lineHeight: 12,
  },
  hourLabelEnd: {
    fontSize: 9,
    color: colors.textDisabled,
    lineHeight: 12,
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
    maxWidth: 170,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendText: {
    ...typography.xs,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  emptyText: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
