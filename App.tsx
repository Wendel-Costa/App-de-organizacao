import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { globalStyles } from '@/styles/global';
import { colors } from '@/styles/theme';
import { runMigrations } from '@/database/migrations';
import { Navigation } from '@/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(() => {
        setDbReady(true);
        setDbError(false);
      })
      .catch((e) => {
        console.error('Migration error:', e);
        setDbError(true);
      });
  }, []);

  if (dbError) {
    return (
      <GestureHandlerRootView style={globalStyles.flex}>
        <SafeAreaProvider>
          <View style={[globalStyles.center, { gap: 12, padding: 24 }]}>
            <ActivityIndicator size="large" color={colors.error} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
