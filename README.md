# react-native-fluxlist

A simple native-backed list for React Native with optional virtualization.

## Installation

```sh
npm install react-native-fluxlist
```

## Usage

```js
import { FluxList } from 'react-native-fluxlist';

<FluxList
  data={[{ id: '1', title: 'Row 1' }]}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.title}</Text>}
  virtualization={{
    itemHeight: 72,
    estimatedItemHeight: 72,
  }}
/>;
```

Use `columns` and `columnGap` for catalog-style grids:

```js
<FluxList
  data={products}
  columns={2}
  columnGap={12}
  keyExtractor={(product) => product.id}
  renderItem={({ item }) => <ProductCard product={item} />}
  virtualization={{
    itemHeight: 272,
    estimatedItemHeight: 272,
    initialNumToRender: 12,
    windowSize: 48,
    overscan: 16,
  }}
/>
```

Use `itemHeight` when rows have a fixed height. It gives the native table an
exact layout map, which keeps row spacing and swipe hit targets stable. When
`columns` is greater than `1`, `itemHeight` and `estimatedItemHeight` describe
one native row, not the total height of every product in that row.

Virtualization is enabled by default. Disable it when you want every item
mounted. Non-virtualized lists still mount in batches so large lists do not
block the first screen:

```js
<FluxList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Row item={item} />}
  virtualization={{
    enabled: false,
    itemHeight: 72,
    estimatedItemHeight: 72,
    initialNumToRender: 24,
    maxToRenderPerBatch: 64,
    updateCellsBatchingPeriod: 16,
  }}
/>
```

Tune the render window for fast scrolling:

```js
<FluxList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Row item={item} />}
  virtualization={{
    enabled: true,
    itemHeight: 72,
    estimatedItemHeight: 72,
    initialNumToRender: 24,
    maxToRenderPerBatch: 64,
    updateCellsBatchingPeriod: 16,
    windowSize: 96,
    overscan: 32,
    trailingOverscan: 96,
  }}
/>
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
