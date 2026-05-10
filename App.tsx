import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { globalStyles } from '@/styles/global';
import { colors } from '@/styles/theme';
import { runMigrations } from '@/database/migrations';
import { Navigation } from '@/navigation';

import { WIDGET_TASK_NAME, updateWidget } from '@/widgets/widgetTask';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerWidgetTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(WIDGET_TASK_NAME, {
        minimumInterval: 30 * 60, // 30 minutos
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (e) {
    console.log('BackgroundFetch register error:', e);
  }
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(async () => {
        setDbReady(true);
        await registerWidgetTask();
        await updateWidget();
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        updateWidget();
      }
    });
    return () => sub.remove();
  }, []);

  if (!dbReady) {
    return (
      <GestureHandlerRootView style={globalStyles.flex}>
        <SafeAreaProvider>
          <View style={globalStyles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={globalStyles.flex}>
      <SafeAreaProvider>
        <Navigation />
        <StatusBar style="auto" backgroundColor={colors.background} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
