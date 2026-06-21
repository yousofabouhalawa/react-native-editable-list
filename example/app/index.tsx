import { memo, useCallback } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FluxList } from 'react-native-fluxlist';

import { FEED_ITEMS, type FeedItem } from '../src/example-data';
import { BRAND_COLORS, brandHeadingText } from '../src/theme';

const POST_IMAGE_HEIGHT = 318;
const ROW_HEIGHT = 504;

const FEED_ACTION_ICONS = {
  comments: {
    android: 'chat_bubble_outline',
    ios: 'bubble.right',
    web: 'chat_bubble_outline',
  },
  likes: {
    android: 'favorite_border',
    ios: 'heart',
    web: 'favorite_border',
  },
  reposts: {
    android: 'sync_alt',
    ios: 'arrow.2.squarepath',
    web: 'sync_alt',
  },
  share: {
    android: 'share',
    ios: 'square.and.arrow.up',
    web: 'share',
  },
} as const;

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return value.toString();
};

function Metric({
  color = '#33363D',
  icon,
  value,
}: {
  color?: string;
  icon: 'likes' | 'comments' | 'reposts';
  value: number;
}) {
  return (
    <View style={styles.metric}>
      <SymbolView
        name={FEED_ACTION_ICONS[icon]}
        size={20}
        tintColor={color}
        weight="regular"
      />
      <Text style={[styles.metricText, { color }]}>{formatCount(value)}</Text>
    </View>
  );
}

const FeedRow = memo(function FeedRow({ item }: { item: FeedItem }) {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        <View style={styles.authorText}>
          <Text numberOfLines={1} style={styles.author}>
            {item.author}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {item.handle} · {item.subtitle}
          </Text>
        </View>
      </View>

      <Image
        resizeMode="cover"
        source={{ uri: item.imageUrl }}
        style={styles.postImage}
      />

      <View style={styles.postFooter}>
        <View style={styles.metrics}>
          <Metric color={BRAND_COLORS.accent} icon="likes" value={item.likes} />
          <Metric icon="comments" value={item.comments} />
          <Metric icon="reposts" value={item.reposts} />
          <SymbolView
            name={FEED_ACTION_ICONS.share}
            size={20}
            tintColor="#33363D"
            weight="regular"
          />
        </View>

        <Text numberOfLines={2} style={styles.caption}>
          <Text style={styles.captionAuthor}>{item.author}</Text>
          {'  '}
          {item.caption}
        </Text>
      </View>
    </View>
  );
});

export default function FeedScreen() {
  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => <FeedRow item={item} />,
    []
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BRAND_COLORS.surface}
      />
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
      </View>

      <FluxList
        data={FEED_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    ...brandHeadingText,
    color: BRAND_COLORS.foreground,
    fontSize: 28,
  },
  list: {
    flex: 1,
  },
  post: {
    backgroundColor: BRAND_COLORS.surface,
    borderBottomColor: '#E2E2E7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: ROW_HEIGHT,
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 66,
    paddingHorizontal: 16,
  },
  avatar: {
    borderRadius: 21,
    height: 42,
    width: 42,
  },
  authorText: {
    flex: 1,
    marginLeft: 11,
  },
  author: {
    color: BRAND_COLORS.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: '#6F737B',
    fontSize: 12,
    marginTop: 2,
  },
  postImage: {
    backgroundColor: '#E5E5EA',
    height: POST_IMAGE_HEIGHT,
    width: '100%',
  },
  postFooter: {
    gap: 8,
    height: ROW_HEIGHT - 66 - POST_IMAGE_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  metrics: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    height: 26,
  },
  metric: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  metricText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  caption: {
    color: '#242428',
    fontSize: 14,
    lineHeight: 19,
  },
  captionAuthor: {
    fontWeight: '600',
  },
});
