import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { getPosterUrl } from '../../services/media-api/helpers';
import { colors } from '../../theme/colors';
import type { WatchDiscoveryItem } from './category-service';

type Props = {
  item: WatchDiscoveryItem;
};

export function WatchPosterCard({ item }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(138, Math.max(112, width * 0.31));
  const title = item.title || item.name || 'Untitled';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const posterUrl = getPosterUrl(item.poster_path);

  return (
    <Pressable
      onPress={() => router.push(`/${item.media_type}/${item.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
    >
      <View style={styles.posterWrap}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" transition={180} />
        ) : null}
        {item.vote_average !== undefined && item.vote_average > 0 ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {item.vote_average.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.media_type === 'movie' ? 'Movie' : 'Series'}{year ? ` · ${year}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.975 }],
  },
  posterWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bg.raised,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(13, 15, 18, 0.88)',
  },
  ratingText: {
    color: colors.accent.light,
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  meta: {
    color: colors.text.faint,
    fontSize: 10,
    marginTop: 2,
  },
});
