import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPosterUrl } from '../../services/media-api/helpers';
import { colors } from '../../theme/colors';
import { buildContinueWatchingHref } from './storage';
import type { ContinueWatchingRecord } from './types';

type Props = {
  record: ContinueWatchingRecord;
  onRemove: (record: ContinueWatchingRecord) => void;
};

export function ContinueWatchingCard({ record, onRemove }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(300, Math.max(250, width * 0.76));
  const posterUrl = getPosterUrl(record.posterPath);
  const hasProgress =
    record.positionSeconds !== undefined &&
    record.durationSeconds !== undefined &&
    record.durationSeconds > 0;
  const progress = hasProgress && record.positionSeconds !== undefined && record.durationSeconds !== undefined
    ? Math.min(1, record.positionSeconds / record.durationSeconds)
    : 0;

  return (
    <Pressable
      onPress={() => router.push(buildContinueWatchingHref(record) as never)}
      accessibilityRole="button"
      accessibilityLabel={`Resume ${record.title}`}
      style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.cardPressed]}
    >
      <View style={styles.posterWrap}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.posterFallback}>
            <Ionicons name="play" size={26} color={colors.accent.primary} />
          </View>
        )}
        <View style={styles.playBadge}>
          <Ionicons name="play" size={15} color={colors.bg.base} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{record.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {record.mediaType === 'tv' && record.season !== undefined && record.episode !== undefined
            ? `S${record.season} E${record.episode}${record.episodeName ? ` · ${record.episodeName}` : ''}`
            : record.mediaType === 'movie' ? 'Movie' : 'Series'}
        </Text>
        <Text style={styles.resumeText}>{hasProgress ? 'Resume' : 'Continue watching'}</Text>
        {hasProgress ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onRemove(record);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${record.title} from Continue Watching`}
        hitSlop={10}
        style={styles.removeButton}
      >
        <Ionicons name="close" size={16} color={colors.text.secondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 148,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.bg.surface,
  },
  cardPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }],
  },
  posterWrap: {
    width: 99,
    height: 148,
    backgroundColor: colors.bg.raised,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    paddingRight: 18,
  },
  meta: {
    color: colors.text.secondary,
    fontSize: 11,
    marginTop: 5,
  },
  resumeText: {
    color: colors.accent.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
  },
  progressTrack: {
    height: 3,
    marginTop: 8,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: colors.bg.elevated,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.accent.primary,
  },
  removeButton: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(13, 15, 18, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
