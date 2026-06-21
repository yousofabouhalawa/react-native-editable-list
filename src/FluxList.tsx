import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  InteractionManager,
  Platform,
  StyleSheet,
  View,
  type ColorValue,
  type ViewProps,
} from 'react-native';

import NativeFluxListView from './FluxListViewNativeComponent';

type VisibleRangeEvent = Parameters<
  NonNullable<
    React.ComponentProps<typeof NativeFluxListView>['onVisibleRangeChange']
  >
>[0];

export type FluxListRenderItemInfo<ItemT> = {
  item: ItemT;
  index: number;
};

export type FluxListVirtualizationConfig = {
  enabled?: boolean;
  itemHeight?: number;
  estimatedItemHeight?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  windowSize?: number;
  overscan?: number;
  leadingOverscan?: number;
  trailingOverscan?: number;
};

export type FluxListSwipeAction = {
  key: string;
  title: string;
  color?: ColorValue;
  icon?: string;
  destructive?: boolean;
};

export type FluxListProps<ItemT> = Omit<ViewProps, 'children'> & {
  data?: readonly ItemT[];
  renderItem: (
    info: FluxListRenderItemInfo<ItemT>
  ) => React.ReactElement | null;
  keyExtractor?: (item: ItemT, index: number) => string;
  columns?: number;
  columnGap?: number;
  editing?: boolean;
  allowsMultipleSelectionDuringEditing?: boolean;
  selectionTintColor?: ColorValue;
  smoothTransitions?: boolean;
  selectedItemIndices?: readonly number[];
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  contextMenuActions?: readonly FluxListSwipeAction[];
  swipeActions?: {
    leading?: readonly FluxListSwipeAction[];
    trailing?: readonly FluxListSwipeAction[];
  };
  onSearchChange?: (query: string) => void;
  onSelectionChange?: (selectedIndices: number[]) => void;
  onSwipeAction?: (event: {
    actionKey: string;
    index: number;
    row: number;
    side: 'leading' | 'trailing';
  }) => void;
  onContextMenuAction?: (event: {
    actionKey: string;
    index: number;
    row: number;
  }) => void;
  virtualization?: boolean | FluxListVirtualizationConfig;
  extraData?: unknown;
};

function initialWindow(totalCount: number, initialNumToRender: number) {
  return {
    first: 0,
    last:
      totalCount === 0 ? -1 : Math.min(initialNumToRender - 1, totalCount - 1),
  };
}

