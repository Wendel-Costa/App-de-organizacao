import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, radius, typography } from '@/styles/theme';
import { adjustTimePart, formatTimeValue, parseTimeValue } from '@/utils/time';

interface TimePickerProps {
  label?: string;
  value: string;
  onChange: (time: string) => void;
}

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [show, setShow] = useState(false);
  const [hours, setHours] = useState('08');
  const [minutes, setMinutes] = useState('00');
  const [invalidTime, setInvalidTime] = useState(false);

  function openPicker() {
    const parsed = parseTimeValue(value) ?? { hours: 8, minutes: 0 };
    setHours(String(parsed.hours).padStart(2, '0'));
    setMinutes(String(parsed.minutes).padStart(2, '0'));
    setInvalidTime(false);
    setShow(true);
  }

  function adjustHours(amount: number) {
    const currentHours = Number(hours);
    const validHours = Number.isInteger(currentHours) && currentHours >= 0 && currentHours <= 23;
    const next = adjustTimePart(formatTimeValue(validHours ? currentHours : 0, 0), 'hour', amount);
    setHours(next.slice(0, 2));
    setInvalidTime(false);
  }

  function adjustMinutes(amount: number) {
    const currentMinutes = Number(minutes);
    const validMinutes =
      Number.isInteger(currentMinutes) && currentMinutes >= 0 && currentMinutes <= 59;
    const next = adjustTimePart(
      formatTimeValue(0, validMinutes ? currentMinutes : 0),
      'minute',
      amount,
    );
    setMinutes(next.slice(3, 5));
    setInvalidTime(false);
  }

  function closePicker() {
    Keyboard.dismiss();
    setShow(false);
  }

  function confirmSelection() {
    const parsed = parseTimeValue(`${hours}:${minutes}`);
    if (!parsed) {
      setInvalidTime(true);
      return;
    }

    Keyboard.dismiss();
    onChange(formatTimeValue(parsed.hours, parsed.minutes));
    setShow(false);
  }

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.button} onPress={openPicker} activeOpacity={0.7}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primaryDark} />
        <Text style={styles.text}>{value}</Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade" onRequestClose={closePicker}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior="padding">
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>{label ?? 'Selecionar horário'}</Text>
                  <Text style={styles.modalSubtitle}>Escolha a hora e os minutos.</Text>
                </View>
                <TouchableOpacity
                  onPress={closePicker}
                  hitSlop={8}
                  accessibilityLabel="Fechar seletor de horário"
                >
                  <MaterialCommunityIcons name="close" size={21} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerRow}>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Hora</Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => adjustHours(1)}
                    activeOpacity={0.7}
                    accessibilityLabel="Aumentar hora"
                  >
                    <MaterialCommunityIcons
                      name="chevron-up"
                      size={25}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={hours}
                    onChangeText={(nextValue) => {
                      setHours(nextValue.replace(/\D/g, '').slice(0, 2));
                      setInvalidTime(false);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={styles.timeInput}
                    textAlign="center"
                    accessibilityLabel="Hora selecionada"
                  />
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => adjustHours(-1)}
                    activeOpacity={0.7}
                    accessibilityLabel="Diminuir hora"
                  >
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={25}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Minuto</Text>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => adjustMinutes(1)}
                    activeOpacity={0.7}
                    accessibilityLabel="Aumentar minuto"
                  >
                    <MaterialCommunityIcons
                      name="chevron-up"
                      size={25}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={minutes}
                    onChangeText={(nextValue) => {
                      setMinutes(nextValue.replace(/\D/g, '').slice(0, 2));
                      setInvalidTime(false);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={styles.timeInput}
                    textAlign="center"
                    accessibilityLabel="Minutos selecionados"
                  />
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => adjustMinutes(-1)}
                    activeOpacity={0.7}
                    accessibilityLabel="Diminuir minuto"
                  >
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={25}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {invalidTime && (
                <Text style={styles.errorText}>
                  Informe uma hora entre 00 e 23 e minutos entre 00 e 59.
                </Text>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closePicker}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmSelection}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.xs,
    color: colors.textSecondary,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  pickerColumn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickerLabel: {
    ...typography.xs,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepButton: {
    width: 54,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  timeInput: {
    width: 76,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '600',
    padding: 0,
  },
  timeSeparator: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.xs,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  cancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  confirmButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  confirmText: {
    ...typography.label,
    color: colors.textOnPrimary,
  },
});
