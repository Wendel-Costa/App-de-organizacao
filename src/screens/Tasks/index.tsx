import { View, Text } from 'react-native';
import { globalStyles } from '@/styles/global';

export function TasksScreen() {
  return (
    <View style={globalStyles.center}>
      <Text style={globalStyles.textH2}>Tarefas</Text>
    </View>
  );
}
