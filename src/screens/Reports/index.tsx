import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useFocusStore } from '@/store/focusStore';
import { useGoalStore } from '@/store/goalStore';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/BarChart';
import { getWeeklySummary, getMonthlySummary } from '@/services/reports.service';
import { getAllTaskCompletions } from '@/database/queries/taskHistory.queries';
import { getAllGoalTaskCompletions } from '@/database/queries/goals.queries';
import type { CompletedTaskRecord } from '@/types/taskHistory.types';
import type { FocusSession } from '@/types/focus.types';
import type { GoalTaskCompletionHistoryRecord } from '@/database/queries/goals.queries';
import { localDateStr, dateOf } from '@/utils/date';

type Period = 'week' | 'month' | 'history';
type HistoryFilter = 'all' | 'focus' | 'task';
type HistoryView = 'overview' | 'calendar';

interface ReportsScreenProps {
  onBack: () => void;
  onOpenTask?: (record: CompletedTaskRecord) => void;
  isVisible?: boolean;
}

interface CalendarDayStats {
  tasks: number;
  focusMinutes: number;
  goalFactors: number;
}

type OverviewEntry =
  | { id: string; kind: 'task'; timestamp: string; date: string; record: CompletedTaskRecord }
  | { id: string; kind: 'focus'; timestamp: string; date: string; session: FocusSession };

interface SelectedDateData {
  date: string;
  tasks: CompletedTaskRecord[];
  sessions: FocusSession[];
  goalFactors: GoalTaskCompletionHistoryRecord[];
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
const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'focus', label: 'Foco' },
  { key: 'task', label: 'Tarefa' },
];

function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return minutes > 0 ? `${wholeHours}h ${minutes}min` : `${wholeHours}h`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(
    'pt-BR',
    options ?? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' },
  );
}

function friendlyDateHeader(dateString: string): string {
  const today = localDateStr();
  const yesterday = localDateStr(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1, 12),
  );
  if (dateString === today) return 'Hoje';
  if (dateString === yesterday) return 'Ontem';
  return formatDate(dateString, { weekday: 'long', day: '2-digit', month: 'long' });
}

function taskTypeBadge(record: CompletedTaskRecord): { label: string; color: string } {
  if (record.recurrenceDays?.includes('every_x_days') || (record.recurrenceInterval ?? 0) > 0) {
    return { label: 'A cada X dias', color: colors.sky };
  }
  if (record.type === 'recurring') return { label: 'Recorrente', color: colors.mint };
  if (record.type === 'scheduled') return { label: 'Agendada', color: colors.peach };
  return { label: 'Livre', color: colors.textDisabled };
}

