import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { globalStyles } from '@/styles/global';
import { colors } from '@/styles/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={globalStyles.flex}>
      <View style={globalStyles.center}>
        <Text style={globalStyles.textH1}>FocoMais 🟡</Text>
        <Text style={[globalStyles.textSm, globalStyles.mt_sm]}>
          Seu app de foco e organização
        </Text>
      </View>
      <StatusBar style="auto" backgroundColor={colors.background} />
    </GestureHandlerRootView>
  );
}