function FluxList<ItemT>({
  data,
  renderItem,
  keyExtractor,
  columns = 1,
  columnGap = 0,
  style,
  onSearchChange,
  onSelectionChange,
  onSwipeAction,
  onContextMenuAction,
  virtualization = true,
  extraData,
  ...rest
}: FluxListProps<ItemT>) {
  const totalCount = data?.length ?? 0;
  const safeColumns = Number.isFinite(columns)
    ? Math.max(1, Math.floor(columns))
    : 1;
  const totalRowCount =
    totalCount === 0 ? 0 : Math.ceil(totalCount / safeColumns);
  const virtualizationConfig =
    typeof virtualization === 'object' ? virtualization : undefined;
  const virtualized =
    typeof virtualization === 'boolean'
      ? virtualization
      : virtualizationConfig?.enabled ?? true;
  const estimatedItemHeight = virtualizationConfig?.estimatedItemHeight ?? 72;
  const itemHeight = virtualizationConfig?.itemHeight;
  const initialNumToRender = virtualizationConfig?.initialNumToRender ?? 18;
  const maxToRenderPerBatch = virtualizationConfig?.maxToRenderPerBatch ?? 48;
  const updateCellsBatchingPeriod =
    virtualizationConfig?.updateCellsBatchingPeriod ?? 32;
  const windowSize = virtualizationConfig?.windowSize ?? 72;
  const safeInitialNumToRender = Math.max(1, initialNumToRender);
  const safeMaxToRenderPerBatch = Math.max(1, maxToRenderPerBatch);
  const safeUpdateCellsBatchingPeriod = Math.max(0, updateCellsBatchingPeriod);
  const safeWindowSize = Math.max(safeInitialNumToRender, windowSize);
  const safeInitialRowCount = Math.max(
    1,
    Math.ceil(safeInitialNumToRender / safeColumns)
  );
  const safeWindowRowCount = Math.max(
    safeInitialRowCount,
    Math.ceil(safeWindowSize / safeColumns)
  );
  const safeOverscan = Math.max(0, virtualizationConfig?.overscan ?? 24);
  const leadingOverscan = Math.max(
    0,
    Math.ceil(
      (virtualizationConfig?.leadingOverscan ?? safeOverscan) / safeColumns
    )
  );
  const trailingOverscan = Math.max(
    0,
    Math.ceil(
      (virtualizationConfig?.trailingOverscan ?? safeOverscan * 2) / safeColumns
    )
  );
  const safeEstimatedItemHeight = Math.max(1, estimatedItemHeight);
  const safeItemHeight =
    typeof itemHeight === 'number' && Number.isFinite(itemHeight)
      ? Math.max(1, itemHeight)
      : undefined;
  const safeColumnGap = Number.isFinite(columnGap) ? Math.max(0, columnGap) : 0;
  const [renderWindow, setRenderWindow] = useState(() =>
    initialWindow(
      totalRowCount,
      Math.max(safeInitialRowCount, safeWindowRowCount)
    )
  );
  const [renderedItemCount, setRenderedItemCount] = useState(() =>
    virtualized ? totalCount : Math.min(safeInitialNumToRender, totalCount)
  );
  const renderWindowRef = useRef(renderWindow);
  const lastVisibleRangeRef = useRef({ first: 0, last: -1 });
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchInteractionTaskRef = useRef<{ cancel: () => void } | null>(null);

  const setNextWindow = useCallback(
    (nextWindow: { first: number; last: number }) => {
      const currentWindow = renderWindowRef.current;
      if (
        currentWindow.first === nextWindow.first &&
        currentWindow.last === nextWindow.last
      ) {
        return;
      }
      renderWindowRef.current = nextWindow;
      setRenderWindow(nextWindow);
    },
    []
  );

  useEffect(() => {
    setNextWindow(
      initialWindow(
        totalRowCount,
        Math.max(safeInitialRowCount, safeWindowRowCount)
      )
    );
  }, [
    extraData,
    safeInitialRowCount,
    safeWindowRowCount,
    setNextWindow,
    totalRowCount,
  ]);

  useLayoutEffect(() => {
    setRenderedItemCount(
      virtualized ? totalCount : Math.min(safeInitialNumToRender, totalCount)
    );
  }, [extraData, safeInitialNumToRender, totalCount, virtualized]);

  useEffect(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    if (batchInteractionTaskRef.current) {
      batchInteractionTaskRef.current.cancel();
      batchInteractionTaskRef.current = null;
    }

    if (virtualized || renderedItemCount >= totalCount) {
      return;
    }

    batchInteractionTaskRef.current = InteractionManager.runAfterInteractions(
      () => {
        batchTimeoutRef.current = setTimeout(() => {
          setRenderedItemCount((current) =>
            Math.min(current + safeMaxToRenderPerBatch, totalCount)
          );
          batchTimeoutRef.current = null;
        }, safeUpdateCellsBatchingPeriod);
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
    safeMaxToRenderPerBatch,
    safeUpdateCellsBatchingPeriod,
    totalCount,
    virtualized,
  ]);

  const handleVisibleRangeChange = useCallback(
    (event: VisibleRangeEvent) => {
      if (!virtualized || totalRowCount === 0) {
        return;
      }

      const firstVisible = Math.max(0, event.nativeEvent.first);
      const lastVisible = Math.min(totalRowCount - 1, event.nativeEvent.last);
      if (lastVisible < firstVisible) {
        return;
      }

      const current = renderWindowRef.current;
      const previousVisibleRange = lastVisibleRangeRef.current;
      const isScrollingForward = firstVisible >= previousVisibleRange.first;
      lastVisibleRangeRef.current = { first: firstVisible, last: lastVisible };
      const before = isScrollingForward ? leadingOverscan : trailingOverscan;
      const after = isScrollingForward ? trailingOverscan : leadingOverscan;
      const thresholdBefore = Math.max(1, Math.floor(before * 0.35));
      const thresholdAfter = Math.max(1, Math.floor(after * 0.35));
      const hasBufferedVisibleRange =
        current.first >= 0 &&
        current.last >= current.first &&
        firstVisible >= current.first + thresholdBefore &&
        lastVisible <= current.last - thresholdAfter;

      if (hasBufferedVisibleRange) {
        return;
      }

      const visibleCount = lastVisible - firstVisible + 1;
      const targetCount = Math.min(
        totalRowCount,
        Math.max(safeWindowRowCount, visibleCount + before + after)
      );
      let first = Math.max(0, firstVisible - before);
      let last = Math.min(totalRowCount - 1, first + targetCount - 1);
      first = Math.max(0, last - targetCount + 1);
      if (first > current.first && last < current.last) {
        return;
      }
      const hasVisibleGap =
        current.first < 0 ||
        current.last < current.first ||
        firstVisible < current.first ||
        lastVisible > current.last;
      if (
        hasVisibleGap &&
        current.first >= 0 &&
        current.last >= current.first
      ) {
        first = Math.min(first, current.first);
        last = Math.max(last, current.last);
      }

      if (current.first !== first || current.last !== last) {
        setNextWindow({ first, last });
      }
    },
    [
      leadingOverscan,
      safeWindowRowCount,
      setNextWindow,
      totalRowCount,
      trailingOverscan,
      virtualized,
    ]
  );

  const handleSearchChange = useCallback(
    (
      event: Parameters<
        NonNullable<
          React.ComponentProps<typeof NativeFluxListView>['onSearchChange']
        >
      >[0]
    ) => {
      onSearchChange?.(event.nativeEvent.query);
    },
    [onSearchChange]
  );

  const handleSelectionChange = useCallback(
    (
      event: Parameters<
        NonNullable<
          React.ComponentProps<typeof NativeFluxListView>['onSelectionChange']
        >
      >[0]
    ) => {
      onSelectionChange?.([...event.nativeEvent.selectedIndices]);
    },
    [onSelectionChange]
  );

  const handleSwipeAction = useCallback(
    (
      event: Parameters<
        NonNullable<
          React.ComponentProps<typeof NativeFluxListView>['onSwipeAction']
        >
      >[0]
    ) => {
      onSwipeAction?.(event.nativeEvent);
    },
    [onSwipeAction]
  );

  const handleContextMenuAction = useCallback(
    (
      event: Parameters<
        NonNullable<
          React.ComponentProps<typeof NativeFluxListView>['onContextMenuAction']
        >
      >[0]
    ) => {
      onContextMenuAction?.(event.nativeEvent);
    },
    [onContextMenuAction]
  );

  const {
    children,
    itemHeights,
    itemSignature,
    mountedRowIndices,
    rowCount,
    rowItemIndices,
  } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        children: null,
        itemHeights: [] as number[],
        itemSignature: '',
        mountedRowIndices: [] as number[],
        rowCount: 0,
        rowItemIndices: [] as number[],
      };
    }

    const firstRow = virtualized ? renderWindow.first : 0;
    const lastRow = virtualized
      ? Math.min(renderWindow.last, totalRowCount - 1)
      : Math.ceil(Math.min(renderedItemCount, data.length) / safeColumns) - 1;
    const elements: React.ReactElement[] = [];
    const nextMountedRows: number[] = [];
    const nextItemHeights: number[] = [];
    const nextRowItemIndices: number[] = [];
    const nextItemKeys: string[] = [];

    for (let row = firstRow; row <= lastRow; row += 1) {
      const firstItemIndex = row * safeColumns;
      if (firstItemIndex >= data.length) {
        break;
      }

      if (safeColumns === 1) {
        const item = data[firstItemIndex] as ItemT;
        const element = renderItem({ item, index: firstItemIndex });
        if (!element) {
          continue;
        }

        const itemKey =
          keyExtractor?.(item, firstItemIndex) ?? String(firstItemIndex);
        nextMountedRows.push(row);
        if (safeItemHeight != null) {
          nextItemHeights.push(safeItemHeight);
        }
        nextRowItemIndices.push(firstItemIndex);
        nextItemKeys.push(itemKey);
        elements.push(
          <View
            collapsable={false}
            key={itemKey}
            nativeID={`fluxlist-item-${itemKey}`}
            style={
              safeItemHeight == null
                ? styles.row
                : [styles.row, { height: safeItemHeight }]
            }
            testID={`fluxlist-item-${itemKey}`}
          >
            {element}
          </View>
        );
        continue;
      }

      const cells: React.ReactElement[] = [];
      const firstItem = data[firstItemIndex] as ItemT;
      const rowKey =
        keyExtractor?.(firstItem, firstItemIndex) ?? String(firstItemIndex);
      const rowItemKeys: string[] = [];
      for (let column = 0; column < safeColumns; column += 1) {
        const index = firstItemIndex + column;
        const isLastColumn = column === safeColumns - 1;
        const cellStyle = [
          styles.gridCell,
          !isLastColumn && safeColumnGap > 0
            ? { marginRight: safeColumnGap }
            : null,
        ];

        if (index >= data.length) {
          cells.push(
            <View
              key={`empty-${row}-${column}`}
              pointerEvents="none"
              style={cellStyle}
            />
          );
          continue;
        }

        const item = data[index] as ItemT;
        const itemKey = keyExtractor?.(item, index) ?? String(index);
        rowItemKeys.push(itemKey);
        const element = renderItem({ item, index });
        cells.push(
          <View collapsable={false} key={itemKey} style={cellStyle}>
            {element}
          </View>
        );
      }

      nextMountedRows.push(row);
      if (safeItemHeight != null) {
        nextItemHeights.push(safeItemHeight);
      }
      nextRowItemIndices.push(firstItemIndex);
      const rowItemKey = rowItemKeys.join(',');
      nextItemKeys.push(rowItemKey);
      elements.push(
        <View
          collapsable={false}
          key={rowKey}
          nativeID={`fluxlist-item-${rowItemKey}`}
          style={
            safeItemHeight == null
              ? styles.gridRow
              : [styles.gridRow, { height: safeItemHeight }]
          }
          testID={`fluxlist-item-${rowItemKey}`}
        >
          {cells}
        </View>
      );
    }

    return {
      children: elements,
      itemHeights: nextItemHeights,
      itemSignature: `${firstRow}:${lastRow}:${nextItemKeys.join('|')}`,
      mountedRowIndices: nextMountedRows,
      rowCount: virtualized ? totalRowCount : elements.length,
      rowItemIndices: nextRowItemIndices,
    };
    // `extraData` is intentionally included to force row recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data,
    extraData,
    keyExtractor,
    renderedItemCount,
    renderItem,
    renderWindow,
    safeColumnGap,
    safeColumns,
    safeItemHeight,
    totalRowCount,
    virtualized,
  ]);

  return (
    <View
      collapsable={false}
      style={[
        Platform.OS === 'android' ? styles.androidContainer : null,
        style,
      ]}
    >
      <NativeFluxListView
        {...rest}
        estimatedItemHeight={safeEstimatedItemHeight}
        itemCount={rowCount}
        itemHeights={itemHeights}
        itemSignature={itemSignature}
        mountedRowIndices={mountedRowIndices}
        rowItemIndices={rowItemIndices}
        onSearchChange={handleSearchChange}
        onSelectionChange={handleSelectionChange}
        onContextMenuAction={handleContextMenuAction}
        onSwipeAction={handleSwipeAction}
        onVisibleRangeChange={handleVisibleRangeChange}
        style={StyleSheet.absoluteFill}
      >
        {children}
      </NativeFluxListView>
    </View>
  );
}

const styles = StyleSheet.create({
  androidContainer: {
    overflow: 'hidden',
  },
  row: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
  },
  gridCell: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
  },
});

export default FluxList;
