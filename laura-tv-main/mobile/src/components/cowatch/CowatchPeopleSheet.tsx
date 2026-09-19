import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CowatchParticipant } from '../../services/cowatch/types';
import { colors } from '../../theme/colors';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  participants: CowatchParticipant[];
  hostId: string;
  myParticipantId: string;
  onKickParticipant: (participantId: string) => void;
  onTransferHost: (participantId: string) => void;
};

export function CowatchPeopleSheet({
  isOpen,
  onClose,
  participants,
  hostId,
  myParticipantId,
  onKickParticipant,
  onTransferHost,
}: Props) {
  const isSelfHost = hostId === myParticipantId;

  const handleKickPress = (p: CowatchParticipant) => {
    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${p.name} from the room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onKickParticipant(p.id),
        },
      ],
    );
  };

  const handleTransferPress = (p: CowatchParticipant) => {
    Alert.alert(
      'Transfer Host',
      `Are you sure you want to transfer host controls to ${p.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: () => onTransferHost(p.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: CowatchParticipant }) => {
    const isHost = item.id === hostId;
    const isSelf = item.id === myParticipantId;
    const isMicOn = item.call?.microphoneEnabled;
    const isCamOn = item.call?.cameraEnabled;

    return (
      <View style={styles.participantCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {item.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.participantInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.participantName} numberOfLines={1}>
              {item.name} {isSelf && '(You)'}
            </Text>
            {isHost && (
              <View style={styles.hostBadge}>
                <Ionicons name="star" size={9} color={colors.accent.primary} />
                <Text style={styles.hostBadgeText}>HOST</Text>
              </View>
            )}
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.connectionDot,
                item.connected ? styles.dotConnected : styles.dotDisconnected,
              ]}
            />
            <Text style={styles.statusText}>
              {item.connected ? 'Connected' : 'Reconnecting...'}
            </Text>
          </View>
        </View>

        {/* Media indicators */}
        <View style={styles.mediaIcons}>
          <Ionicons
            name={isMicOn ? 'mic' : 'mic-off'}
            size={14}
            color={isMicOn ? colors.accent.primary : colors.text.faint}
          />
          <Ionicons
            name={isCamOn ? 'videocam' : 'videocam-off'}
            size={14}
            color={isCamOn ? colors.status.success : colors.text.faint}
          />
        </View>

        {/* Host controls */}
        {isSelfHost && !isSelf && (
          <View style={styles.hostActions}>
            <TouchableOpacity
              style={styles.transferBtn}
              onPress={() => handleTransferPress(item)}
              activeOpacity={0.7}
              accessibilityLabel={`Transfer host to ${item.name}`}
            >
              <Ionicons name="key-outline" size={14} color={colors.accent.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.kickBtn}
              onPress={() => handleKickPress(item)}
              activeOpacity={0.7}
              accessibilityLabel={`Remove ${item.name}`}
            >
              <Ionicons name="person-remove-outline" size={14} color={colors.status.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="people" size={18} color={colors.accent.primary} />
              <Text style={styles.sheetTitle}>In the Lounge</Text>
              <Text style={styles.badgeText}>({participants.length})</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={participants}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '60%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    backgroundColor: colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.medium,
    overflow: 'hidden',
  },
  sheetHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  badgeText: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.muted,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent.primary,
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  hostBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.accent.primary,
    letterSpacing: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotConnected: {
    backgroundColor: colors.status.success,
  },
  dotDisconnected: {
    backgroundColor: colors.status.error,
  },
  statusText: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  mediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  hostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.accent.muted,
  },
  kickBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
