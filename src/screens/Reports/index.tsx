import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/BarChart';
import { ProgressRing } from '@/components/ProgressRing';
import { getWeeklySummary, getMonthlySummary } from '@/services/reports.service';

type Period = 'week' | 'month';

interface ReportsScreenProps {
  onBack: () => void;
}

function formatHours(h: number): string {
  if (h === 0) return '0h';
  if (h < 1) return `${Math.round(h * 60)}min`;
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return min > 0 ? `${hrs}h ${min}min` : `${hrs}h`;
}

export function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [period, setPeriod] = useState<Period>('week');

  const { sessions, themes, fetchSessions, fetchThemes } = useFocusStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { goals, fetchGoals } = useGoalStore();

  useEffect(() => {
    fetchSessions();
    fetchThemes();
    fetchTasks();
    fetchGoals();
  }, []);

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weekly = getWeeklySummary(sessions, tasks);
  const monthly = getMonthlySummary(sessions, tasks, goals, themes);

  const monthName = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={globalStyles.screen}>
      <Header title="Relatórios" onBack={onBack} />

      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodBtn, period === 'week' && styles.periodBtnActive]}
          onPress={() => setPeriod('week')}
          activeOpacity={0.7}
        >
          <Text style={[styles.periodLabel, period === 'week' && styles.periodLabelActive]}>
            Esta semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodBtn, period === 'month' && styles.periodBtnActive]}
          onPress={() => setPeriod('month')}
          activeOpacity={0.7}
        >
          <Text style={[styles.periodLabel, period === 'month' && styles.periodLabelActive]}>
            Este mês
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {period === 'week' && (
          <>
            <View style={styles.summaryRow}>
              <SummaryCard
                icon="timer-outline"
                label="Foco total"
                value={formatHours(weekly.totalHours)}
                color={colors.sky}
              />
              <SummaryCard
                icon="check-circle-outline"
                label="Tarefas"
                value={String(weekly.totalTasks)}
                color={colors.mint}
              />
              <SummaryCard
                icon="fire"
                label="Streak"
                value={`${weekly.streak}d`}
                color={colors.peach}
              />
            </View>

            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Horas de foco por dia</Text>
                {weekly.totalHours > 0 && (
                  <Text style={styles.chartSub}>Melhor: {weekly.bestFocusDay}</Text>
                )}
              </View>
              <BarChart
                data={weekly.focusDays.map((d) => ({
                  label: d.label,
                  value: d.value,
                }))}
                unit="h"
                barColor={colors.sky}
                highlight={todayIndex}
                height={120}
              />
            </Card>

            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Tarefas concluídas por dia</Text>
              <BarChart
                data={weekly.taskDays.map((d) => ({
                  label: d.label,
                  value: d.value,
                }))}
                unit=""
                barColor={colors.mint}
                highlight={todayIndex}
                height={100}
              />
            </Card>

            {weekly.totalHours > 0 && (
              <Card style={styles.infoCard}>
                <MaterialCommunityIcons name="trending-up" size={20} color={colors.primary} />
                <View>
                  <Text style={styles.infoTitle}>{formatHours(weekly.totalHours / 7)} por dia</Text>
                  <Text style={styles.infoSub}>média de foco diário esta semana</Text>
                </View>
              </Card>
            )}
          </>
        )}

        {period === 'month' && (
          <>
            <Text style={styles.monthLabel}>{monthName}</Text>

            <View style={styles.summaryRow}>
              <SummaryCard
                icon="timer-outline"
                label="Foco"
                value={formatHours(monthly.totalHours)}
                color={colors.sky}
              />
              <SummaryCard
                icon="check-circle-outline"
                label="Tarefas"
                value={String(monthly.totalTasks)}
                color={colors.mint}
              />
              <SummaryCard
                icon="refresh"
                label="Sessões"
                value={String(monthly.totalSessions)}
                color={colors.rose}
              />
            </View>

            <Card style={styles.infoCard}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
              <View>
                <Text style={styles.infoTitle}>{formatHours(monthly.avgDailyHours)} por dia</Text>
                <Text style={styles.infoSub}>média de foco diário este mês</Text>
              </View>
            </Card>

            {monthly.focusByTheme.length > 0 && (
              <Card style={styles.chartCard}>
                <Text style={styles.chartTitle}>Foco por tema</Text>
                {monthly.focusByTheme.map((theme, i) => {
                  const maxMinutes = monthly.focusByTheme[0].minutes;
                  const ratio = maxMinutes > 0 ? theme.minutes / maxMinutes : 0;
                  return (
                    <View key={i} style={styles.themeRow}>
                      <View style={[styles.themeDot, { backgroundColor: theme.color }]} />
                      <Text style={styles.themeName} numberOfLines={1}>
                        {theme.name}
                      </Text>
                      <View style={styles.themeBarTrack}>
                        <View
                          style={[
                            styles.themeBarFill,
                            { width: `${ratio * 100}%`, backgroundColor: theme.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.themeValue}>{formatHours(theme.minutes / 60)}</Text>
                    </View>
                  );
                })}
              </Card>
            )}

            {monthly.goalsSummary.length > 0 && (
              <Card style={styles.chartCard}>
                <Text style={styles.chartTitle}>Metas ativas</Text>
                <View style={styles.goalsGrid}>
                  {monthly.goalsSummary.map((g, i) => (
                    <View key={i} style={styles.goalItem}>
                      <ProgressRing progress={g.progress} size={56} color={g.color} />
                      <Text style={styles.goalName} numberOfLines={2}>
                        {g.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {monthly.totalHours === 0 && monthly.totalTasks === 0 && (
              <Card style={styles.emptyCard}>
                <MaterialCommunityIcons name="chart-bar" size={48} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>Nenhum dado este mês</Text>
                <Text style={styles.emptySub}>
                  Comece a estudar e concluir tarefas para ver seus relatórios!
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface SummaryCardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text
        style={styles.summaryValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  periodLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  periodLabelActive: {
    color: colors.textOnPrimary,
  },

  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  monthLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.textPrimary,
    width: '100%',
    textAlign: 'center',
    flex: 1,
  },
  summaryLabel: {
    ...typography.xs,
    color: colors.textSecondary,
  },

  chartCard: {
    gap: spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chartSub: {
    ...typography.xs,
    color: colors.primaryDark,
    fontWeight: '600',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '44',
  },
  infoTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  infoSub: {
    ...typography.xs,
    color: colors.textSecondary,
  },

  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  themeDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  themeName: {
    ...typography.sm,
    color: colors.textSecondary,
    width: 80,
  },
  themeBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  themeBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  themeValue: {
    ...typography.xs,
    color: colors.textPrimary,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },

  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  goalItem: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 72,
  },
  goalName: {
    ...typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  emptySub: {
    ...typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 20,
  },
});
