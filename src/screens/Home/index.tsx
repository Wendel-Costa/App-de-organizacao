import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { globalStyles } from '@/styles/global';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { useFocusStore } from '@/store/focusStore';
import { useGoalStore } from '@/store/goalStore';
import {
  filterTasksForHome,
  getTodayString,
  applyRecurringReset,
} from '@/services/recurrence.service';
import { dateOf } from '@/utils/date';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { TaskItem } from '@/components/TaskItem';
import { ReportsScreen } from '@/screens/Reports';
import { SettingsScreen } from '@/screens/Settings';
import { ActiveFocusScreen } from '@/screens/Focus/ActiveFocus';
import { TaskDetailScreen } from '@/screens/Tasks/TaskDetail';
import { CreateTaskScreen } from '@/screens/Tasks/CreateTask';
import { useSettingsStore } from '@/store/settingsStore';
import type { Task } from '@/types/task.types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function HomeScreen() {
  const { tasks, fetchTasks, toggleComplete, removeTask } = useTaskStore();
  const { sessions, fetchSessions, setMode, fetchThemes } = useFocusStore();
  const { goals, fetchGoals } = useGoalStore();
  const { name } = useSettingsStore();
  const navigation = useNavigation<any>();
  const [showReports, setShowReports] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActiveFocus, setShowActiveFocus] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [homeScreen, setHomeScreen] = useState<'home' | 'detail' | 'edit'>('home');

  const hasOverlayRef = useRef(false);
  hasOverlayRef.current = showSettings || showReports || homeScreen !== 'home' || showActiveFocus;

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      if (hasOverlayRef.current) {
        e.preventDefault?.();
        setShowSettings(false);
        setShowReports(false);
        setShowActiveFocus(false);
        setHomeScreen('home');
        setSelectedTask(null);
      }
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchGoals();
      fetchSessions();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (homeScreen === 'edit') {
          setHomeScreen('detail');
          return true;
        }
        if (homeScreen === 'detail') {
          setHomeScreen('home');
          return true;
        }
        if (showReports) {
          setShowReports(false);
          return true;
        }
        if (showSettings) {
          setShowSettings(false);
          return true;
        }
        if (showActiveFocus) {
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [showReports, showSettings, showActiveFocus, homeScreen]),
  );

  useEffect(() => {
    fetchThemes();
  }, []);

  const todayStr = getTodayString();
  const activeGoals = goals.filter((g) => g.startDate <= todayStr && g.endDate >= todayStr);

  const rawTodayTasks = filterTasksForHome(tasks);
  const todayTasks = applyRecurringReset(rawTodayTasks, todayStr);

  const pending = todayTasks.filter((t) => !t.completed);
  const completed = todayTasks.filter((t) => t.completed);

  const todayMinutes = sessions
    .filter((s) => dateOf(s.startTime) === todayStr)
    .reduce((acc, s) => acc + s.duration, 0);

  const focusLabel =
    todayMinutes === 0
      ? '0h'
      : todayMinutes < 60
        ? `${todayMinutes}m`
        : `${(todayMinutes / 60).toFixed(1)}h`;

  if (showActiveFocus) return <ActiveFocusScreen onStop={() => setShowActiveFocus(false)} />;
  if (showReports) return <ReportsScreen onBack={() => setShowReports(false)} />;
  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;

  if (homeScreen === 'edit' && selectedTask) {
    return (
      <CreateTaskScreen
        initialTask={selectedTask}
        onBack={() => setHomeScreen('detail')}
        onSuccess={() => {
          fetchTasks();
          setHomeScreen('detail');
        }}
      />
    );
  }

  if (homeScreen === 'detail' && selectedTask) {
    const rawTask = tasks.find((t) => t.id === selectedTask.id) ?? selectedTask;
    const effectiveTask = applyRecurringReset([rawTask], getTodayString())[0];
    return (
      <TaskDetailScreen
        task={effectiveTask}
        onBack={() => setHomeScreen('home')}
        onDeleted={() => setHomeScreen('home')}
        onEdit={() => setHomeScreen('edit')}
      />
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Header
        title=" FocoMais"
        rightAction={{ icon: 'chart-bar', onPress: () => setShowReports(true) }}
        secondaryAction={{ icon: 'cog-outline', onPress: () => setShowSettings(true) }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            {getGreeting()}
            {name ? `, ${name}` : ''}!
          </Text>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            icon="check-circle-outline"
            label="Tarefas"
            value={`${completed.length}/${todayTasks.length}`}
            color={colors.mint}
          />
          <SummaryCard
            icon="timer-outline"
            label="Foco hoje"
            value={focusLabel}
            color={colors.sky}
          />
          <SummaryCard
            icon="flag-outline"
            label="Metas ativas"
            value={String(activeGoals.length)}
            color={colors.peach}
          />
        </View>

        <Text style={styles.sectionTitle}>Iniciar foco</Text>
        <Card elevated style={styles.focusCard}>
          <View style={globalStyles.rowBetween}>
            <View>
              <Text style={styles.focusTitle}>Modo livre</Text>
              <Text style={styles.focusSubtitle}>Sem tempo definido</Text>
            </View>

            <TouchableOpacity
              style={styles.focusButton}
              activeOpacity={0.8}
              onPress={() => {
                setMode('free');
                setShowActiveFocus(true);
              }}
            >
              <MaterialCommunityIcons name="play" size={28} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.focusCard}>
          <View style={globalStyles.rowBetween}>
            <View>
              <Text style={styles.focusTitle}>Pomodoro</Text>
              <Text style={styles.focusSubtitle}>25 min foco · 5 min pausa</Text>
            </View>

            <TouchableOpacity
              style={styles.focusButton}
              activeOpacity={0.8}
              onPress={() => {
                setMode('pomodoro');
                setShowActiveFocus(true);
              }}
            >
              <MaterialCommunityIcons name="play" size={28} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Tarefas de hoje ({pending.length} pendentes)</Text>

        {todayTasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="playlist-check" size={40} color={colors.textDisabled} />
              <Text style={styles.emptyText}>Nenhuma tarefa para hoje</Text>
            </View>
          </Card>
        ) : (
          <View style={styles.taskList}>
            {[...pending, ...completed].map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleComplete}
                onPress={(t) => {
                  setSelectedTask(t);
                  setHomeScreen('detail');
                }}
                onDelete={removeTask}
              />
            ))}
          </View>
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
      <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      <Text
        style={styles.summaryValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  greeting: {
    marginBottom: spacing.lg,
  },
  greetingText: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  },
  summaryLabel: {
    ...typography.xs,
    color: colors.textSecondary,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  focusCard: {
    marginBottom: spacing.sm,
  },
  focusTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  focusSubtitle: {
    ...typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  focusButton: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    marginBottom: spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textDisabled,
  },
  taskList: {
    gap: spacing.sm,
  },
});