function buildCalendarCells(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month, 1, 12).getDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: mondayOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(localDateStr(new Date(year, month, day, 12)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getGoalFactorTime(record: GoalTaskCompletionHistoryRecord): string | null {
  const date = new Date(record.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return formatTime(record.createdAt);
}

export function ReportsScreen({ onBack, onOpenTask, isVisible = true }: ReportsScreenProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historyView, setHistoryView] = useState<HistoryView>('overview');
  const [completions, setCompletions] = useState<CompletedTaskRecord[]>([]);
  const [goalCompletions, setGoalCompletions] = useState<GoalTaskCompletionHistoryRecord[]>([]);
  const [goalHistoryLoaded, setGoalHistoryLoaded] = useState(false);
  const [goalHistoryLoading, setGoalHistoryLoading] = useState(false);
  const goalHistoryRequestRef = useRef(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPreparing, setHistoryPreparing] = useState(false);
  const [groupedOverviewEntries, setGroupedOverviewEntries] = useState<[string, OverviewEntry[]][]>(
    [],
  );
  const [historyEntryCount, setHistoryEntryCount] = useState(0);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [selectedDateData, setSelectedDateData] = useState<SelectedDateData | null>(null);
  const [dayDetailLoading, setDayDetailLoading] = useState(false);
  const [openingTaskId, setOpeningTaskId] = useState<string | null>(null);
  const reportDataRequestRef = useRef(0);
  const preparedOverviewRef = useRef<{
    completions: CompletedTaskRecord[];
    sessions: FocusSession[];
    filter: HistoryFilter;
  } | null>(null);
  const taskOpeningRef = useRef(false);
  const taskOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyBusy =
    period === 'history' &&
    (historyView === 'overview'
      ? historyLoading || historyPreparing
      : historyLoading || (goalHistoryLoading && !selectedHistoryDate));

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const sessions = useFocusStore((state) => state.sessions);
  const themes = useFocusStore((state) => state.themes);
  const fetchSessions = useFocusStore((state) => state.fetchSessions);
  const fetchThemes = useFocusStore((state) => state.fetchThemes);
  const goals = useGoalStore((state) => state.goals);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);

  const loadReportData = useCallback(async () => {
    const requestId = reportDataRequestRef.current + 1;
    reportDataRequestRef.current = requestId;
    setHistoryLoading(true);

    try {
      const results = await Promise.allSettled([
        getAllTaskCompletions(),
        fetchSessions(true),
        fetchThemes(true),
        fetchGoals(true),
      ]);

      if (reportDataRequestRef.current === requestId) {
        const [taskHistoryResult] = results;
        if (taskHistoryResult.status === 'fulfilled') {
          setCompletions(taskHistoryResult.value);
        }

        const failedLoads = results.filter((result) => result.status === 'rejected');
        if (failedLoads.length > 0) {
          console.error(
            '[Reports] Não foi possível carregar todos os dados históricos:',
            failedLoads.map((result) => result.reason),
          );
        }
      }
    } catch (error) {
      if (reportDataRequestRef.current === requestId) {
        console.error('[Reports] Não foi possível carregar os dados históricos:', error);
      }
    } finally {
      if (reportDataRequestRef.current === requestId) {
        setHistoryLoading(false);
      }
    }
  }, [fetchSessions, fetchThemes, fetchGoals]);

  const loadGoalHistory = useCallback(async () => {
    if (goalHistoryLoaded || goalHistoryRequestRef.current) return;

    goalHistoryRequestRef.current = true;
    setGoalHistoryLoading(true);
    try {
      const history = await getAllGoalTaskCompletions();
      setGoalCompletions(history);
      setGoalHistoryLoaded(true);
    } catch (error) {
      console.error('[Reports] Não foi possível carregar o histórico dos fatores de metas:', error);
    } finally {
      goalHistoryRequestRef.current = false;
      setGoalHistoryLoading(false);
    }
  }, [goalHistoryLoaded]);

  useEffect(() => {
    if (!isVisible) {
      reportDataRequestRef.current += 1;
      preparedOverviewRef.current = null;
      setHistoryLoading(false);
      setHistoryPreparing(false);
      return;
    }

    void loadReportData();

    return () => {
      reportDataRequestRef.current += 1;
    };
  }, [isVisible, loadReportData]);

  useEffect(() => {
    if (!isVisible) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (period === 'history' && historyView === 'calendar' && selectedHistoryDate) {
        setSelectedHistoryDate(null);
        setDayDetailLoading(false);
      } else {
        onBack();
      }
      return true;
    });

    return () => subscription.remove();
  }, [historyView, isVisible, onBack, period, selectedHistoryDate]);

  const now = new Date();
  const today = localDateStr();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayIndex = (now.getDay() + 6) % 7;

  const [weekly, setWeekly] = useState<ReturnType<typeof getWeeklySummary> | null>(null);
  const [monthly, setMonthly] = useState<ReturnType<typeof getMonthlySummary> | null>(null);

  useEffect(() => {
    if (period !== 'week') return;
    const timeout = setTimeout(() => {
      setWeekly(getWeeklySummary(sessions, completions, new Date(`${today}T12:00:00`)));
    }, 100);
    return () => clearTimeout(timeout);
  }, [period, sessions, completions, today]);

  useEffect(() => {
    if (period !== 'month') return;
    const timeout = setTimeout(() => {
      setMonthly(getMonthlySummary(sessions, completions, goals, themes, viewYear, viewMonth));
    }, 100);
    return () => clearTimeout(timeout);
  }, [period, sessions, completions, goals, themes, viewYear, viewMonth]);

  const isCurrentMonth = viewYear === currentYear && viewMonth === currentMonth;

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
    setSelectedHistoryDate(null);
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
    setSelectedHistoryDate(null);
  }

  useEffect(() => {
    if (period !== 'history' || historyView !== 'overview' || !isVisible) {
      preparedOverviewRef.current = null;
      setHistoryPreparing(false);
      return;
    }

    if (historyLoading) {
      preparedOverviewRef.current = null;
      setHistoryPreparing(false);
      return;
    }

    const prepared = preparedOverviewRef.current;
    if (
      prepared &&
      prepared.completions === completions &&
      prepared.sessions === sessions &&
      prepared.filter === historyFilter
    ) {
      setHistoryPreparing(false);
      return;
    }

    let cancelled = false;
    setHistoryPreparing(true);

    const frame = requestAnimationFrame(() => {
      if (cancelled) return;

      const entries: OverviewEntry[] = [];

      if (historyFilter !== 'focus') {
        for (const record of completions) {
          entries.push({
            id: `task:${record.id}`,
            kind: 'task',
            timestamp: record.completedAt,
            date: dateOf(record.completedAt),
            record,
          });
        }
      }

      if (historyFilter !== 'task') {
        for (const session of sessions) {
          entries.push({
            id: `focus:${session.id}`,
            kind: 'focus',
            timestamp: session.startTime,
            date: dateOf(session.startTime),
            session,
          });
        }
      }

      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const groups = new Map<string, OverviewEntry[]>();
      for (const entry of entries) {
        const current = groups.get(entry.date) ?? [];
        current.push(entry);
        groups.set(entry.date, current);
      }

      if (cancelled) return;

      setGroupedOverviewEntries(
        Array.from(groups.entries()).sort(([dateA], [dateB]) => dateB.localeCompare(dateA)),
      );
      setHistoryEntryCount(entries.length);
      preparedOverviewRef.current = { completions, sessions, filter: historyFilter };
      setHistoryPreparing(false);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [completions, historyFilter, historyLoading, historyView, isVisible, period, sessions]);

  useEffect(() => {
    if (!selectedHistoryDate || goalHistoryLoading) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        if (cancelled) return;

        const nextData: SelectedDateData = {
          date: selectedHistoryDate,
          tasks: completions.filter((record) => dateOf(record.completedAt) === selectedHistoryDate),
          sessions: sessions
            .filter((session) => dateOf(session.startTime) === selectedHistoryDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime)),
          goalFactors: goalCompletions
            .filter((record) => record.completedDate === selectedHistoryDate)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        };

        setSelectedDateData(nextData);
        setDayDetailLoading(false);
      }, 60);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [completions, goalCompletions, goalHistoryLoading, selectedHistoryDate, sessions]);

  useEffect(
    () => () => {
      if (taskOpenTimeoutRef.current) clearTimeout(taskOpenTimeoutRef.current);
    },
    [],
  );

  const openTaskFromHistory = useCallback(
    (record: CompletedTaskRecord) => {
      if (!onOpenTask || taskOpeningRef.current) return;

      taskOpeningRef.current = true;
      setOpeningTaskId(record.id);
      taskOpenTimeoutRef.current = setTimeout(() => {
        taskOpenTimeoutRef.current = null;
        setOpeningTaskId(null);
        taskOpeningRef.current = false;
        onOpenTask(record);
      }, 100);
    },
    [onOpenTask],
  );

  const openHistoryDate = useCallback((date: string) => {
    setSelectedDateData(null);
    setDayDetailLoading(true);
    setSelectedHistoryDate(date);
  }, []);

  const closeHistoryDate = useCallback(() => {
    setSelectedHistoryDate(null);
    setDayDetailLoading(false);
  }, []);

  const calendarStatsByDate = useMemo(() => {
    const statsByDate = new Map<string, CalendarDayStats>();
    if (period !== 'history' || historyView !== 'calendar') return statsByDate;
    const getStats = (date: string) => {
      let stats = statsByDate.get(date);
      if (!stats) {
        stats = { tasks: 0, focusMinutes: 0, goalFactors: 0 };
        statsByDate.set(date, stats);
      }
      return stats;
    };

    for (const record of completions) {
      getStats(dateOf(record.completedAt)).tasks += 1;
    }
    for (const session of sessions) {
      getStats(dateOf(session.startTime)).focusMinutes += session.duration;
    }
    for (const factor of goalCompletions) {
      getStats(factor.completedDate).goalFactors += 1;
    }

    return statsByDate;
  }, [completions, goalCompletions, historyView, period, sessions]);

  const calendarCells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const selectedDateDataReady =
    selectedHistoryDate !== null && selectedDateData?.date === selectedHistoryDate;
  const selectedDateTasks = selectedDateDataReady ? (selectedDateData?.tasks ?? []) : [];
  const selectedDateSessions = selectedDateDataReady ? (selectedDateData?.sessions ?? []) : [];
  const selectedDateGoalFactors = selectedDateDataReady
    ? (selectedDateData?.goalFactors ?? [])
    : [];

  return (
    <View style={globalStyles.screen}>
      <Header title="Relatórios" onBack={onBack} />

      <View style={styles.periodSelector}>
        {(
          [
            { key: 'week', label: 'Semanal' },
            { key: 'month', label: 'Mensal' },
            { key: 'history', label: 'Histórico' },
          ] as { key: Period; label: string }[]
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.periodBtn, period === item.key && styles.periodBtnActive]}
            onPress={() => {
              if (item.key === period) return;
              setPeriod(item.key);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodLabel, period === item.key && styles.periodLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'week' && weekly && (
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
              icon="refresh"
              label="Sessões"
              value={String(weekly.totalSessions)}
              color={colors.rose}
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
              data={weekly.focusDays.map((day) => ({ label: day.label, value: day.value }))}
              unit="h"
              barColor={colors.sky}
              highlight={todayIndex}
              height={120}
            />
          </Card>

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Tarefas concluídas por dia</Text>
            <BarChart
              data={weekly.taskDays.map((day) => ({ label: day.label, value: day.value }))}
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

      {period === 'month' && monthly && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <MonthNavigation
            year={viewYear}
            month={viewMonth}
            isCurrentMonth={isCurrentMonth}
            onPrevious={goToPrevMonth}
            onNext={goToNextMonth}
          />

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
              {monthly.focusByTheme.map((theme) => {
                const maxMinutes = monthly.focusByTheme[0].minutes;
                const ratio = maxMinutes > 0 ? theme.minutes / maxMinutes : 0;
                return (
                  <View key={theme.name} style={styles.themeRow}>
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
              <View style={styles.goalsList}>
                {monthly.goalsSummary.map((goal) => (
                  <View key={goal.id} style={styles.goalItem}>
                    <View style={[styles.goalMarker, { backgroundColor: goal.color }]} />
                    <Text style={styles.goalName}>{goal.title}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {monthly.totalHours === 0 &&
            monthly.totalTasks === 0 &&
            monthly.goalsSummary.length === 0 && (
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
          <View style={styles.historyViewSelector}>
            <TouchableOpacity
              style={[
                styles.historyViewButton,
                historyView === 'overview' && styles.historyViewButtonActive,
              ]}
              onPress={() => {
                setHistoryView('overview');
                closeHistoryDate();
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={16}
                color={historyView === 'overview' ? colors.primaryDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.historyViewLabel,
                  historyView === 'overview' && styles.historyViewLabelActive,
                ]}
              >
                Visão geral
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.historyViewButton,
                historyView === 'calendar' && styles.historyViewButtonActive,
              ]}
              onPress={() => {
                setHistoryView('calendar');
                closeHistoryDate();
                void loadGoalHistory();
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={16}
                color={historyView === 'calendar' ? colors.primaryDark : colors.textSecondary}
              />
              <Text
                style={[
                  styles.historyViewLabel,
                  historyView === 'calendar' && styles.historyViewLabelActive,
                ]}
              >
                Calendário
              </Text>
            </TouchableOpacity>
          </View>

          {historyView === 'overview' && (
            <>
              <View style={styles.historyFilters}>
                {HISTORY_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      historyFilter === filter.key && styles.filterChipActive,
                    ]}
                    onPress={() => setHistoryFilter(filter.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipLabel,
                        historyFilter === filter.key && styles.filterChipLabelActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.historyCount}>
                  {historyEntryCount} {historyEntryCount === 1 ? 'registro' : 'registros'}
                </Text>
              </View>

              {historyBusy ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingStateText}>
                    Buscando tarefas e sessões anteriores...
                  </Text>
                </View>
              ) : groupedOverviewEntries.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <MaterialCommunityIcons name="history" size={48} color={colors.textDisabled} />
                  <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
                  <Text style={styles.emptySub}>
                    Conclusões de tarefas e sessões de foco aparecerão aqui.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.historyList}
                  showsVerticalScrollIndicator={false}
                >
                  {groupedOverviewEntries.map(([date, entries]) => (
                    <View key={date} style={styles.historyGroup}>
                      <Text style={styles.historyDateHeader}>{friendlyDateHeader(date)}</Text>
                      {entries.map((entry) =>
                        entry.kind === 'task' ? (
                          <TouchableOpacity
                            key={entry.id}
                            style={styles.historyItem}
                            onPress={() => openTaskFromHistory(entry.record)}
                            activeOpacity={onOpenTask ? 0.75 : 1}
                            disabled={!onOpenTask || openingTaskId !== null}
                          >
                            <View
                              style={[
                                styles.historyDot,
                                { backgroundColor: taskTypeBadge(entry.record).color },
                              ]}
                            />
                            <Text style={styles.historyItemTitle} numberOfLines={1}>
                              {entry.record.title}
                            </Text>
                            <View
                              style={[
                                styles.badge,
                                { backgroundColor: taskTypeBadge(entry.record).color + '22' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: taskTypeBadge(entry.record).color },
                                ]}
                                numberOfLines={1}
                              >
                                {taskTypeBadge(entry.record).label}
                              </Text>
                            </View>
                            {openingTaskId === entry.record.id ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Text style={styles.historyItemTime}>
                                {formatTime(entry.record.completedAt)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View key={entry.id} style={styles.historyItem}>
                            <View style={[styles.historyDot, { backgroundColor: colors.sky }]} />
                            <View style={styles.historyItemMain}>
                              <Text style={styles.historyItemTitle} numberOfLines={1}>
                                {entry.session.themeName ?? 'Sessão de foco'}
                              </Text>
                              <Text style={styles.historyItemMeta}>
                                {formatTime(entry.session.startTime)} –{' '}
                                {formatTime(entry.session.endTime)} ·{' '}
                                {formatHours(entry.session.duration / 60)}
                              </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: colors.sky + '22' }]}>
                              <Text style={[styles.badgeText, { color: colors.sky }]}>Foco</Text>
                            </View>
                          </View>
                        ),
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </>
          )}

          {historyView === 'calendar' &&
            (selectedHistoryDate ? (
              <ScrollView
                style={styles.dayDetailScroll}
                contentContainerStyle={styles.dayDetailContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.dayDetailHeader}>
                  <TouchableOpacity
                    style={styles.backToCalendar}
                    onPress={closeHistoryDate}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={18}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.backToCalendarText}>Calendário</Text>
                  </TouchableOpacity>
                  <Text style={styles.dayDetailTitle}>{formatDate(selectedHistoryDate)}</Text>
                </View>

                {dayDetailLoading ? (
                  <View style={styles.dayDetailLoadingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.dayDetailLoadingText}>Carregando atividades do dia...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.dayDetailSummary}>
                      {selectedDateTasks.length}{' '}
                      {selectedDateTasks.length === 1 ? 'tarefa' : 'tarefas'} ·{' '}
                      {selectedDateSessions.length}{' '}
                      {selectedDateSessions.length === 1 ? 'sessão' : 'sessões'} de foco ·{' '}
                      {selectedDateGoalFactors.length}{' '}
                      {selectedDateGoalFactors.length === 1 ? 'fator de meta' : 'fatores de metas'}
                    </Text>

                    {selectedDateTasks.length > 0 && (
                      <View style={styles.dayDetailSection}>
                        <Text style={styles.daySectionTitle}>Tarefas concluídas</Text>
                        {selectedDateTasks.map((record) => {
                          const badge = taskTypeBadge(record);
                          return (
                            <TouchableOpacity
                              key={record.id}
                              style={styles.dayRecordCard}
                              onPress={() => openTaskFromHistory(record)}
                              activeOpacity={onOpenTask ? 0.75 : 1}
                              disabled={!onOpenTask || openingTaskId !== null}
                            >
                              <View style={[styles.historyDot, { backgroundColor: badge.color }]} />
                              <View style={styles.dayRecordMain}>
                                <Text style={styles.dayRecordTitle}>{record.title}</Text>
                                <Text style={styles.dayRecordMeta}>
                                  {badge.label} · Concluída às {formatTime(record.completedAt)}
                                </Text>
                              </View>
                              {openingTaskId === record.id ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : onOpenTask ? (
                                <MaterialCommunityIcons
                                  name="chevron-right"
                                  size={18}
                                  color={colors.textDisabled}
                                />
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {selectedDateSessions.length > 0 && (
                      <View style={styles.dayDetailSection}>
                        <Text style={styles.daySectionTitle}>Sessões de foco</Text>
                        {selectedDateSessions.map((session) => (
                          <View key={session.id} style={styles.dayRecordCard}>
                            <View style={[styles.historyDot, { backgroundColor: colors.sky }]} />
                            <View style={styles.dayRecordMain}>
                              <Text style={styles.dayRecordTitle}>
                                {session.themeName ?? 'Foco geral'}
                              </Text>
                              <Text style={styles.dayRecordMeta}>
                                {formatTime(session.startTime)} – {formatTime(session.endTime)} ·{' '}
                                {formatHours(session.duration / 60)}
                                {session.isManual ? ' · Registro manual' : ''}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {selectedDateGoalFactors.length > 0 && (
                      <View style={styles.dayDetailSection}>
                        <Text style={styles.daySectionTitle}>Fatores de metas concluídos</Text>
                        {selectedDateGoalFactors.map((factor) => (
                          <View key={factor.id} style={styles.dayRecordCard}>
                            <View
                              style={[
                                styles.goalMarkerSmall,
                                { backgroundColor: factor.goalColor ?? colors.peach },
                              ]}
                            />
                            <View style={styles.dayRecordMain}>
                              <Text style={styles.dayRecordTitle}>{factor.taskTitle}</Text>
                              <Text style={styles.dayRecordMeta}>
                                {factor.goalTitle}
                                {getGoalFactorTime(factor) ? ` · ${getGoalFactorTime(factor)}` : ''}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {selectedDateTasks.length === 0 &&
                      selectedDateSessions.length === 0 &&
                      selectedDateGoalFactors.length === 0 && (
                        <View style={styles.dayEmpty}>
                          <MaterialCommunityIcons
                            name="calendar-blank-outline"
                            size={38}
                            color={colors.textDisabled}
                          />
                          <Text style={styles.emptySub}>
                            Nenhuma atividade registrada neste dia.
                          </Text>
                        </View>
                      )}
                  </>
                )}
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={styles.calendarContent}
                showsVerticalScrollIndicator={false}
              >
                <MonthNavigation
                  year={viewYear}
                  month={viewMonth}
                  isCurrentMonth={isCurrentMonth}
                  onPrevious={goToPrevMonth}
                  onNext={goToNextMonth}
                />

                <View style={styles.calendarGrid}>
                  {WEEKDAY_HEADERS.map((weekday) => (
                    <View key={weekday} style={styles.calendarWeekday}>
                      <Text style={styles.calendarWeekdayText}>{weekday}</Text>
                    </View>
                  ))}
                  {calendarCells.map((date, index) => {
                    if (!date)
                      return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                    const stats = calendarStatsByDate.get(date) ?? {
                      tasks: 0,
                      focusMinutes: 0,
                      goalFactors: 0,
                    };
                    const dayNumber = Number(date.slice(-2));
                    const isToday = date === localDateStr();
                    const hours = stats.focusMinutes / 60;
                    const focusBarHeight =
                      hours > 0 ? Math.min(12, Math.max(3, Math.round(hours * 3))) : 0;
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[styles.calendarDay, isToday && styles.calendarDayToday]}
                        onPress={() => openHistoryDate(date)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calendarDayNumber,
                            isToday && styles.calendarDayNumberToday,
                          ]}
                        >
                          {dayNumber}
                        </Text>
                        <View style={styles.calendarIndicators}>
                          {stats.tasks > 0 && <View style={styles.taskIndicator} />}
                          {stats.goalFactors > 0 && <View style={styles.goalIndicator} />}
                          {focusBarHeight > 0 && (
                            <View style={[styles.focusIndicator, { height: focusBarHeight }]} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Card style={styles.calendarLegendCard}>
                  <Text style={styles.chartTitle}>Legenda</Text>
                  <View style={styles.legendRow}>
                    <View style={styles.taskIndicator} />
                    <Text style={styles.legendText}>Tarefa concluída</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.goalIndicator, styles.legendGoalIndicator]} />
                    <Text style={styles.legendText}>Fator de meta concluído</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.focusIndicator, { height: 10 }]} />
                    <Text style={styles.legendText}>Foco</Text>
                  </View>
                </Card>
              </ScrollView>
            ))}
        </View>
      )}
    </View>
  );
}

function MonthNavigation({
  year,
  month,
  isCurrentMonth,
  onPrevious,
  onNext,
}: {
  year: number;
  month: number;
  isCurrentMonth: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.monthNav}>
      <TouchableOpacity onPress={onPrevious} style={styles.monthNavBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.monthNavCenter}>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month]}</Text>
        <Text style={styles.yearLabel}>{year}</Text>
      </View>
      <TouchableOpacity
        onPress={onNext}
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
  infoTitle: { ...typography.label, color: colors.textPrimary },
  infoSub: { ...typography.xs, color: colors.textSecondary, marginTop: 2 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  themeDot: { width: 10, height: 10, borderRadius: radius.full },
  themeName: { ...typography.sm, color: colors.textPrimary, width: 82 },
  themeBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  themeBarFill: { height: '100%', borderRadius: radius.full },
  themeValue: { ...typography.xs, color: colors.textSecondary, minWidth: 48, textAlign: 'right' },
  goalsList: { gap: spacing.md, paddingTop: spacing.xs },
  goalItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalMarker: { width: 11, height: 11, borderRadius: radius.full },
  goalName: { ...typography.sm, color: colors.textPrimary, flex: 1 },
  emptyCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySub: { ...typography.sm, color: colors.textDisabled, textAlign: 'center', lineHeight: 20 },
  historyContainer: { flex: 1 },
  historyViewSelector: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyViewButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  historyViewButtonActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  historyViewLabel: { ...typography.label, color: colors.textSecondary },
  historyViewLabelActive: { color: colors.primaryDark },
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
  historyList: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  historyGroup: { gap: spacing.xs },
  historyDateHeader: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    letterSpacing: 0.8,
    paddingVertical: spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyDot: { width: 8, height: 8, borderRadius: radius.full },
  historyItemMain: { flex: 1, gap: 2 },
  historyItemTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  historyItemTime: {
    ...typography.xs,
    color: colors.textDisabled,
    marginLeft: spacing.xs,
    minWidth: 38,
    textAlign: 'right',
  },
  historyItemMeta: { ...typography.xs, color: colors.textDisabled },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  badgeText: { ...typography.xs, fontWeight: '600' },
  historyEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingStateText: {
    ...typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  calendarContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  calendarWeekday: { width: '14.2857%', alignItems: 'center', paddingVertical: spacing.sm },
  calendarWeekdayText: { ...typography.xs, color: colors.textSecondary, fontWeight: '700' },
  calendarDayEmpty: { width: '14.2857%', minHeight: 58 },
  calendarDay: {
    width: '14.2857%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calendarDayToday: { backgroundColor: colors.primaryLight, borderColor: colors.primary + '66' },
  calendarDayNumber: { ...typography.sm, color: colors.textPrimary },
  calendarDayNumberToday: { color: colors.primaryDark, fontWeight: '800' },
  calendarIndicators: {
    height: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  taskIndicator: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.mint },
  goalIndicator: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.peach,
    transform: [{ rotate: '45deg' }],
  },
  legendGoalIndicator: { marginLeft: 1, marginRight: 1 },
  focusIndicator: { width: 4, borderRadius: radius.full, backgroundColor: colors.sky },
  calendarLegendCard: { gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendText: { ...typography.xs, color: colors.textSecondary },
  dayDetailScroll: { flex: 1 },
  dayDetailContainer: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  dayDetailHeader: { gap: spacing.xs },
  dayDetailLoadingState: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dayDetailLoadingText: { ...typography.sm, color: colors.textSecondary },
  backToCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  backToCalendarText: { ...typography.label, color: colors.primaryDark },
  dayDetailTitle: { ...typography.h3, color: colors.textPrimary, textTransform: 'capitalize' },
  dayDetailSummary: { ...typography.xs, color: colors.textSecondary },
  dayDetailSection: { gap: spacing.xs },
  daySectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  dayRecordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dayRecordMain: { flex: 1, gap: 3 },
  dayRecordTitle: { ...typography.sm, color: colors.textPrimary, fontWeight: '600' },
  dayRecordMeta: { ...typography.xs, color: colors.textSecondary },
  goalMarkerSmall: { width: 9, height: 9, borderRadius: radius.full },
  dayEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
});
