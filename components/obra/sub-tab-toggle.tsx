import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

export interface SubTabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface Props<T extends string> {
  options: SubTabOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

/** Segmented control para sub-abas (ex.: Despesas | Cotações). */
export function SubTabToggle<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.seg, active && styles.segActive]}
            onPress={() => onChange(opt.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>
              {opt.label}
            </Text>
            {typeof opt.count === "number" && opt.count > 0 && (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {opt.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "#EEF1F5",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    gap: 4,
  },
  seg: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segText: { fontSize: 13.5, fontWeight: "700", color: "#6B7280" },
  segTextActive: { color: "#111827" },
  badge: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 99,
    backgroundColor: "#D7DDE6",
    alignItems: "center",
  },
  badgeActive: { backgroundColor: "#DBEAFE" },
  badgeText: { fontSize: 10.5, fontWeight: "800", color: "#6B7280" },
  badgeTextActive: { color: PRIMARY },
});
