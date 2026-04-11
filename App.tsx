import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { globalStyles } from '@/styles/global';
import { colors } from '@/styles/theme';
import { runMigrations } from '@/database/migrations';

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
      <View style={globalStyles.center}>
        <Text style={globalStyles.textH1}>FocoMais 🟡</Text>
        <Text style={[globalStyles.textSm, globalStyles.mt_sm]}>Seu app de foco e organização</Text>
      </View>
      <StatusBar style="auto" backgroundColor={colors.background} />
    </GestureHandlerRootView>
  );
}
