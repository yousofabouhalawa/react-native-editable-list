import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EditableListView } from 'react-native-editable-list';

type DemoKey = 'messages' | 'largeNoVirt' | 'largeVirt' | 'tasks';

type Message = {
  id: string;
  sender: string;
  preview: string;
  time: string;
  unread: boolean;
  pinned: boolean;
  selected: boolean;
};

type BigItem = {
  id: string;
  title: string;
  detail: string;
};

type TaskItem = {
  id: string;
  title: string;
  context: string;
  done: boolean;
  flagged: boolean;
};

const DEMOS: Array<{ key: DemoKey; label: string }> = [
  { key: 'messages', label: 'Messages' },
  { key: 'largeNoVirt', label: 'Large No Virt' },
  { key: 'largeVirt', label: 'Large Virt On' },
  { key: 'tasks', label: 'Tasks' },
];

const PEOPLE = [
  'Ava',
  'Liam',
  'Noah',
  'Mia',
  'Nora',
  'Alex',
  'Sam',
  'Mom',
  'Design Team',
  'Support',
  'Ops',
  'Product',
];

const PREVIEWS = [
  'Can we move dinner to 8? I got stuck at work.',
  'Updated mockups are ready for review.',
  'I booked the table for 7:30.',
  'Reminder: class starts in 30 minutes.',
  'Please review the release checklist.',
  'Call me when you leave the office.',
  'Build passed on CI, shipping now.',
  'Shared the latest notes in the channel.',
];

const TIMES = ['9:41 AM', '11:08 AM', 'Yesterday', 'Tue', 'Mon', 'Sun'];

function createMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, index) => {
    const sender = PEOPLE[index % PEOPLE.length];
    return {
      id: `msg-${index}`,
      sender,
      preview: PREVIEWS[index % PREVIEWS.length],
      time: TIMES[index % TIMES.length],
      unread: index % 3 === 0,
      pinned: index % 11 === 0,
      selected: false,
    };
  });
}

function createBigItems(prefix: string, count: number): BigItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    title: `Record ${index + 1}`,
    detail: `Synthetic row for performance checks #${index + 1}`,
  }));
}

