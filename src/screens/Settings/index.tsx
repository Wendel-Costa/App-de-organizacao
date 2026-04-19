import { View, Text } from 'react-native';
import { globalStyles } from '@/styles/global';

export function SettingsScreen() {
  return (
    <View style={globalStyles.center}>
      <Text style={globalStyles.textH2}>Configurações</Text>
    </View>
  );
}
