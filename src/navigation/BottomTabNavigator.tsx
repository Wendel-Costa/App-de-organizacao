import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/styles/theme';

import HomeScreen from '@/screens/Home';
import TasksScreen from '@/screens/Tasks';
import FocusScreen from '@/screens/Focus';
import GoalsScreen from '@/screens/Goals';
import SettingsScreen from '@/screens/Settings';

export type BottomTabParamList = {
  Home: undefined;
  Tasks: undefined;
  Focus: undefined;
  Goals: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

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
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
