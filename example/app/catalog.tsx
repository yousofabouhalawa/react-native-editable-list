import { memo, useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FluxList } from 'react-native-fluxlist';

import { PRODUCTS, type ProductItem } from '../src/example-data';
import { BRAND_COLORS, brandHeadingText } from '../src/theme';

const CARD_HEIGHT = 306;
const ROW_HEIGHT = CARD_HEIGHT + 14;

const CATEGORY_COLORS: Record<string, string> = {
  Audio: '#2563EB',
  Bags: '#7C3AED',
  Computers: '#0F766E',
  Eyewear: '#B45309',
  Footwear: '#BE123C',
  Fragrance: '#9333EA',
  Furniture: '#475569',
  Home: '#0284C7',
  Kitchen: '#15803D',
  Lighting: '#CA8A04',
  Photography: '#DB2777',
  Stationery: '#4F46E5',
  Travel: '#0891B2',
  Watches: '#334155',
  Wearables: '#0369A1',
  Writing: '#7F1D1D',
};

const GRID_GUTTER = 14;
const CATALOG_ICONS = {
  rating: { android: 'star', ios: 'star.fill', web: 'star' },
  shipping: {
    android: 'local_shipping',
    ios: 'shippingbox',
    web: 'local_shipping',
  },
} as const;

const ProductCard = memo(function ProductCard({
  index,
  item,
}: {
  index: number;
  item: ProductItem;
}) {
  const accentColor = CATEGORY_COLORS[item.category] ?? BRAND_COLORS.accent;
  const isLeftColumn = index % 2 === 0;

  return (
    <View
      style={[styles.card, isLeftColumn ? styles.leftCard : styles.rightCard]}
    >
      <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <View style={[styles.categoryPill, { borderColor: accentColor }]}>
            <Text
              numberOfLines={1}
              style={[styles.category, { color: accentColor }]}
            >
              {item.category}
            </Text>
          </View>
          <View style={styles.ratingPill}>
            <SymbolView
              name={CATALOG_ICONS.rating}
              size={12}
              tintColor="#D97706"
              weight="regular"
            />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {item.description}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${item.price}</Text>
          <View style={styles.shipping}>
            <SymbolView
              name={CATALOG_ICONS.shipping}
              size={13}
              tintColor="#64748B"
              weight="regular"
            />
            <Text style={styles.shippingText}>Ready</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default function CatalogScreen() {
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return PRODUCTS;
    }

    return PRODUCTS.filter((product) =>
      `${product.name} ${product.category} ${product.description}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query]);

  const renderItem = useCallback(
    ({ index, item }: { index: number; item: ProductItem }) => (
      <ProductCard index={index} item={item} />
    ),
    []
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalog</Text>
      </View>

      <FluxList
        columnGap={0}
        columns={2}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        onSearchChange={setQuery}
        renderItem={renderItem}
        searchEnabled
        searchPlaceholder="Search products"
        style={styles.list}
        virtualization={{
          enabled: true,
          itemHeight: ROW_HEIGHT,
          estimatedItemHeight: ROW_HEIGHT,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  header: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderBottomColor: BRAND_COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    ...brandHeadingText,
    color: BRAND_COLORS.foreground,
    fontSize: 28,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    paddingTop: 14,
  },
  card: {
    backgroundColor: BRAND_COLORS.surface,
    borderColor: '#D8D8DE',
    borderWidth: StyleSheet.hairlineWidth,
    height: CARD_HEIGHT,
    marginBottom: 14,
    overflow: 'hidden',
  },
  leftCard: {
    marginLeft: GRID_GUTTER,
    marginRight: GRID_GUTTER / 2,
  },
  rightCard: {
    marginLeft: GRID_GUTTER / 2,
    marginRight: GRID_GUTTER,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  productImage: {
    backgroundColor: '#E5E5EA',
    height: 152,
    width: '100%',
  },
  cardBody: {
    flex: 1,
    gap: 7,
    padding: 10,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  categoryPill: {
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  name: {
    color: BRAND_COLORS.foreground,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 18,
  },
  description: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 16,
  },
  priceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  price: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  rating: {
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '600',
  },
  shipping: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  shippingText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});
