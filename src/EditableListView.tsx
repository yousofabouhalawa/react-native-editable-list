import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import NativeEditableListView from './EditableListViewNativeComponent';

type NativePassthroughProps = Omit<
  React.ComponentProps<typeof NativeEditableListView>,
  'itemCount' | 'itemHeights' | 'rowItemIndices'
>;

type EditableListViewProps<ItemT> = {
  data?: ItemT[];
  renderItem?: (info: {
    item: ItemT;
    index: number;
    separators: {
      highlight: () => void;
      unhighlight: () => void;
      updateProps: () => void;
    };
  }) => React.ReactElement | null;
  keyExtractor?: (item: ItemT, index: number) => string;
  ListHeaderComponent?:
    | React.ReactElement
    | ((info: {}) => React.ReactElement | null)
    | null;
  ListFooterComponent?:
    | React.ReactElement
    | ((info: {}) => React.ReactElement | null)
    | null;
  ItemSeparatorComponent?:
    | React.ReactElement
    | ((info: { highlighted: boolean }) => React.ReactElement | null)
    | null;
  searchEnabled?: React.ComponentProps<
    typeof NativeEditableListView
  >['searchEnabled'];
  searchPlaceholder?: React.ComponentProps<
    typeof NativeEditableListView
  >['searchPlaceholder'];
  onSearchChange?: React.ComponentProps<
    typeof NativeEditableListView
  >['onSearchChange'];
  swipeActions?: React.ComponentProps<
    typeof NativeEditableListView
  >['swipeActions'];
  onSwipeAction?: React.ComponentProps<
    typeof NativeEditableListView
  >['onSwipeAction'];
  extraData?: unknown;
} & NativePassthroughProps;

const noopSeparators = {
  highlight() {},
  unhighlight() {},
  updateProps() {},
};

function normalizeComponent(
  component: EditableListViewProps<unknown>['ListHeaderComponent']
) {
  if (!component) {
    return null;
  }

  return typeof component === 'function' ? component({}) : component;
}

function EditableListView<ItemT>(props: EditableListViewProps<ItemT>) {
  const {
    data,
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListFooterComponent,
    ItemSeparatorComponent,
    extraData,
    ...rest
  } = props;

  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const updateItemHeight = useCallback((index: number, height: number) => {
    if (height <= 0) {
      return;
    }
    setItemHeights((prev) => {
      if (prev[index] === height) {
        return prev;
      }
      const next = prev.length > index ? prev.slice() : prev.slice();
      while (next.length < index) {
        next.push(-1);
      }
      if (next.length === index) {
        next.push(height);
        return next;
      }
      next[index] = height;
      return next;
    });
  }, []);

  useEffect(() => {
    setItemHeights([]);
  }, [
    data,
    ListHeaderComponent,
    ListFooterComponent,
    ItemSeparatorComponent,
    extraData,
  ]);

  const { children, rowCount, rowItemIndices } = useMemo(() => {
    if (!data) {
      return { children: null, rowCount: 0, rowItemIndices: [] as number[] };
    }

    const resolvedRenderItem =
      renderItem ??
      ((info: { item: ItemT }) =>
        React.isValidElement(info.item)
          ? (info.item as React.ReactElement)
          : null);

    const elements: React.ReactElement[] = [];
    const nextRowItemIndices: number[] = [];
    let rowIndex = 0;
    const header = normalizeComponent(ListHeaderComponent);
    if (header) {
      const index = rowIndex++;
      nextRowItemIndices.push(-1);
      elements.push(
        <View
          key="$header"
          style={styles.fullWidth}
          onLayout={(event) =>
            updateItemHeight(index, Math.ceil(event.nativeEvent.layout.height))
          }
          collapsable={false}
        >
          {header}
        </View>
      );
    }

    data.forEach((item, index) => {
      const element = resolvedRenderItem({
        item,
        index,
        separators: noopSeparators,
      });
      if (element) {
        const elementKey =
          keyExtractor?.(item, index) ??
          (typeof element.key === 'string' ? element.key : null) ??
          String(index);
        const rowSlot = rowIndex++;
        nextRowItemIndices.push(index);
        elements.push(
          <View
            key={elementKey}
            style={styles.fullWidth}
            onLayout={(event) =>
              updateItemHeight(
                rowSlot,
                Math.ceil(event.nativeEvent.layout.height)
              )
            }
            collapsable={false}
          >
            {element}
          </View>
        );
      }

      if (ItemSeparatorComponent && index < data.length - 1) {
        const separator =
          typeof ItemSeparatorComponent === 'function'
            ? ItemSeparatorComponent({ highlighted: false })
            : ItemSeparatorComponent;
        if (separator) {
          const rowSlot = rowIndex++;
          nextRowItemIndices.push(-1);
          elements.push(
            <View
              key={`$separator-${index}`}
              style={styles.fullWidth}
              onLayout={(event) =>
                updateItemHeight(
                  rowSlot,
                  Math.ceil(event.nativeEvent.layout.height)
                )
              }
              collapsable={false}
            >
              {separator}
            </View>
          );
        }
      }
    });

    const footer = normalizeComponent(ListFooterComponent);
    if (footer) {
      const index = rowIndex++;
      nextRowItemIndices.push(-1);
      elements.push(
        <View
          key="$footer"
          style={styles.fullWidth}
          onLayout={(event) =>
            updateItemHeight(index, Math.ceil(event.nativeEvent.layout.height))
          }
          collapsable={false}
        >
          {footer}
        </View>
      );
    }

    return {
      children: elements,
      rowCount: rowIndex,
      rowItemIndices: nextRowItemIndices,
    };
    // `extraData` is intentionally included to force row recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data,
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListFooterComponent,
    ItemSeparatorComponent,
    extraData,
    updateItemHeight,
  ]);

  return (
    <NativeEditableListView
      {...rest}
      itemHeights={itemHeights}
      itemCount={rowCount}
      rowItemIndices={rowItemIndices}
    >
      {children}
    </NativeEditableListView>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
});

export default EditableListView;
