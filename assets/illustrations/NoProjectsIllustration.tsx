import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface Props {
  size?: number;
}

export function NoProjectsIllustration({ size = 140 }: Props) {
  const scale = size / 140;
  return (
    <Svg width={size} height={size * 0.86} viewBox="0 0 140 120">
      {/* Ground */}
      <Rect x={10} y={100} width={120} height={6} rx={3} fill="#E5E7EB" />

      {/* Building outline */}
      <Rect x={30} y={40} width={80} height={62} rx={4} fill="#EFF6FF" stroke="#BFDBFE" strokeWidth={2} />

      {/* Door */}
      <Rect x={57} y={72} width={26} height={30} rx={4} fill="#BFDBFE" />
      <Circle cx={80} cy={87} r={2.5} fill="#93C5FD" />

      {/* Windows */}
      <Rect x={40} y={54} width={16} height={14} rx={3} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5} />
      <Rect x={84} y={54} width={16} height={14} rx={3} fill="#DBEAFE" stroke="#93C5FD" strokeWidth={1.5} />

      {/* Roof */}
      <Path d="M24 42 L70 14 L116 42 Z" fill="#2563EB" opacity={0.15} />
      <Path d="M24 42 L70 14 L116 42" fill="none" stroke="#2563EB" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Chimney */}
      <Rect x={88} y={20} width={10} height={18} rx={2} fill="#3B82F6" opacity={0.4} />

      {/* Helmet */}
      <Path
        d="M55 32 C55 22 65 16 70 16 C75 16 85 22 85 32 L85 36 L55 36 Z"
        fill="#F59E0B"
        opacity={0.9}
      />
      <Rect x={52} y={34} width={36} height={5} rx={2.5} fill="#D97706" />

      {/* Stars / sparkles */}
      <Path d="M18 20 L19.5 23 L23 20 L19.5 17 Z" fill="#2563EB" opacity={0.3} />
      <Path d="M115 30 L116 32 L118 30 L116 28 Z" fill="#2563EB" opacity={0.25} />
    </Svg>
  );
}
