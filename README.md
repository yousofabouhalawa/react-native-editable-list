# react-native-editable-list

A fully native editable list for React Native with selection mode, batch actions, and swipe quick actions, backed by UITableView and RecyclerView.

## Installation


```sh
npm install react-native-editable-list
```


## Usage


```js
import { EditableListView } from "react-native-editable-list";

// ...

<EditableListView
  data={[{ id: "1", title: "Row 1" }]}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.title}</Text>}
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
