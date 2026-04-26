import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radius, typography } from '@/styles/theme';
import type { FocusSession } from '@/types/focus.types';

interface TimelineBarProps {
  sessions: FocusSession[];
  date: string;
}

const HOUR_START = 6;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function getMinutesFromMidnight(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

export function TimelineBar({ sessions, date }: TimelineBarProps) {
  const totalMinutes = TOTAL_HOURS * 60;

  const todaySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.startTime).toISOString().split('T')[0];
    return sessionDate === date;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Linha do tempo</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.timeline}>
          <View style={styles.track}>
            {todaySessions.map((session) => {
              const startMin = getMinutesFromMidnight(session.startTime);
              const endMin = getMinutesFromMidnight(session.endTime);

              const clampedStart = Math.max(startMin, HOUR_START * 60);
              const clampedEnd = Math.min(endMin, HOUR_END * 60);

              if (clampedEnd <= clampedStart) return null;

              const leftPercent = (clampedStart - HOUR_START * 60) / totalMinutes;
              const widthPercent = (clampedEnd - clampedStart) / totalMinutes;

              return (
                <View
                  key={session.id}
                  style={[
                    styles.sessionBlock,
                    {
                      left: `${leftPercent * 100}%`,
                      width: `${widthPercent * 100}%`,
                      backgroundColor: session.isManual ? colors.peach : colors.sky,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Labels de hora */}
          <View style={styles.labels}>
            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
              const hour = HOUR_START + i;
              const leftPercent = i / TOTAL_HOURS;
              return (
                <Text key={hour} style={[styles.hourLabel, { left: `${leftPercent * 100}%` }]}>
                  {formatHour(hour)}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.sky }]} />
          <Text style={styles.legendText}>Automático</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.peach }]} />
          <Text style={styles.legendText}>Manual</Text>
        </View>
      </View>

      {todaySessions.length === 0 && (
        <Text style={styles.emptyText}>Nenhuma sessão registrada hoje</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timeline: {
    width: 700,
    paddingBottom: spacing.lg,
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
    borderRadius: radius.xl ?? 4,
    opacity: 0.85,
  },
  labels: {
    position: 'relative',
    height: 20,
    marginTop: spacing.xs,
  },
  hourLabel: {
    position: 'absolute',
    ...typography.xs,
    color: colors.textDisabled,
    transform: [{ translateX: -12 }],
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
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
