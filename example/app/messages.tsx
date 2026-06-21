import { memo, useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { FluxList, type FluxListSwipeAction } from 'react-native-fluxlist';

import { INITIAL_MESSAGES, type MessageItem } from '../src/example-data';
import { BRAND_COLORS, brandHeadingText } from '../src/theme';

const ROW_HEIGHT = 76;

const DELETE_ACTION = {
  key: 'delete',
  title: 'Delete',
  color: BRAND_COLORS.destructive as ColorValue,
  icon: 'trash',
  destructive: true,
};

const MARK_READ_ACTION = {
  key: 'mark-read',
  title: 'Read',
  color: '#8E8E93' as ColorValue,
  icon: 'envelope.open',
};

const CONTEXT_MENU_ACTIONS: FluxListSwipeAction[] = [
  {
    key: 'select',
    title: 'Select',
    icon: 'checkmark.circle',
  },
  MARK_READ_ACTION,
  DELETE_ACTION,
];

const MessageRow = memo(function MessageRow({ item }: { item: MessageItem }) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <View style={styles.messageBody}>
        <View style={styles.messageTopLine}>
          <Text numberOfLines={1} style={styles.sender}>
            {item.sender}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text numberOfLines={1} style={styles.preview}>
          {item.preview}
        </Text>
      </View>
      {item.unread ? <View style={styles.unreadDot} /> : null}
    </View>
  );
});

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return messages;
    }

    return messages.filter((message) =>
      `${message.sender} ${message.preview}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [messages, query]);

  const selectedItemIndices = useMemo(
    () =>
      filteredMessages.reduce<number[]>((indices, message, index) => {
        if (selectedIds.has(message.id)) {
          indices.push(index);
        }
        return indices;
      }, []),
    [filteredMessages, selectedIds]
  );

  const selectedFilteredCount = selectedItemIndices.length;
  const allFilteredSelected =
    filteredMessages.length > 0 &&
    selectedFilteredCount === filteredMessages.length;

  const renderItem = useCallback(
    ({ item }: { item: MessageItem }) => <MessageRow item={item} />,
    []
  );

  const listExtraData = useMemo(
    () => ({ editing, selectedItemIndices }),
    [editing, selectedItemIndices]
  );

  const toggleEditing = useCallback(() => {
    setEditing((current) => {
      if (current) {
        setSelectedIds(new Set());
      }
      return !current;
    });
  }, []);

  const handleSelectionChange = useCallback(
    (indices: number[]) => {
      if (indices.length > 0) {
        setEditing(true);
      }
      const nextSelectedIds = new Set<string>();
      indices.forEach((index) => {
        const message = filteredMessages[index];
        if (message) {
          nextSelectedIds.add(message.id);
        }
      });
      setSelectedIds(nextSelectedIds);
    },
    [filteredMessages]
  );

  const handleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(filteredMessages.map((message) => message.id)));
  }, [allFilteredSelected, filteredMessages]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }

    setMessages((current) =>
      current.filter((message) => !selectedIds.has(message.id))
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleSwipeAction = useCallback(
    ({ actionKey, index }: { actionKey: string; index: number }) => {
      const message = filteredMessages[index];
      if (!message) {
        return;
      }

      if (actionKey === 'mark-read') {
        if (!message.unread) {
          return;
        }
        setMessages((current) =>
          current.map((candidate) =>
            candidate.id === message.id
              ? { ...candidate, unread: false }
              : candidate
          )
        );
        return;
      }

      if (actionKey !== 'delete') {
        return;
      }

      setMessages((current) =>
        current.filter((candidate) => candidate.id !== message.id)
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(message.id);
        return next;
      });
    },
    [filteredMessages]
  );

  const handleContextMenuAction = useCallback(
    ({ actionKey, index }: { actionKey: string; index: number }) => {
      const message = filteredMessages[index];
      if (!message) {
        return;
      }

      if (actionKey === 'select') {
        setEditing(true);
        setSelectedIds(new Set([message.id]));
        return;
      }

      if (actionKey === 'mark-read') {
        setMessages((current) =>
          current.map((candidate) =>
            candidate.id === message.id
              ? { ...candidate, unread: false }
              : candidate
          )
        );
        return;
      }

      if (actionKey === 'delete') {
        setMessages((current) =>
          current.filter((candidate) => candidate.id !== message.id)
        );
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(message.id);
          return next;
        });
      }
    },
    [filteredMessages]
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Pressable onPress={toggleEditing} style={styles.doneButton}>
          <Text style={styles.doneButtonLabel}>
            {editing ? 'Done' : 'Edit'}
          </Text>
        </Pressable>
      </View>

      <FluxList
        allowsMultipleSelectionDuringEditing
        contextMenuActions={CONTEXT_MENU_ACTIONS}
        data={filteredMessages}
        editing={editing}
        extraData={listExtraData}
        keyExtractor={(item) => item.id}
        onSearchChange={setQuery}
        onSelectionChange={handleSelectionChange}
        onContextMenuAction={handleContextMenuAction}
        onSwipeAction={handleSwipeAction}
        renderItem={renderItem}
        searchEnabled
        searchPlaceholder="Search messages"
        selectionTintColor={BRAND_COLORS.accent}
        selectedItemIndices={selectedItemIndices}
        smoothTransitions
        style={styles.list}
        swipeActions={{
          leading: [MARK_READ_ACTION],
          trailing: [DELETE_ACTION],
        }}
        virtualization={{
          enabled: true,
          itemHeight: ROW_HEIGHT,
          estimatedItemHeight: ROW_HEIGHT,
        }}
      />

      {editing ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingActions,
            { bottom: Math.max(62, insets.bottom + 44) },
          ]}
        >
          <Pressable
            disabled={filteredMessages.length === 0}
            onPress={handleSelectAll}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
          <Pressable
            disabled={selectedIds.size === 0}
            onPress={handleDeleteSelected}
            style={[
              styles.deleteButton,
              selectedIds.size === 0 && styles.disabledButton,
            ]}
          >
            <Text style={styles.deleteButtonLabel}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
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
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    ...brandHeadingText,
    color: BRAND_COLORS.foreground,
    fontSize: 28,
  },
  floatingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    position: 'absolute',
    right: 18,
  },
  textButton: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderColor: '#D8D8DE',
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  textButtonLabel: {
    color: '#3A3A40',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderColor: BRAND_COLORS.destructive,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  deleteButtonLabel: {
    color: BRAND_COLORS.destructive,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.35,
  },
  doneButton: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderColor: '#D8D8DE',
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  doneButtonLabel: {
    color: '#3A3A40',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderBottomColor: '#ECECF1',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: ROW_HEIGHT,
    paddingHorizontal: 16,
  },
  avatar: {
    borderRadius: 25,
    height: 50,
    width: 50,
  },
  messageBody: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  messageTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sender: {
    color: BRAND_COLORS.foreground,
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  time: {
    color: '#8A8D95',
    fontSize: 12,
    marginLeft: 8,
  },
  preview: {
    color: '#636773',
    fontSize: 14,
    marginTop: 5,
  },
  unreadDot: {
    backgroundColor: BRAND_COLORS.accent,
    borderRadius: 4,
    height: 8,
    marginLeft: 10,
    width: 8,
  },
});
