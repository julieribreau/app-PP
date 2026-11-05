import * as React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// Icônes au trait (style Lucide, 1,75), dessinées dans la couleur passée. Décoratives : le
// libellé accessible est porté par le bouton qui les contient.

export type IconName =
  | "home"
  | "bag"
  | "user"
  | "search"
  | "close"
  | "chevronLeft"
  | "chevronRight"
  | "plus"
  | "minus"
  | "trash"
  | "scanFace"
  | "fingerprint"
  | "info"
  | "download"
  | "camera"
  | "mapPin"
  | "check";

export interface IconProps {
  name: IconName;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, color, size = 22, strokeWidth = 1.75 }: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {SHAPES[name](common)}
    </Svg>
  );
}

type Common = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
  fill: string;
};

const SHAPES: Record<IconName, (p: Common) => React.ReactNode> = {
  home: (p) => <Path {...p} d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />,
  bag: (p) => (
    <>
      <Path {...p} d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <Path {...p} d="M3 6h18" />
      <Path {...p} d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  user: (p) => (
    <>
      <Circle {...p} cx={12} cy={8} r={4} />
      <Path {...p} d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </>
  ),
  search: (p) => (
    <>
      <Circle {...p} cx={11} cy={11} r={8} />
      <Path {...p} d="m21 21-4.3-4.3" />
    </>
  ),
  close: (p) => <Path {...p} d="M18 6 6 18M6 6l12 12" />,
  chevronLeft: (p) => <Path {...p} d="m15 18-6-6 6-6" />,
  chevronRight: (p) => <Path {...p} d="m9 18 6-6-6-6" />,
  plus: (p) => <Path {...p} d="M5 12h14M12 5v14" />,
  minus: (p) => <Path {...p} d="M5 12h14" />,
  trash: (p) => <Path {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  scanFace: (p) => (
    <>
      <Path
        {...p}
        d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
      />
      <Path {...p} d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Path {...p} d="M9 9h.01M15 9h.01" />
    </>
  ),
  fingerprint: (p) => (
    <>
      <Path {...p} d="M12 11v3a8 8 0 0 1-1.5 4.7" />
      <Path {...p} d="M8.5 7.6A5 5 0 0 1 17 11v1.5" />
      <Path {...p} d="M7 11a5 5 0 0 0 0 .5c0 2.3-.6 4.3-1.6 5.8" />
      <Path {...p} d="M15.5 15.5c-.3 1.7-.9 3.2-1.8 4.5" />
      <Path {...p} d="M4.5 8A9 9 0 0 1 21 12.5" />
    </>
  ),
  info: (p) => (
    <>
      <Circle {...p} cx={12} cy={12} r={9} />
      <Path {...p} d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
  download: (p) => <Path {...p} d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  camera: (p) => (
    <>
      <Path
        {...p}
        d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"
      />
      <Circle {...p} cx={12} cy={13} r={3} />
    </>
  ),
  check: (p) => <Path {...p} d="M20 6 9 17l-5-5" />,
  mapPin: (p) => (
    <>
      <Path {...p} d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12Z" />
      <Rect {...p} x={10} y={8} width={4} height={4} rx={2} />
    </>
  ),
};
