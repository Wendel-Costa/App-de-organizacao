import { NavigationContainer } from '@react-navigation/native';
import { colors } from '@/styles/theme';
import { BottomTabNavigator } from './BottomTabNavigator';

export function Navigation() {
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