function createTasks(count: number): TaskItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`,
    title: `Task ${index + 1}`,
    context: `Sprint ${Math.floor(index / 10) + 1} · Owner ${(index % 5) + 1}`,
    done: false,
    flagged: index % 7 === 0,
  }));
}

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.[0]?.toUpperCase();
  const second =
    parts.length > 1 ? parts[parts.length - 1]?.[0]?.toUpperCase() : '';
  return `${first ?? '?'}${second ?? ''}`;
}

export default function App() {
  const [activeDemo, setActiveDemo] = useState<DemoKey>('messages');
  const [messageQuery, setMessageQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>(() =>
    createMessages(220)
  );
  const [largeNoVirtItems, setLargeNoVirtItems] = useState<BigItem[]>(() =>
    createBigItems('no-virt', 2200)
  );
  const [largeVirtItems, setLargeVirtItems] = useState<BigItem[]>(() =>
    createBigItems('virt', 2200)
  );
  const [tasks, setTasks] = useState<TaskItem[]>(() => createTasks(300));

  const filteredMessages = useMemo(() => {
    const q = messageQuery.trim().toLowerCase();
    if (!q) {
      return messages;
    }
    return messages.filter((item) => {
      return (
        item.sender.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q)
      );
    });
  }, [messageQuery, messages]);

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    if (!q) {
      return tasks;
    }
    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(q) ||
        task.context.toLowerCase().includes(q)
      );
    });
  }, [taskQuery, tasks]);

  const renderMessagesDemo = () => {
    return (
      <EditableListView
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        searchEnabled
        searchPlaceholder="Search messages"
        onSearchChange={({ nativeEvent }) => setMessageQuery(nativeEvent.query)}
        swipeActions={{
          leading: [
            {
              key: 'togglePin',
              title: 'Pin',
              color: '#3A3A3C',
              icon: 'pin.fill',
            },
          ],
          trailing: [
            {
              key: 'toggleSelect',
              title: 'Select',
              color: '#8E8E93',
              icon: 'checkmark.circle.fill',
            },
            {
              key: 'delete',
              title: 'Delete',
              color: '#FF2D55',
              icon: 'trash.fill',
              destructive: true,
            },
          ],
        }}
        onSwipeAction={({ nativeEvent }) => {
          const row = nativeEvent.index;
          if (row < 0 || row >= filteredMessages.length) {
            return;
          }
          const target = filteredMessages[row];
          if (!target) {
            return;
          }
          if (nativeEvent.actionKey === 'delete') {
            setMessages((prev) => prev.filter((item) => item.id !== target.id));
            return;
          }
          setMessages((prev) =>
            prev.map((item) => {
              if (item.id !== target.id) {
                return item;
              }
              if (nativeEvent.actionKey === 'togglePin') {
                return { ...item, pinned: !item.pinned };
              }
              if (nativeEvent.actionKey === 'toggleSelect') {
                return { ...item, selected: !item.selected };
              }
              return item;
            })
          );
        }}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.sender)}</Text>
            </View>
            <View style={styles.messageMain}>
              <View style={styles.messageTopLine}>
                <Text
                  style={[
                    styles.messageName,
                    item.unread && styles.messageUnread,
                  ]}
                >
                  {item.sender}
                </Text>
                <Text style={styles.messageTime}>{item.time}</Text>
              </View>
              <Text style={styles.messagePreview} numberOfLines={1}>
                {item.pinned ? 'Pinned · ' : ''}
                {item.preview}
              </Text>
            </View>
            <View style={styles.messageMeta}>
              {item.unread ? <View style={styles.unreadDot} /> : null}
              {item.selected ? <View style={styles.selectedDot} /> : null}
            </View>
          </View>
        )}
        style={styles.list}
      />
    );
  };

  const renderLargeNoVirtualizationDemo = () => {
    return (
      <EditableListView
        data={largeNoVirtItems}
        keyExtractor={(item) => item.id}
        swipeActions={{
          trailing: [
            {
              key: 'delete',
              title: 'Delete',
              color: '#FF3B30',
              icon: 'trash.fill',
              destructive: true,
            },
          ],
        }}
        onSwipeAction={({ nativeEvent }) => {
          if (nativeEvent.actionKey !== 'delete') {
            return;
          }
          const target = largeNoVirtItems[nativeEvent.index];
          if (!target) {
            return;
          }
          setLargeNoVirtItems((prev) => {
            return prev.filter((item) => item.id !== target.id);
          });
        }}
        renderItem={({ item, index }) => (
          <View style={styles.bigRow}>
            <Text style={styles.bigTitle}>{item.title}</Text>
            <Text style={styles.bigDetail} numberOfLines={1}>
              {item.detail}
            </Text>
            <Text style={styles.bigTag}>Row {index + 1}</Text>
          </View>
        )}
        style={styles.list}
      />
    );
  };

  const renderLargeVirtualizationDemo = () => {
    return (
      <EditableListView
        data={largeVirtItems}
        keyExtractor={(item) => item.id}
        virtualization={{
          enabled: true,
          initialNumToRender: 24,
          maxToRenderPerBatch: 16,
          updateCellsBatchingPeriod: 72,
        }}
        swipeActions={{
          trailing: [
            {
              key: 'delete',
              title: 'Delete',
              color: '#FF3B30',
              icon: 'trash.fill',
              destructive: true,
            },
          ],
        }}
        onSwipeAction={({ nativeEvent }) => {
          if (nativeEvent.actionKey !== 'delete') {
            return;
          }
          const target = largeVirtItems[nativeEvent.index];
          if (!target) {
            return;
          }
          setLargeVirtItems((prev) => {
            return prev.filter((item) => item.id !== target.id);
          });
        }}
        renderItem={({ item, index }) => (
          <View style={styles.bigRow}>
            <Text style={styles.bigTitle}>{item.title}</Text>
            <Text style={styles.bigDetail} numberOfLines={1}>
              {item.detail}
            </Text>
            <Text style={styles.bigTag}>Row {index + 1}</Text>
          </View>
        )}
        style={styles.list}
      />
    );
  };

  const renderTasksDemo = () => {
    return (
      <EditableListView
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        searchEnabled
        searchPlaceholder="Search tasks"
        onSearchChange={({ nativeEvent }) => setTaskQuery(nativeEvent.query)}
        swipeActions={{
          leading: [
            {
              key: 'toggleFlag',
              title: 'Flag',
              color: '#FF9F0A',
              icon: 'flag.fill',
            },
          ],
          trailing: [
            {
              key: 'toggleDone',
              title: 'Done',
              color: '#30D158',
              icon: 'checkmark',
            },
            {
              key: 'delete',
              title: 'Delete',
              color: '#FF3B30',
              icon: 'trash.fill',
              destructive: true,
            },
          ],
        }}
        onSwipeAction={({ nativeEvent }) => {
          const row = nativeEvent.index;
          if (row < 0 || row >= filteredTasks.length) {
            return;
          }
          const target = filteredTasks[row];
          if (!target) {
            return;
          }
          if (nativeEvent.actionKey === 'delete') {
            setTasks((prev) => prev.filter((task) => task.id !== target.id));
            return;
          }
          setTasks((prev) =>
            prev.map((task) => {
              if (task.id !== target.id) {
                return task;
              }
              if (nativeEvent.actionKey === 'toggleDone') {
                return { ...task, done: !task.done };
              }
              if (nativeEvent.actionKey === 'toggleFlag') {
                return { ...task, flagged: !task.flagged };
              }
              return task;
            })
          );
        }}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <View style={[styles.taskStatus, item.done && styles.taskDone]} />
            <View style={styles.taskMain}>
              <Text
                style={[styles.taskTitle, item.done && styles.taskTitleDone]}
              >
                {item.title}
              </Text>
              <Text style={styles.taskContext}>{item.context}</Text>
            </View>
            {item.flagged ? <Text style={styles.taskFlag}>FLAG</Text> : null}
          </View>
        )}
        style={styles.list}
      />
    );
  };

  const activeInfo = useMemo(() => {
    if (activeDemo === 'messages') {
      return `Messages demo · ${filteredMessages.length} rows`;
    }
    if (activeDemo === 'largeNoVirt') {
      return `Large list demo (virtualization off) · ${largeNoVirtItems.length} rows`;
    }
    if (activeDemo === 'largeVirt') {
      return `Large list demo (virtualization on) · ${largeVirtItems.length} rows`;
    }
    return `Tasks demo · ${filteredTasks.length} rows`;
  }, [
    activeDemo,
    filteredMessages.length,
    largeNoVirtItems.length,
    largeVirtItems.length,
    filteredTasks.length,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EditableListView Examples</Text>
        <Text style={styles.subtitle}>{activeInfo}</Text>
      </View>

      <ScrollView
        horizontal
        style={styles.selectorScroll}
        contentContainerStyle={styles.selectorContent}
        showsHorizontalScrollIndicator={false}
      >
        {DEMOS.map((demo) => (
          <Pressable
            key={demo.key}
            onPress={() => setActiveDemo(demo.key)}
            style={[
              styles.selectorButton,
              activeDemo === demo.key && styles.selectorButtonActive,
            ]}
          >
            <Text
              style={[
                styles.selectorText,
                activeDemo === demo.key && styles.selectorTextActive,
              ]}
            >
              {demo.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {activeDemo === 'messages' && renderMessagesDemo()}
        {activeDemo === 'largeNoVirt' && renderLargeNoVirtualizationDemo()}
        {activeDemo === 'largeVirt' && renderLargeVirtualizationDemo()}
        {activeDemo === 'tasks' && renderTasksDemo()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6E6E73',
  },
  selectorScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    flexGrow: 0,
    flexShrink: 0,
  },
  selectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  selectorButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectorButtonActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  messageRow: {
    height: 82,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  messageMain: {
    flex: 1,
  },
  messageTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageName: {
    fontSize: 17,
    color: '#1C1C1E',
  },
  messageUnread: {
    fontWeight: '700',
  },
  messageTime: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#8E8E93',
  },
  messagePreview: {
    fontSize: 15,
    color: '#636366',
  },
  messageMeta: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#111111',
  },
  bigRow: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    backgroundColor: '#FFFFFF',
  },
  bigTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  bigDetail: {
    marginTop: 2,
    fontSize: 13,
    color: '#636366',
  },
  bigTag: {
    marginTop: 6,
    fontSize: 11,
    color: '#8E8E93',
  },
  taskRow: {
    height: 74,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#8E8E93',
  },
  taskDone: {
    borderColor: '#30D158',
    backgroundColor: '#30D158',
  },
  taskMain: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '600',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  taskContext: {
    marginTop: 2,
    fontSize: 13,
    color: '#6E6E73',
  },
  taskFlag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9F0A',
  },
});
