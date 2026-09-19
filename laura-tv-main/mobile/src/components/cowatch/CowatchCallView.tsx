import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import type { CowatchParticipant } from '../../services/cowatch/types';
import { colors } from '../../theme/colors';

type Props = {
  participants: CowatchParticipant[];
  myParticipantId: string;
  localStream?: MediaStream;
  remoteStreams: Record<string, MediaStream>;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  hideVideo?: boolean;
};

export function CowatchCallView({
  participants,
  myParticipantId,
  localStream,
  remoteStreams,
  microphoneEnabled,
  cameraEnabled,
  hideVideo = false,
}: Props) {
  // If user selected Hide Video, do not render tiles locally (WebRTC streams remain active in background)
  if (hideVideo) {
    return null;
  }

  // Only show participants who have joined the call (or have local media)
  const activeParticipants = participants.filter(
    (p) => p.call?.joined || p.id === myParticipantId,
  );

  if (activeParticipants.length === 0 && !microphoneEnabled && !cameraEnabled) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeParticipants.map((participant) => {
          const isSelf = participant.id === myParticipantId;
          const stream = isSelf ? localStream : remoteStreams[participant.id];
          
          // Check actual live video tracks on the stream
          const liveVideoTracks = stream ? stream.getVideoTracks().filter((t: any) => t.readyState !== 'ended') : [];
          const hasVideo = isSelf
            ? cameraEnabled && liveVideoTracks.length > 0
            : (participant.call?.cameraEnabled || liveVideoTracks.length > 0) && liveVideoTracks.length > 0;
            
          const isMicOn = isSelf ? microphoneEnabled : participant.call?.microphoneEnabled;

          if (__DEV__) {
            console.log(
              `[CowatchVideo] participant=${participant.id} name=${participant.name} videoTracks=${liveVideoTracks.length} hasVideo=${hasVideo} streamURL=${stream ? 'available' : 'none'}`,
            );
          }

          return (
            <View key={participant.id} style={styles.tile}>
              {hasVideo && stream ? (
                <RTCView
                  streamURL={stream.toURL()}
                  style={styles.video}
                  objectFit="cover"
                  mirror={isSelf}
                  zOrder={1}
                />
              ) : (
                <View style={styles.avatarTile}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {participant.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Name & Mic Status Bar */}
              <View style={styles.tileFooter}>
                <Text style={styles.tileName} numberOfLines={1}>
                  {participant.name} {isSelf && '(You)'}
                </Text>
                <View
                  style={[
                    styles.micBadge,
                    isMicOn ? styles.micBadgeOn : styles.micBadgeOff,
                  ]}
                >
                  <Ionicons
                    name={isMicOn ? 'mic' : 'mic-off'}
                    size={11}
                    color={isMicOn ? colors.bg.base : colors.text.faint}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tile: {
    width: 120,
    height: 85,
    borderRadius: 12,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  avatarTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.card,
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
  tileFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 2,
  },
  tileName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  micBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBadgeOn: {
    backgroundColor: colors.accent.primary,
  },
  micBadgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
