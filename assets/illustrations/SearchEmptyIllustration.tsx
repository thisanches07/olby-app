import React from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";

interface Props {
  size?: number;
}

export function SearchEmptyIllustration({ size = 100 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Magnifying glass circle */}
      <Circle cx={40} cy={40} r={24} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={3} />
      <Circle cx={40} cy={40} r={16} fill="none" stroke="#93C5FD" strokeWidth={2} strokeDasharray="4 3" />

      {/* Handle */}
      <Line x1={58} y1={58} x2={76} y2={76} stroke="#2563EB" strokeWidth={5} strokeLinecap="round" opacity={0.5} />

      {/* Question mark */}
      <Path
        d="M36 36 C36 33 38 31 40 31 C42 31 44 33 44 35 C44 37 42 38 40 40 L40 43"
        stroke="#2563EB"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      <Circle cx={40} cy={47} r={1.5} fill="#2563EB" opacity={0.7} />
    </Svg>
  );
}
