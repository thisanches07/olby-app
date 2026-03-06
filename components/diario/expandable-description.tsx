import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";
const COLLAPSED_LINES = 3;

interface ExpandableDescriptionProps {
  description: string;
}

export function ExpandableDescription({
  description,
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  const trimmed = useMemo(() => description.trim(), [description]);
  if (!trimmed) return null;

  return (
    <View style={styles.wrap}>
      {/* Medição real do texto (SEM numberOfLines) */}
      <Text
        style={[styles.text, styles.measure]}
        onTextLayout={(e) => {
          // aqui é o texto completo mesmo
          if (!canExpand && e.nativeEvent.lines.length > COLLAPSED_LINES) {
            setCanExpand(true);
          }
        }}
      >
        {trimmed}
      </Text>

      {/* Texto visível (com ellipsis quando colapsado) */}
      <Text
        style={styles.text}
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
      >
        {trimmed}
      </Text>

      {canExpand && (
        <TouchableOpacity
          onPress={() => setExpanded((prev) => !prev)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.toggle}>
            {expanded ? "Ver menos" : "Ver mais"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    marginBottom: 10,
  },
  text: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  toggle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },

  // texto invisível pra medir (não interfere no layout)
  measure: {
    position: "absolute",
    opacity: 0,
    zIndex: -1,
    left: 0,
    right: 0,
  },
});
