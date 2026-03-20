import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EditableListView } from 'react-native-editable-list';

type Message = {
  id: string;
  sender: string;
  preview: string;
  time: string;
  unread: boolean;
  selected: boolean;
  pinned: boolean;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    sender: 'Ava',
    preview: 'Can we move dinner to 8? I got stuck at work.',
    time: '9:41 AM',
    unread: true,
    selected: false,
    pinned: true,
  },
  {
    id: 'm2',
    sender: 'Mom',
    preview: 'Call me when you leave the office.',
    time: 'Yesterday',
    unread: false,
    selected: false,
    pinned: false,
  },
  {
    id: 'm3',
    sender: 'Design Team',
    preview: 'Updated mockups are in the shared folder.',
    time: 'Tue',
    unread: true,
    selected: false,
    pinned: false,
  },
  {
    id: 'm4',
    sender: 'Sam',
    preview: 'I booked the table for 7:30.',
    time: 'Mon',
    unread: false,
    selected: false,
    pinned: false,
  },
  {
    id: 'm5',
    sender: 'Gym',
    preview: 'Reminder: class starts in 30 minutes.',
    time: 'Sun',
    unread: true,
    selected: false,
    pinned: false,
  },
  {
    id: 'm6',
    sender: 'Nora',
    preview: 'The photos came out great, sending now.',
    time: 'Sat',
    unread: false,
    selected: false,
    pinned: false,
  },
  {
    id: 'm7',
    sender: 'Alex',
    preview: 'Let me know if you need anything from the store.',
    time: 'Fri',
    unread: true,
    selected: false,
    pinned: false,
  },
];

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const firstInitial = parts[0]?.[0]?.toUpperCase();
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return firstInitial ?? '?';
  }
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();
  if (!firstInitial && !lastInitial) {
    return '?';
  }
  return `${firstInitial ?? ''}${lastInitial ?? ''}`;
}

export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [query, setQuery] = useState('');
  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return messages;
    }
    return messages.filter((message) => {
      return (
        message.sender.toLowerCase().includes(normalizedQuery) ||
        message.preview.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [messages, query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <EditableListView
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        searchEnabled
        searchPlaceholder="Search"
        onSearchChange={({ nativeEvent }) => {
          setQuery(nativeEvent.query);
        }}
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
              color: '#1C1C1E',
              icon: 'trash.fill',
              destructive: true,
            },
          ],
        }}
        onSwipeAction={({ nativeEvent }) => {
          setMessages((prev) => {
            if (
              nativeEvent.index < 0 ||
              nativeEvent.index >= filteredMessages.length
            ) {
              return prev;
            }
            const targetMessage = filteredMessages[nativeEvent.index];
            if (!targetMessage) {
              return prev;
            }

            if (nativeEvent.actionKey === 'delete') {
              return prev.filter((message) => message.id !== targetMessage.id);
            }

            return prev.map((message) => {
              if (message.id !== targetMessage.id) {
                return message;
              }
              if (nativeEvent.actionKey === 'togglePin') {
                return { ...message, pinned: !message.pinned };
              }
              if (nativeEvent.actionKey === 'toggleSelect') {
                return { ...message, selected: !message.selected };
              }
              return message;
            });
          });
        }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(item.sender)}</Text>
            </View>
            <View style={styles.main}>
              <View style={styles.topLine}>
                <Text
                  style={[styles.name, item.unread ? styles.unreadName : null]}
                >
                  {item.sender}
                </Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.pinned ? 'Pinned · ' : ''}
                {item.preview}
              </Text>
            </View>
            <View style={styles.meta}>
              {item.unread ? <View style={styles.unreadDot} /> : null}
              {item.selected ? <View style={styles.selectedMark} /> : null}
            </View>
          </View>
        )}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  list: {
    flex: 1,
  },
  row: {
    height: 82,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    flexDirection: 'row',
    alignItems: 'center',
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
  main: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    color: '#1C1C1E',
  },
  unreadName: {
    fontWeight: '700',
  },
  time: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#8E8E93',
  },
  preview: {
    fontSize: 15,
    color: '#636366',
  },
  meta: {
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
    backgroundColor: '#000000',
  },
  selectedMark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
  },
});
