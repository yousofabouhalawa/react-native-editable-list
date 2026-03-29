import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  InteractionManager,
  StyleSheet,
  type GestureResponderEvent,
  View,
} from 'react-native';

import NativeEditableListView from './EditableListViewNativeComponent';

type NativePassthroughProps = Omit<
  React.ComponentProps<typeof NativeEditableListView>,
  'itemCount' | 'itemHeights' | 'rowItemIndices'
>;

type SwipeActionEvent = Parameters<
  NonNullable<
    React.ComponentProps<typeof NativeEditableListView>['onSwipeAction']
  >
>[0];

export type EditableListVirtualizationConfig = {
  enabled?: boolean;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
};

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
  virtualization?: EditableListVirtualizationConfig;
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
    virtualization,
    swipeActions,
    onSwipeAction,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    ...rest
  } = props;

  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchInteractionTaskRef = useRef<{ cancel: () => void } | null>(null);
  const interactionReleaseTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const touchMaxDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [renderedItemCount, setRenderedItemCount] = useState<number>(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const virtualizationEnabled = virtualization?.enabled === true;
  const initialNumToRender = Math.max(
    1,
    virtualization?.initialNumToRender ?? 24
  );
  const maxToRenderPerBatch = Math.max(
    1,
    virtualization?.maxToRenderPerBatch ?? 24
  );
  const updateCellsBatchingPeriod = Math.max(
    16,
    virtualization?.updateCellsBatchingPeriod ?? 48
  );
  const hasSwipeActions =
    (swipeActions?.leading?.length ?? 0) > 0 ||
    (swipeActions?.trailing?.length ?? 0) > 0;
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

  const totalCount = data?.length ?? 0;

  const clearInteractionReleaseTimeout = useCallback(() => {
    if (interactionReleaseTimeoutRef.current) {
      clearTimeout(interactionReleaseTimeoutRef.current);
      interactionReleaseTimeoutRef.current = null;
    }
  }, []);

  const scheduleInteractionRelease = useCallback(
    (delayMs: number) => {
      clearInteractionReleaseTimeout();
      interactionReleaseTimeoutRef.current = setTimeout(() => {
        setIsInteracting(false);
        interactionReleaseTimeoutRef.current = null;
      }, delayMs);
    },
    [clearInteractionReleaseTimeout]
  );

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      clearInteractionReleaseTimeout();
      setIsInteracting(true);
      touchStartPointRef.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      touchMaxDeltaRef.current = { dx: 0, dy: 0 };
      onTouchStart?.(event);
    },
    [clearInteractionReleaseTimeout, onTouchStart]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const start = touchStartPointRef.current;
      if (start) {
        const dx = Math.abs(event.nativeEvent.pageX - start.x);
        const dy = Math.abs(event.nativeEvent.pageY - start.y);
        touchMaxDeltaRef.current = {
          dx: Math.max(touchMaxDeltaRef.current.dx, dx),
          dy: Math.max(touchMaxDeltaRef.current.dy, dy),
        };
      }
      onTouchMove?.(event);
    },
    [onTouchMove]
  );

  const handleTouchEndLike = useCallback(
    (
      event: GestureResponderEvent,
      originalHandler?: (event: GestureResponderEvent) => void
    ) => {
      originalHandler?.(event);
      const { dx, dy } = touchMaxDeltaRef.current;
      const isHorizontalSwipe = dx > 10 && dx > dy * 1.2;
      const releaseDelay = isHorizontalSwipe && hasSwipeActions ? 12000 : 220;
      scheduleInteractionRelease(releaseDelay);
      touchStartPointRef.current = null;
      touchMaxDeltaRef.current = { dx: 0, dy: 0 };
    },
    [hasSwipeActions, scheduleInteractionRelease]
  );

  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      handleTouchEndLike(event, onTouchEnd);
    },
    [handleTouchEndLike, onTouchEnd]
  );

  const handleTouchCancel = useCallback(
    (event: GestureResponderEvent) => {
      handleTouchEndLike(event, onTouchCancel);
    },
    [handleTouchEndLike, onTouchCancel]
  );

  const handleSwipeAction = useCallback(
    (event: SwipeActionEvent) => {
      onSwipeAction?.(event);
      const actionKey = event.nativeEvent.actionKey?.toLowerCase() ?? '';
      const isDeleteAction = actionKey.includes('delete');
      scheduleInteractionRelease(isDeleteAction ? 900 : 80);
    },
    [onSwipeAction, scheduleInteractionRelease]
  );

  useEffect(() => {
    setRenderedItemCount((prev) => {
      if (!virtualizationEnabled) {
        return totalCount;
      }
      if (totalCount === 0) {
        return 0;
      }
      if (prev === 0) {
        return Math.min(initialNumToRender, totalCount);
      }
      return Math.min(prev, totalCount);
    });
  }, [totalCount, virtualizationEnabled, initialNumToRender, extraData]);

  useEffect(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    if (batchInteractionTaskRef.current) {
      batchInteractionTaskRef.current.cancel();
      batchInteractionTaskRef.current = null;
    }

    if (!virtualizationEnabled) {
      return;
    }

    if (renderedItemCount >= totalCount) {
      return;
    }

    if (isInteracting) {
      return;
    }

    batchInteractionTaskRef.current = InteractionManager.runAfterInteractions(
      () => {
        batchTimeoutRef.current = setTimeout(() => {
          setRenderedItemCount((prev) =>
            Math.min(prev + maxToRenderPerBatch, totalCount)
          );
          batchTimeoutRef.current = null;
        }, updateCellsBatchingPeriod);
      }
    );

    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      if (batchInteractionTaskRef.current) {
        batchInteractionTaskRef.current.cancel();
        batchInteractionTaskRef.current = null;
      }
    };
  }, [
    renderedItemCount,
    totalCount,
    virtualizationEnabled,
    isInteracting,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
  ]);

  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      if (batchInteractionTaskRef.current) {
        batchInteractionTaskRef.current.cancel();
        batchInteractionTaskRef.current = null;
      }
      if (interactionReleaseTimeoutRef.current) {
        clearTimeout(interactionReleaseTimeoutRef.current);
        interactionReleaseTimeoutRef.current = null;
      }
    };
  }, []);

  const { children, rowCount, rowItemIndices } = useMemo(() => {
    if (!data || data.length === 0) {
      return { children: null, rowCount: 0, rowItemIndices: [] as number[] };
    }

    const rowsData = virtualizationEnabled
      ? data.slice(0, Math.min(renderedItemCount, data.length))
      : data;

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

    rowsData.forEach((item, index) => {
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

      if (ItemSeparatorComponent && index < rowsData.length - 1) {
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
    virtualizationEnabled,
    renderedItemCount,
    updateItemHeight,
  ]);

  return (
    <NativeEditableListView
      {...rest}
      swipeActions={swipeActions}
      itemHeights={itemHeights}
      itemCount={rowCount}
      rowItemIndices={rowItemIndices}
      onSwipeAction={handleSwipeAction}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
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
