import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { Task } from '@/types/task.types';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();

  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();

  if (status === 'granted' && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FocoMais',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F5C518',
    });
  }

  return status === 'granted';
}

export async function scheduleTaskReminder(task: Task, hour: number = 8): Promise<void> {
  if (!task.scheduledDate) return;

  const [year, month, day] = task.scheduledDate.split('-').map(Number);
  const triggerDate = new Date(year, month - 1, day, hour, 0, 0);

  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `task-reminder-${task.id}`,
    content: {
      title: 'Tarefa de hoje',
      body: task.title,
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function scheduleDueDateWarning(task: Task): Promise<void> {
  if (!task.dueDate) return;

  const [year, month, day] = task.dueDate.split('-').map(Number);
  const triggerDate = new Date(year, month - 1, day - 1, 20, 0, 0);

  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `task-due-${task.id}`,
    content: {
      title: 'Entrega amanhã',
      body: task.title,
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  await Promise.allSettled([
    Notifications.cancelScheduledNotificationAsync(`task-reminder-${taskId}`),
    Notifications.cancelScheduledNotificationAsync(`task-due-${taskId}`),
  ]);
}

export async function scheduleDailyHabitsReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-habits');

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-habits',
    content: {
      title: 'Seus hábitos de hoje',
      body: 'Não esqueça de marcar seus hábitos e tarefas do dia!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyHabitsReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-habits');
}

export async function scheduleFocusReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('focus-reminder');

  await Notifications.scheduleNotificationAsync({
    identifier: 'focus-reminder',
    content: {
      title: 'Hora de focar!',
      body: 'Reserve um momento para sua sessão de estudo.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelFocusReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('focus-reminder');
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
