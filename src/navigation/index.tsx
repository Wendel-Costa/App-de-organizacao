import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { colors } from '@/styles/theme';
import { globalStyles } from '@/styles/global';
import { useSettingsStore } from '@/store/settingsStore';
import { BottomTabNavigator } from './BottomTabNavigator';
import { OnboardingScreen } from '@/screens/Onboarding';

export function Navigation() {
  const { name, nameLoaded, loadName, loadSettings } = useSettingsStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadName(), loadSettings()]).then(() => {
      setReady(true);
    });
  }, []);

  if (!ready || !nameLoaded) {
    return (
      <View style={globalStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!name) {
    return <OnboardingScreen onDone={() => {}} />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primaryDark,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <BottomTabNavigator />
    </NavigationContainer>
  );
}
