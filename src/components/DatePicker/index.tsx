import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '@/styles/theme';

interface DatePickerProps {
  label?: string;
  value?: string; // ISO string AAAA-MM-DD
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  minimumDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Selecionar data',
  minimumDate,
}: DatePickerProps) {
  const [show, setShow] = useState(false);

  const date = value ? new Date(value + 'T12:00:00') : new Date();

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    setShow(Platform.OS === 'ios');
    if (selected) {
      const iso = selected.toISOString().split('T')[0];
      onChange(iso);
    }
  }

  function handleClear() {
    onChange(undefined);
  }

  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity style={styles.button} onPress={() => setShow(true)} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name="calendar-outline"
          size={20}
          color={displayValue ? colors.primaryDark : colors.textDisabled}
        />
        <Text style={[styles.text, !displayValue && styles.placeholder]}>
          {displayValue ?? placeholder}
        </Text>
        {displayValue && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}
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
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  placeholder: {
    color: colors.textDisabled,
  },
});
