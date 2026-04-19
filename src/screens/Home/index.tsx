import { View, ScrollView, StyleSheet } from 'react-native';
import { globalStyles } from '@/styles/global';
import { spacing } from '@/styles/theme';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Text } from 'react-native';

export function HomeScreen() {
  return (
    <View style={globalStyles.screen}>
      <Header
        title="FocoMais"
        subtitle="Bom dia! Vamos focar 🟡"
        rightAction={{
          icon: 'bell-outline',
          onPress: () => {},
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card elevated style={styles.card}>
          <Text style={globalStyles.textH3}>Componentes funcionando!</Text>
          <Text style={[globalStyles.textSm, globalStyles.mt_sm]}>
            Header, Card e Button prontos.
          </Text>
        </Card>

        <Button label="Botão primário" onPress={() => {}} fullWidth style={styles.button} />
        <Button
          label="Botão secundário"
          onPress={() => {}}
          variant="secondary"
          fullWidth
          style={styles.button}
        />

        <EmptyState
          icon="check-circle-outline"
          title="Nenhuma tarefa ainda"
          description="Adicione sua primeira tarefa para começar"
          actionLabel="Criar tarefa"
          onAction={() => {}}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  button: {
    marginBottom: spacing.sm,
  },
});
