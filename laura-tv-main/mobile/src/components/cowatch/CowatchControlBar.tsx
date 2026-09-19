import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { providers } from '../../services/media-api/providers';
import type { ProviderId } from '../../types/provider';
import { colors } from '../../theme/colors';

type Props = {
  isPlaying: boolean;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  activeProviderId?: ProviderId;
  unreadChatCount: number;
  participantCount: number;
  isFullscreen: boolean;
  hideVideo?: boolean;
  onToggleHideVideo?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onResync: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onChangeProvider: (providerId: ProviderId) => void;
  onOpenChat: () => void;
  onOpenPeople: () => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onLeave: () => void;
};

export function CowatchControlBar({
  isPlaying,
  microphoneEnabled,
  cameraEnabled,
  activeProviderId = 'embedmaster',
  unreadChatCount,
  participantCount,
  isFullscreen,
  hideVideo = false,
  onToggleHideVideo,
  onPlay,
  onPause,
  onResync,
  onToggleMic,
  onToggleCam,
  onChangeProvider,
  onOpenChat,
  onOpenPeople,
  onToggleFullscreen,
  onShare,
  onLeave,
}: Props) {
  const [showProviderModal, setShowProviderModal] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 6 : 10;

  const currentProvider = providers.find((p) => p.id === activeProviderId) || providers[0];

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* 1. Play / Pause */}
        <TouchableOpacity
          style={[styles.btn, isPlaying ? styles.btnPlaying : styles.btnPaused]}
          onPress={isPlaying ? onPause : onPlay}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? colors.text.primary : colors.bg.base}
          />
          <Text style={[styles.btnText, !isPlaying && styles.btnTextDark]}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>

        {/* 2. Resync Recovery Action */}
        <TouchableOpacity
          style={[styles.btn, styles.btnResync]}
          onPress={onResync}
          activeOpacity={0.7}
        >
          <Ionicons name="sync-outline" size={16} color={colors.accent.primary} />
          <Text style={styles.btnResyncText}>Resync</Text>
        </TouchableOpacity>

        {/* 3. Speak / Mic */}
        <TouchableOpacity
          style={[styles.btn, microphoneEnabled ? styles.btnActive : styles.btnInactive]}
          onPress={onToggleMic}
          activeOpacity={0.7}
        >
          <Ionicons
            name={microphoneEnabled ? 'mic' : 'mic-off'}
            size={16}
            color={microphoneEnabled ? colors.bg.base : colors.text.primary}
          />
          <Text
            style={[styles.btnText, microphoneEnabled && styles.btnTextDark]}
          >
            {microphoneEnabled ? 'Mute' : 'Speak'}
          </Text>
        </TouchableOpacity>

        {/* 4. Camera */}
        <TouchableOpacity
          style={[styles.btn, cameraEnabled ? styles.btnActive : styles.btnInactive]}
          onPress={onToggleCam}
          activeOpacity={0.7}
        >
          <Ionicons
            name={cameraEnabled ? 'videocam' : 'videocam-off'}
            size={16}
            color={cameraEnabled ? colors.bg.base : colors.text.primary}
          />
          <Text style={[styles.btnText, cameraEnabled && styles.btnTextDark]}>
            {cameraEnabled ? 'Cam Off' : 'Cam On'}
          </Text>
        </TouchableOpacity>

        {/* 5. Hide / Show Video Tiles (Presentation-only toggle) */}
        {onToggleHideVideo && (
          <TouchableOpacity
            style={[styles.btn, hideVideo ? styles.btnInactive : styles.btnActive]}
            onPress={onToggleHideVideo}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hideVideo ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={hideVideo ? colors.text.primary : colors.bg.base}
            />
            <Text style={[styles.btnText, !hideVideo && styles.btnTextDark]}>
              {hideVideo ? 'Show Video' : 'Hide Video'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 6. Provider Selector Pill */}
        <TouchableOpacity
          style={styles.providerPill}
          onPress={() => setShowProviderModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="server-outline" size={14} color={colors.accent.primary} />
          <Text style={styles.providerPillText}>{currentProvider.name}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.text.faint} />
        </TouchableOpacity>

        {/* 7. Chat Drawer */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenChat}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text.primary} />
          {unreadChatCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadChatCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 8. People Drawer */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onOpenPeople}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={18} color={colors.text.primary} />
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{participantCount}</Text>
          </View>
        </TouchableOpacity>

        {/* 9. Fullscreen Toggle */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onToggleFullscreen}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFullscreen ? 'contract-outline' : 'expand-outline'}
            size={18}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        {/* 10. Share / Invite */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.accent.primary} />
        </TouchableOpacity>

        {/* 11. Leave */}
        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={onLeave}
          activeOpacity={0.7}
        >
          <Ionicons name="exit-outline" size={16} color={colors.status.error} />
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Provider Switcher Modal */}
      <Modal
        visible={showProviderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProviderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowProviderModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Streaming Mirror</Text>
            <Text style={styles.modalSubtitle}>
              Switches playback mirror for everyone in the room.
            </Text>

            <View style={styles.providerGrid}>
              {providers.map((p) => {
                const isSelected = p.id === activeProviderId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.providerItem,
                      isSelected && styles.providerItemActive,
                    ]}
                    onPress={() => {
                      onChangeProvider(p.id);
                      setShowProviderModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.providerItemText,
                        isSelected && styles.providerItemTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.bg.base}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
    paddingTop: 10,
  },
  row: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnPaused: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  btnPlaying: {
    backgroundColor: colors.bg.raised,
    borderColor: colors.border.medium,
  },
  btnResync: {
    backgroundColor: colors.bg.raised,
    borderColor: 'rgba(229, 184, 105, 0.45)',
  },
  btnResyncText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  btnActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  btnInactive: {
    backgroundColor: colors.bg.raised,
    borderColor: colors.border.medium,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  btnTextDark: {
    color: colors.bg.base,
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.medium,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  providerPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.brand.red,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accent.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.bg.base,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  leaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.status.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: 20,
    gap: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  providerGrid: {
    gap: 6,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  providerItemActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  providerItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  providerItemTextActive: {
    color: colors.bg.base,
  },
});
