import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/styles/theme';
import { useTaskStore } from '@/store/taskStore';
import { HomeScreen } from '@/screens/Home';
import { TasksScreen } from '@/screens/Tasks';
import { FocusScreen } from '@/screens/Focus';
import { GoalsScreen } from '@/screens/Goals';
import { RewardsScreen } from '@/screens/Rewards';

export type BottomTabParamList = {
  Home: undefined;
  Tasks: undefined;
  Focus: undefined;
  Goals: undefined;
  Rewards: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const { tasks } = useTaskStore();

  const today = new Date().toISOString().split('T')[0];
  const todayWeekday = WEEKDAYS[new Date().getDay()];

  const pendingToday = tasks.filter((t) => {
    if (t.completed) return false;
    if (t.type === 'scheduled') return t.scheduledDate === today;
    if (t.type === 'recurring') {
      return (
        t.recurrenceDays?.includes('daily' as any) ||
        t.recurrenceDays?.includes(todayWeekday as any) ||
        false
      );
    }
    return false;
  }).length;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...typography.xs,
          fontWeight: '600',
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primaryDark,
          fontSize: 10,
          minWidth: 16,
          height: 16,
          lineHeight: 16,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tarefas',
          tabBarBadge: pendingToday > 0 ? pendingToday : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="check-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          title: 'Foco',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="timer-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: 'Metas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="flag-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          title: 'Conquistas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
