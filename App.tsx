import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { globalStyles } from '@/styles/global';
import { colors } from '@/styles/theme';
import { runMigrations } from '@/database/migrations';
import Navigation from '@/navigation';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(() => setDbReady(true))
      .catch(console.error);
  }, []);

  if (!dbReady) {
    return (
      <GestureHandlerRootView style={globalStyles.flex}>
        <View style={globalStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={globalStyles.flex}>
      <Navigation />
      <StatusBar style="auto" backgroundColor={colors.background} />
    </GestureHandlerRootView>
  );
}
