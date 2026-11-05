import { Image } from "expo-image";
import * as React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { placeholderColors, placeholderKind, type BrandColor } from "@/lib/catalog/placeholder";
import { useTheme } from "@/theme/useTheme";

// Photo du produit, ou son visuel de remplacement (canvas validé) : barre, sachet ou pot sur
// fond `muted`. Le libellé accessible est fourni par l'appelant (nom du produit).

export interface ProductImageProps {
  imageUrl: string | null;
  slug: string;
  categorySlug?: string | null;
  accessibilityLabel: string;
  /** Largeur du dessin de remplacement, en part de la zone (0–1). */
  scale?: number;
  style?: ViewStyle;
  radius?: number;
}

export function ProductImage({
  imageUrl,
  slug,
  categorySlug,
  accessibilityLabel,
  scale = 0.75,
  style,
  radius = 0,
}: ProductImageProps) {
  const { color } = useTheme();
  const [failed, setFailed] = React.useState(false);
  const container = [styles.box, { backgroundColor: color.muted, borderRadius: radius }, style];

  if (imageUrl && !failed) {
    return (
      <View style={container} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} transition={150} />
      </View>
    );
  }

  const [main, top] = placeholderColors(slug);
  const fill = (c: BrandColor) => color[c];
  const kind = placeholderKind(categorySlug);
  return (
    <View style={container} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={`${scale * 100}%`} height="70%" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet">
        {kind === "bar" ? (
          <>
            <Rect x={14} y={28} width={132} height={38} rx={12} fill={fill(main)} />
            <Rect x={14} y={28} width={132} height={13} rx={6.5} fill={fill(top)} />
            <Circle cx={40} cy={52} r={4} fill={color.straw} />
            <Circle cx={72} cy={57} r={3} fill={color.straw} />
            <Circle cx={104} cy={50} r={4} fill={color.straw} />
            <Circle cx={128} cy={57} r={3} fill={color.straw} />
          </>
        ) : kind === "bag" ? (
          <>
            <Path d="M56 12h48l8 70H48Z" fill={fill(main)} />
            <Rect x={56} y={12} width={48} height={12} rx={3} fill={fill(top)} />
            <Rect x={64} y={40} width={32} height={20} rx={10} fill={color.card} />
          </>
        ) : (
          <>
            <Rect x={56} y={22} width={48} height={60} rx={10} fill={fill(main)} />
            <Rect x={52} y={10} width={56} height={16} rx={5} fill={fill(top)} />
            <Rect x={64} y={44} width={32} height={18} rx={9} fill={color.card} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
