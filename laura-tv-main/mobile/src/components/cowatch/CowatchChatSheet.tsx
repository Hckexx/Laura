import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CowatchMessage } from '../../services/cowatch/types';
import { colors } from '../../theme/colors';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  messages: CowatchMessage[];
  maxMessageLength?: number;
  onSendMessage: (text: string) => void;
  myParticipantId: string;
  isFullscreen?: boolean;
};

export function CowatchChatSheet({
  isOpen,
  onClose,
  messages,
  maxMessageLength = 500,
  onSendMessage,
  myParticipantId,
  isFullscreen = false,
}: Props) {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isLandscape = isFullscreen || windowWidth > windowHeight;

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isOpen, messages.length]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const renderMessageItem = ({ item }: { item: CowatchMessage }) => {
    const isSelf = item.senderId === myParticipantId;
    const timeStr = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <View
        style={[
          styles.messageRow,
          isSelf ? styles.messageRowSelf : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isSelf ? styles.messageBubbleSelf : styles.messageBubbleOther,
          ]}
        >
          {!isSelf && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTime}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          isLandscape ? styles.landscapeBackdrop : styles.portraitBackdrop,
        ]}
      >
        <TouchableOpacity
          style={styles.backdropDismiss}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.sheetContainer,
            isLandscape ? styles.landscapeSheetContainer : styles.portraitSheetContainer,
          ]}
        >
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent.primary} />
              <Text style={styles.sheetTitle}>Room Chat</Text>
              {messages.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.badgeText}>{messages.length}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbox-outline" size={28} color={colors.text.faint} />
                <Text style={styles.emptyText}>No messages yet.</Text>
                <Text style={styles.emptySubtext}>Say hi to everyone in the room!</Text>
              </View>
            }
          />

          {/* Input Bar */}
          <View style={styles.composerContainer}>
            <TextInput
              style={styles.input}
              placeholder="Send a message..."
              placeholderTextColor={colors.text.faint}
              value={inputText}
              onChangeText={setInputText}
              maxLength={maxMessageLength}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="send"
                size={14}
                color={inputText.trim() ? colors.bg.base : colors.text.faint}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  portraitBackdrop: {
    justifyContent: 'flex-end',
  },
  landscapeBackdrop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    position: 'absolute',
    inset: 0,
  },
  sheetContainer: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.medium,
    overflow: 'hidden',
    zIndex: 10,
  },
  portraitSheetContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    height: '62%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  landscapeSheetContainer: {
    width: 320,
    maxWidth: '42%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  sheetHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  countBadge: {
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  badgeText: {
    fontSize: 10,
    color: colors.accent.primary,
    fontWeight: '800',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.raised,
  },
  messagesContent: {
    padding: 10,
    gap: 6,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 4,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  emptySubtext: {
    fontSize: 10,
    color: colors.text.faint,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  messageRowSelf: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  messageBubbleSelf: {
    backgroundColor: colors.accent.primary,
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderBottomLeftRadius: 2,
  },
  senderName: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
  },
  messageText: {
    fontSize: 12,
    color: colors.text.primary,
    lineHeight: 16,
  },
  messageTime: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.45)',
    alignSelf: 'flex-end',
    marginTop: 1,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: 6,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.text.primary,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.bg.raised,
  },
});
