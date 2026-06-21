import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useFonts } from 'expo-font';
import { SymbolView } from 'expo-symbols';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import {
  BRAND_COLORS,
  BRAND_FONTS,
  BRAND_FONT_FAMILY,
  BRAND_TAB_LABEL_SELECTED_WEIGHT,
  BRAND_TAB_LABEL_WEIGHT,
} from '../src/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

const isIOS = process.env.EXPO_OS === 'ios';

type TabIconName = 'feed' | 'messages' | 'catalog';

const TAB_ICONS = {
  catalog: {
    default: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
    selected: {
      ios: 'bag.fill',
      android: 'shopping_bag',
      web: 'shopping_bag',
    },
  },
  feed: {
    default: {
      ios: 'rectangle.stack',
      android: 'dashboard',
      web: 'dashboard',
    },
    selected: {
      ios: 'rectangle.stack.fill',
      android: 'dashboard',
      web: 'dashboard',
    },
  },
  messages: {
    default: { ios: 'message', android: 'chat_bubble', web: 'chat_bubble' },
    selected: {
      ios: 'message.fill',
      android: 'chat_bubble',
      web: 'chat_bubble',
    },
  },
} as const;

function FluxListAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();

  return (
    <View
      style={[
        styles.accessory,
        placement === 'inline' ? styles.inlineAccessory : null,
      ]}
    >
      <Text style={styles.accessoryTitle}>FluxList</Text>
      {placement === 'inline' ? null : (
        <Text style={styles.accessoryLabel}>Example</Text>
      )}
    </View>
  );
}

function FluxListFloatingMark() {
  return (
    <View pointerEvents="none" style={styles.floatingMark}>
      <Text style={styles.accessoryTitle}>FluxList</Text>
      <Text style={styles.accessoryLabel}>Example</Text>
    </View>
  );
}

function TabBarIcon({
  color,
  focused,
  name,
}: {
  color: string;
  focused: boolean;
  name: TabIconName;
}) {
  return (
    <SymbolView
      name={focused ? TAB_ICONS[name].selected : TAB_ICONS[name].default}
      size={24}
      tintColor={color}
      weight="regular"
    />
  );
}

type TabBarIconRendererProps = {
  color: string;
  focused: boolean;
};

const renderFeedTabIcon = ({ color, focused }: TabBarIconRendererProps) => (
  <TabBarIcon color={color} focused={focused} name="feed" />
);

const renderMessagesTabIcon = ({ color, focused }: TabBarIconRendererProps) => (
  <TabBarIcon color={color} focused={focused} name="messages" />
);

const renderCatalogTabIcon = ({ color, focused }: TabBarIconRendererProps) => (
  <TabBarIcon color={color} focused={focused} name="catalog" />
);

export default function Layout() {
  const [fontsLoaded] = useFonts(BRAND_FONTS);

  if (!fontsLoaded) {
    return null;
  }

  const statusBar = (
    <StatusBar barStyle="dark-content" backgroundColor={BRAND_COLORS.surface} />
  );

  if (!isIOS) {
    return (
      <>
        {statusBar}
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: BRAND_COLORS.accent,
            tabBarInactiveTintColor: '#202124',
            tabBarLabelStyle: {
              fontFamily: BRAND_FONT_FAMILY,
              fontSize: 11,
              fontWeight: BRAND_TAB_LABEL_WEIGHT,
            },
            tabBarStyle: {
              backgroundColor: BRAND_COLORS.surface,
              borderTopColor: BRAND_COLORS.border,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Feed',
              tabBarIcon: renderFeedTabIcon,
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarIcon: renderMessagesTabIcon,
            }}
          />
          <Tabs.Screen
            name="catalog"
            options={{
              title: 'Catalog',
              tabBarIcon: renderCatalogTabIcon,
            }}
          />
        </Tabs>
        <FluxListFloatingMark />
      </>
    );
  }

  return (
    <>
      {statusBar}
      <NativeTabs
        blurEffect="systemMaterial"
        indicatorColor={BRAND_COLORS.accent}
        labelStyle={{
          default: {
            fontFamily: BRAND_FONT_FAMILY,
            fontSize: 11,
            fontWeight: BRAND_TAB_LABEL_WEIGHT,
          },
          selected: {
            color: BRAND_COLORS.accent,
            fontFamily: BRAND_FONT_FAMILY,
            fontSize: 11,
            fontWeight: BRAND_TAB_LABEL_SELECTED_WEIGHT,
          },
        }}
        minimizeBehavior="onScrollDown"
        rippleColor={BRAND_COLORS.accent}
        tintColor={BRAND_COLORS.accent}
      >
        <NativeTabs.BottomAccessory>
          <FluxListAccessory />
        </NativeTabs.BottomAccessory>

        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            md="dashboard"
            sf={{
              default: 'rectangle.stack',
              selected: 'rectangle.stack.fill',
            }}
          />
          <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="messages">
          <NativeTabs.Trigger.Icon
            md="chat_bubble"
            sf={{ default: 'message', selected: 'message.fill' }}
          />
          <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="catalog">
          <NativeTabs.Trigger.Icon
            md="shopping_bag"
            sf={{ default: 'bag', selected: 'bag.fill' }}
          />
          <NativeTabs.Trigger.Label>Catalog</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}

const styles = StyleSheet.create({
  accessory: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: BRAND_COLORS.border,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inlineAccessory: {
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  accessoryTitle: {
    color: BRAND_COLORS.foreground,
    fontFamily: BRAND_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
  },
  accessoryLabel: {
    color: BRAND_COLORS.muted,
    fontFamily: BRAND_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  floatingMark: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderColor: BRAND_COLORS.border,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 68,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
  },
});
