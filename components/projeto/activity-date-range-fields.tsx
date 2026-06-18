import {
  brDateDigitsLen,
  brDateToIsoDate,
  isoDateToBRDate,
  maskBRDate,
  parseBRDateToLocalDate,
} from "@/utils/br-date";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";

export type ActivityDateRangeValue = {
  startDate?: string | null;
  dueDate?: string | null;
};

type DateFieldKey = "startDate" | "dueDate";

interface ActivityDateRangeFieldsProps {
  value: ActivityDateRangeValue;
  onChange: (next: ActivityDateRangeValue) => void;
  disabled?: boolean;
  compact?: boolean;
}

function hasCompleteDate(value: string) {
  return brDateDigitsLen(value) === 8;
}

function toDateTime(value: string) {
  const parsed = parseBRDateToLocalDate(value);
  return parsed ? parsed.getTime() : null;
}

export function validateActivityDateRange(value: ActivityDateRangeValue):
  | string
  | null {
  const startText = isoDateToBRDate(value.startDate);
  const dueText = isoDateToBRDate(value.dueDate);
  const startTime = startText ? toDateTime(startText) : null;
  const dueTime = dueText ? toDateTime(dueText) : null;

  if (value.startDate && startTime === null) return "Data de início inválida.";
  if (value.dueDate && dueTime === null) return "Data de fim inválida.";
  if (startTime !== null && dueTime !== null && dueTime < startTime) {
    return "A data de fim não pode ser anterior ao início.";
  }
  return null;
}

export function ActivityDateRangeFields({
  value,
  onChange,
  disabled = false,
  compact = false,
}: ActivityDateRangeFieldsProps) {
  const [startText, setStartText] = useState("");
  const [dueText, setDueText] = useState("");

  useEffect(() => {
    setStartText(isoDateToBRDate(value.startDate));
    setDueText(isoDateToBRDate(value.dueDate));
  }, [value.startDate, value.dueDate]);

  const error = useMemo(() => {
    const startComplete = hasCompleteDate(startText);
    const dueComplete = hasCompleteDate(dueText);
    const startTime = startComplete ? toDateTime(startText) : null;
    const dueTime = dueComplete ? toDateTime(dueText) : null;

    if (startText && !startComplete) return "Complete o início.";
    if (dueText && !dueComplete) return "Complete o fim.";
    if (startComplete && startTime === null) return "Início inválido.";
    if (dueComplete && dueTime === null) return "Fim inválido.";
    if (startTime !== null && dueTime !== null && dueTime < startTime) {
      return "Fim antes do início.";
    }
    return null;
  }, [dueText, startText]);

  const update = (key: DateFieldKey, text: string) => {
    const masked = maskBRDate(text);
    const nextText = key === "startDate" ? setStartText : setDueText;
    nextText(masked);

    const iso = hasCompleteDate(masked) ? brDateToIsoDate(masked) : null;
    onChange({
      ...value,
      [key]: iso,
    });
  };

  const clear = (key: DateFieldKey) => {
    if (key === "startDate") setStartText("");
    else setDueText("");
    onChange({ ...value, [key]: null });
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.headerRow}>
        <MaterialIcons name="event" size={15} color={PRIMARY} />
        <Text style={styles.label}>Período</Text>
        <Text style={styles.optional}>opcional</Text>
      </View>

      <View style={[styles.fieldsRow, compact && styles.fieldsRowCompact]}>
        <DateInput
          label="Início"
          value={startText}
          onChangeText={(text) => update("startDate", text)}
          onClear={() => clear("startDate")}
          disabled={disabled}
          hasError={!!error && !!startText}
        />
        <DateInput
          label="Fim"
          value={dueText}
          onChangeText={(text) => update("dueDate", text)}
          onClear={() => clear("dueDate")}
          disabled={disabled}
          hasError={!!error && !!dueText}
        />
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function DateInput({
  label,
  value,
  onChangeText,
  onClear,
  disabled,
  hasError,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  disabled: boolean;
  hasError: boolean;
}) {
  return (
    <View style={[styles.dateBox, hasError && styles.dateBoxError]}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateInputRow}>
        <TextInput
          style={styles.dateInput}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          maxLength={10}
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#A8AFBD"
        />
        {!!value && !disabled && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  wrapCompact: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  optional: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  fieldsRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldsRowCompact: {
    gap: 8,
  },
  dateBox: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  dateBoxError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF1F2",
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateInputRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateInput: {
    flex: 1,
    padding: 0,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
  },
  errorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
});
