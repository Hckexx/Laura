import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/common/Header';
import { emitCowatchWithAck } from '../../src/services/cowatch/socket';
import {
  saveRoomIdentity,
  getActiveRoom,
  getPreviousRoomLocator,
  initCowatchStorage,
} from '../../src/services/cowatch/storage';
import { useQuery } from '@tanstack/react-query';
import { fetchMovieDetails, fetchTVDetails } from '../../src/services/media-api';
import type {
  CowatchMedia,
  CowatchResult,
  CowatchRoom,
} from '../../src/services/cowatch/types';
import { colors } from '../../src/theme/colors';

type CreateResult = CowatchResult<{
  room: CowatchRoom;
  participantId: string;
  reconnectToken: string;
}>;

export default function CowatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    season?: string;
    episode?: string;
  }>();

  const [displayName, setDisplayName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [roomLocator, setRoomLocator] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeLocator, setActiveLocator] = useState<string | null>(null);

  const hasPresetMedia = Boolean(params.id);
  const mediaIdNum = params.id ? Number(params.id) : undefined;
  const { data: presetMovie } = useQuery({
    queryKey: ['presetMovie', mediaIdNum],
    queryFn: () => fetchMovieDetails(mediaIdNum!),
    enabled: params.type !== 'tv' && !!mediaIdNum,
  });
  const { data: presetShow } = useQuery({
    queryKey: ['presetShow', mediaIdNum],
    queryFn: () => fetchTVDetails(mediaIdNum!),
    enabled: params.type === 'tv' && !!mediaIdNum,
  });

  const presetTitle = params.type === 'tv' ? presetShow?.name : presetMovie?.title;
  const seasonStr = params.season !== undefined && params.season !== '' ? params.season : 1;
  const episodeStr = params.episode !== undefined && params.episode !== '' ? params.episode : 1;

  useEffect(() => {
    initCowatchStorage().then(() => {
      const active = getActiveRoom();
      const prev = getPreviousRoomLocator();
      setActiveLocator(active?.locator || prev || null);
    });
  }, []);

  const handleCreateRoom = async () => {
    const name = displayName.trim();
    if (!name) {
      setError('Please enter your display name.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const parsedSeason =
        params.season !== undefined && params.season !== ''
          ? Number(params.season)
          : undefined;
      const parsedEpisode =
        params.episode !== undefined && params.episode !== ''
          ? Number(params.episode)
          : undefined;

      const initialMediaPayload: CowatchMedia | undefined = hasPresetMedia
        ? {
            type: params.type === 'tv' ? 'tv' : 'movie',
            id: Number(params.id),
            ...(params.type === 'tv'
              ? {
                  season:
                    parsedSeason !== undefined &&
                    Number.isInteger(parsedSeason) &&
                    parsedSeason >= 0
                      ? parsedSeason
                      : 1,
                  episode:
                    parsedEpisode !== undefined &&
                    Number.isInteger(parsedEpisode) &&
                    parsedEpisode > 0
                      ? parsedEpisode
                      : 1,
                }
              : {}),
            providerId: 'embedmaster',
          }
        : undefined;

      const trimmedSlug = customSlug.trim()
        ? customSlug.trim().toLowerCase()
        : undefined;

      const result = await emitCowatchWithAck<CreateResult>('room:create', {
        displayName: name,
        customSlug: trimmedSlug,
        initialMedia: initialMediaPayload,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      await saveRoomIdentity(result.room.code, {
        participantId: result.participantId,
        reconnectToken: result.reconnectToken,
        displayName: name,
      });

      router.push(`/room/${result.room.code}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to Cowatch server.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    const locator = roomLocator.trim();
    if (!locator) {
      setError('Please enter a room code or personal link slug.');
      return;
    }

    setError('');
    const cleaned = locator
      .replace(/^https?:\/\/[^/]+\//, '')
      .replace(/^\//, '')
      .replace(/^join\//, '')
      .replace(/^room\//, '')
      .trim();

    if (!cleaned) {
      setError('Invalid room link format.');
      return;
    }

    router.push(`/room/${cleaned}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Watch Together" showLogo={false} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Ambient Top Glow */}
        <View style={styles.ambientGlow} />

        {/* Header Hero */}
        <View style={styles.headerHero}>
          <View style={styles.badgeRow}>
            <View style={styles.badgePulse} />
            <Text style={styles.badgeText}>PRIVATE SYNCHRONIZED LOUNGE</Text>
          </View>
          <Text style={styles.heroTitle}>Watch Together</Text>
          <Text style={styles.heroBody}>
            Create an invitation-only screening session with synchronized playback, live mesh video/audio, and ephemeral room chat.
          </Text>
        </View>

        {/* Rejoin Banner if previous/active room exists */}
        {activeLocator && (
          <TouchableOpacity
            style={styles.rejoinBanner}
            onPress={() => router.push(`/room/${activeLocator}`)}
            activeOpacity={0.8}
          >
            <View style={styles.rejoinLeft}>
              <View style={styles.rejoinDot} />
              <View>
                <Text style={styles.rejoinTitle}>Rejoin Active Session</Text>
                <Text style={styles.rejoinSub}>Room: {activeLocator}</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.accent.primary} />
          </TouchableOpacity>
        )}

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={colors.status.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Host Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Host a New Screening</Text>
              <Text style={styles.cardSubtitle}>
                You will control stream playback and room permissions for guests.
              </Text>
            </View>
            <View style={styles.hostPill}>
              <Text style={styles.hostPillText}>HOST ACCESS</Text>
            </View>
          </View>

          {/* Display Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Your Display Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.text.faint}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Sara"
                placeholderTextColor={colors.text.faint}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={40}
              />
            </View>
          </View>

          {/* Custom Slug */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Custom Lounge Link <Text style={styles.labelMuted}>(optional)</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.slugPrefix}>/</Text>
              <TextInput
                style={styles.input}
                placeholder="saras-movie-den"
                placeholderTextColor={colors.text.faint}
                value={customSlug}
                onChangeText={(text) =>
                  setCustomSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                maxLength={50}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Selected Media Status */}
          <View style={styles.mediaSelectBox}>
            <Text style={styles.mediaSelectLabel}>SELECTED MEDIA TARGET</Text>
            {hasPresetMedia ? (
              <View style={styles.mediaSelectedRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.status.success} />
                <Text style={styles.mediaSelectedText}>
                  {params.type === 'tv'
                    ? presetTitle
                      ? `${presetTitle} (S${seasonStr} E${episodeStr})`
                      : `TV Episode selected (S${seasonStr} E${episodeStr})`
                    : presetTitle
                      ? `${presetTitle} (Movie)`
                      : 'Movie selected'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.chooseMediaButton}
                onPress={() => router.push('/(tabs)/movies')}
                activeOpacity={0.8}
              >
                <Ionicons name="film-outline" size={16} color={colors.accent.primary} />
                <Text style={styles.chooseMediaButtonText}>
                  Select title from Movies or TV Shows (optional)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.primaryButton, creating && styles.primaryButtonDisabled]}
            onPress={handleCreateRoom}
            disabled={creating}
            activeOpacity={0.85}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.bg.base} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Create Room &amp; Invite</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.bg.base} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Join Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join Existing Room</Text>
          <Text style={styles.cardSubtitle}>
            Enter a 6-character room code or personal link slug.
          </Text>

          <View style={[styles.fieldGroup, { marginTop: 12 }]}>
            <Text style={styles.label}>Room Code or Link Slug</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="key-outline"
                size={16}
                color={colors.text.faint}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. K7Q2MP or saras-movie-den"
                placeholderTextColor={colors.text.faint}
                value={roomLocator}
                onChangeText={setRoomLocator}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleJoinRoom}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Enter Room</Text>
          </TouchableOpacity>
        </View>

        {/* Guarantees Box */}
        <View style={styles.guaranteesCard}>
          <Text style={styles.guaranteesTitle}>LOUNGE ARCHITECTURE &amp; GUARANTEES</Text>
          <View style={styles.guaranteesList}>
            <View style={styles.guaranteeRow}>
              <Text style={styles.guaranteeEmoji}>⚡</Text>
              <Text style={styles.guaranteeText}>Real-time synchronized playback</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.guaranteeEmoji}>🎙️</Text>
              <Text style={styles.guaranteeText}>Live mesh voice &amp; video call</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.guaranteeEmoji}>💬</Text>
              <Text style={styles.guaranteeText}>Ephemeral chat alongside stream</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.guaranteeEmoji}>🔒</Text>
              <Text style={styles.guaranteeText}>No account or signup needed</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: -50,
    left: '15%',
    right: '15%',
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(229, 184, 105, 0.05)',
  },
  headerHero: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229, 184, 105, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 184, 105, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  badgePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
  },
  rejoinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent.muted,
    borderWidth: 1,
    borderColor: colors.accent.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  rejoinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rejoinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.success,
  },
  rejoinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  rejoinSub: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.status.error,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
    maxWidth: 220,
  },
  hostPill: {
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  hostPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 0.8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  labelMuted: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.text.faint,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  inputIcon: {
    marginRight: 8,
  },
  slugPrefix: {
    fontSize: 14,
    color: colors.text.faint,
    marginRight: 4,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  mediaSelectBox: {
    backgroundColor: colors.bg.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 6,
  },
  mediaSelectLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 1,
  },
  mediaSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaSelectedText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
  },
  chooseMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  chooseMediaButtonText: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.bg.base,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.medium,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  guaranteesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
    gap: 10,
  },
  guaranteesTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 1.2,
  },
  guaranteesList: {
    gap: 8,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guaranteeEmoji: {
    fontSize: 13,
  },
  guaranteeText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});
