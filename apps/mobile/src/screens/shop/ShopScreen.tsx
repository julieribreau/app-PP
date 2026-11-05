import { router } from "expo-router";
import * as React from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState, Loading } from "@/components/layout/Screen";
import { ProductCard } from "@/components/shop/ProductCard";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { useCategories, useProducts } from "@/hooks/catalog/useCatalog";
import { useI18n } from "@/lib/i18n/useI18n";
import { productRoute } from "@/lib/routes";
import { useTheme } from "@/theme/useTheme";
import type { Category } from "@/types/api";

// Boutique (canvas BoutiqueMobile) : marque + recherche, titre, catégories en puces
// horizontales, grille de deux colonnes.

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function ShopScreen() {
  const { color } = useTheme();
  const { t } = useI18n();
  const [category, setCategory] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebounced(query);
  const categories = useCategories();
  const products = useProducts(category, debounced);

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: color.background }]}>
      <BrandBar
        searchOpen={searchOpen}
        onToggle={() => {
          if (searchOpen) setQuery("");
          setSearchOpen((open) => !open);
        }}
      />
      {products.isError && !products.data ? (
        <ErrorState onRetry={() => void products.refetch()} />
      ) : (
        <FlatList
          data={products.data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={
            <ShopHeader
              total={products.data?.total}
              searchOpen={searchOpen}
              query={query}
              onQuery={setQuery}
              categories={categories.data ?? []}
              category={category}
              onCategory={setCategory}
            />
          }
          ListEmptyComponent={
            products.isLoading ? <Loading /> : <EmptyState message={t.shop.empty} />
          }
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={products.isRefetching}
              onRefresh={() => void Promise.all([products.refetch(), categories.refetch()])}
              tintColor={color.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ProductCard product={item} onPress={() => router.push(productRoute(item.slug))} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BrandBar({ searchOpen, onToggle }: { searchOpen: boolean; onToggle: () => void }) {
  const { color } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.brandBar}>
      <AppText variant="h2" accessibilityRole="header">
        {t.common.appName}
      </AppText>
      <Pressable
        testID="shop-search-toggle"
        accessibilityRole="button"
        accessibilityLabel={searchOpen ? t.mobile.shop.closeSearch : t.mobile.shop.openSearch}
        accessibilityState={{ expanded: searchOpen }}
        onPress={onToggle}
        style={styles.iconButton}
      >
        <Icon name={searchOpen ? "close" : "search"} color={color.foreground} />
      </Pressable>
    </View>
  );
}

function ShopHeader(props: {
  total: number | undefined;
  searchOpen: boolean;
  query: string;
  onQuery: (q: string) => void;
  categories: Category[];
  category: string | null;
  onCategory: (slug: string | null) => void;
}) {
  const { color } = useTheme();
  const { t, f } = useI18n();
  return (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <AppText variant="display" accessibilityRole="header">
          {t.shop.title}
        </AppText>
        {props.total !== undefined ? (
          <AppText variant="help">{f(t.shop.count, { count: props.total })}</AppText>
        ) : null}
      </View>
      {props.searchOpen ? (
        <View style={[styles.search, { borderColor: color.input, backgroundColor: color.card }]}>
          <Icon name="search" color={color.mutedForeground} size={18} />
          <TextInput
            testID="shop-search-input"
            autoFocus
            value={props.query}
            onChangeText={props.onQuery}
            placeholder={t.shop.searchPlaceholder}
            placeholderTextColor={color.mutedForeground}
            accessibilityLabel={t.shop.searchLabel}
            returnKeyType="search"
            style={[styles.searchInput, { color: color.foreground }]}
          />
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel={t.shop.categories}
      >
        <Chip
          size="sm"
          role="radio"
          label={t.shop.all}
          selected={props.category === null}
          onPress={() => props.onCategory(null)}
        />
        {props.categories.map((c) => (
          <Chip
            key={c.id}
            size="sm"
            role="radio"
            label={c.name}
            selected={props.category === c.slug}
            onPress={() => props.onCategory(c.slug)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: { gap: 16, paddingTop: 8, paddingBottom: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 16, minHeight: 44 },
  chips: { gap: 8, paddingRight: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  column: { gap: 12 },
  cell: { flex: 1, marginBottom: 12 },
});
