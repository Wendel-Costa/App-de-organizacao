import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SectionList } from 'react-native';
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
import { getAllTaskCompletions } from '@/database/queries/taskHistory.queries';
import type { CompletedTaskRecord } from '@/types/taskHistory.types';

type Period = 'week' | 'month' | 'history';
type HistoryFilter = 'all' | 'recurring' | 'every_x_days';

interface ReportsScreenProps {
  onBack: () => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'recurring', label: 'Recorrentes' },
  { key: 'every_x_days', label: 'A cada X dias' },
];

function formatHours(h: number): string {
  if (h === 0) return '0h';
  if (h < 1) return `${Math.round(h * 60)}min`;
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return min > 0 ? `${hrs}h ${min}min` : `${hrs}h`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dateKey(iso: string): string {
  return iso.split('T')[0];
}

function friendlyDateHeader(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function taskTypeBadge(record: CompletedTaskRecord): { label: string; color: string } {
  const isInterval = record.recurrenceDays?.includes('every_x_days');
  if (isInterval) return { label: 'A cada X dias', color: colors.sky };
  if (record.type === 'recurring') return { label: 'Recorrente', color: colors.mint };
  if (record.type === 'scheduled') return { label: 'Agendada', color: colors.peach };
  return { label: 'Livre', color: colors.textDisabled };
}

function groupByDate(
  records: CompletedTaskRecord[],
): { title: string; data: CompletedTaskRecord[] }[] {
  const map = new Map<string, CompletedTaskRecord[]>();
  for (const r of records) {
    const key = dateKey(r.completedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ title: friendlyDateHeader(date), data }));
}

export function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [completions, setCompletions] = useState<CompletedTaskRecord[]>([]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const { sessions, themes, fetchSessions, fetchThemes } = useFocusStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { goals, fetchGoals } = useGoalStore();

  useEffect(() => {
    fetchSessions();
    fetchThemes();
    fetchTasks();
    fetchGoals();
    getAllTaskCompletions()
      .then(setCompletions)
      .catch(() => {});
  }, []);

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weekly = getWeeklySummary(sessions, tasks);
  const monthly = getMonthlySummary(sessions, tasks, goals, themes, viewYear, viewMonth);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isFirstMonth = viewYear < 2020;

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  const filteredCompletions = completions.filter((r) => {
    if (historyFilter === 'every_x_days') return r.recurrenceDays?.includes('every_x_days');
    if (historyFilter === 'recurring')
      return r.type === 'recurring' && !r.recurrenceDays?.includes('every_x_days');
    return true;
  });

  const grouped = groupByDate(filteredCompletions);

  return (
    <View style={globalStyles.screen}>
      <Header title="Relatórios" onBack={onBack} />

      <View style={styles.periodSelector}>
        {(
          [
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mensal' },
            { key: 'history', label: 'Histórico' },
          ] as { key: Period; label: string }[]
        ).map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'week' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
              data={weekly.focusDays.map((d) => ({ label: d.label, value: d.value }))}
              unit="h"
              barColor={colors.sky}
              highlight={todayIndex}
              height={120}
            />
          </Card>

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Tarefas concluídas por dia</Text>
            <BarChart
              data={weekly.taskDays.map((d) => ({ label: d.label, value: d.value }))}
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
        </ScrollView>
      )}

      {period === 'month' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={goToPrevMonth}
              style={styles.monthNavBtn}
              activeOpacity={0.7}
              disabled={isFirstMonth}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={isFirstMonth ? colors.textDisabled : colors.textPrimary}
              />
            </TouchableOpacity>
            <View style={styles.monthNavCenter}>
              <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]}</Text>
              <Text style={styles.yearLabel}>{viewYear}</Text>
            </View>
            <TouchableOpacity
              onPress={goToNextMonth}
              style={styles.monthNavBtn}
              activeOpacity={0.7}
              disabled={isCurrentMonth}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={isCurrentMonth ? colors.textDisabled : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

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
              <Text style={styles.infoSub}>média de foco diário</Text>
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
              <Text style={styles.chartTitle}>Metas ativas no período</Text>
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
              <Text style={styles.emptyTitle}>Nenhum dado neste mês</Text>
              <Text style={styles.emptySub}>
                {isCurrentMonth
                  ? 'Comece a estudar e concluir tarefas para ver seus relatórios!'
                  : 'Não há dados registrados para este mês.'}
              </Text>
            </Card>
          )}
        </ScrollView>
      )}

      {period === 'history' && (
        <View style={styles.historyContainer}>
          <View style={styles.historyFilters}>
            {HISTORY_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, historyFilter === f.key && styles.filterChipActive]}
                onPress={() => setHistoryFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    historyFilter === f.key && styles.filterChipLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.historyCount}>
              {filteredCompletions.length}{' '}
              {filteredCompletions.length === 1 ? 'registro' : 'registros'}
            </Text>
          </View>

          {filteredCompletions.length === 0 ? (
            <View style={styles.historyEmpty}>
              <MaterialCommunityIcons name="history" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
              <Text style={styles.emptySub}>
                As tarefas recorrentes que você concluir aparecerão aqui com data e hora.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={grouped}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <Text style={styles.historyDateHeader}>{section.title}</Text>
              )}
              renderItem={({ item: record }) => {
                const badge = taskTypeBadge(record);
                return (
                  <View style={styles.historyItem}>
                    <View style={[styles.historyDot, { backgroundColor: badge.color }]} />
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {record.title}
                      </Text>
                      <View style={styles.historyItemMeta}>
                        <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
                          <Text style={[styles.badgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                        <Text style={styles.historyItemTime}>{formatTime(record.completedAt)}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="check-circle" size={18} color={colors.mint} />
                  </View>
                );
              }}
              SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
          )}
        </View>
      )}
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
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  periodLabel: { ...typography.label, color: colors.textSecondary },
  periodLabelActive: { color: colors.textOnPrimary },

  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  monthNavBtn: { padding: spacing.xs },
  monthNavCenter: { alignItems: 'center' },
  monthLabel: { ...typography.h3, color: colors.textPrimary, textTransform: 'capitalize' },
  yearLabel: { ...typography.xs, color: colors.textSecondary, marginTop: 1 },

  summaryRow: { flexDirection: 'row', gap: spacing.sm },
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
  summaryLabel: { ...typography.xs, color: colors.textSecondary },

  chartCard: { gap: spacing.sm },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chartSub: { ...typography.xs, color: colors.primaryDark, fontWeight: '600' },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '44',
  },
  infoTitle: { ...typography.h3, color: colors.textPrimary },
  infoSub: { ...typography.xs, color: colors.textSecondary },

  themeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  themeDot: { width: 10, height: 10, borderRadius: radius.full },
  themeName: { ...typography.sm, color: colors.textSecondary, width: 80 },
  themeBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  themeBarFill: { height: '100%', borderRadius: radius.full },
  themeValue: {
    ...typography.xs,
    color: colors.textPrimary,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  goalItem: { alignItems: 'center', gap: spacing.xs, width: 72 },
  goalName: { ...typography.xs, color: colors.textSecondary, textAlign: 'center', lineHeight: 14 },

  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  historyContainer: { flex: 1 },
  historyFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  filterChipLabel: { ...typography.label, color: colors.textSecondary },
  filterChipLabelActive: { color: colors.textOnPrimary },
  historyCount: { ...typography.xs, color: colors.textDisabled, marginLeft: 'auto' },

  historyList: { padding: spacing.md, paddingBottom: spacing.xxl },
  historyDateHeader: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    letterSpacing: 0.8,
    paddingVertical: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  historyDot: { width: 8, height: 8, borderRadius: radius.full, marginTop: 2 },
  historyItemContent: { flex: 1, gap: 3 },
  historyItemTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  historyItemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { ...typography.xs, fontWeight: '600' },
  historyItemTime: { ...typography.xs, color: colors.textDisabled },
  itemSeparator: { height: 1, backgroundColor: colors.border, marginLeft: 20 },
  historyEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
});
