import { View, Text } from 'react-native';
import { globalStyles } from '@/styles/global';

export default function HomeScreen() {
  return (
    <View style={globalStyles.center}>
      <Text style={globalStyles.textH2}>Início</Text>
    </View>
  );
}
