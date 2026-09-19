import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { getPosterUrl } from '../../services/media-api/helpers';
import { colors } from '../../theme/colors';
import type { MediaType } from '../../types/media';

interface MediaCardProps {
  id: number;
  title: string;
  posterPath: string | null | undefined;
  mediaType: MediaType;
  rating?: number;
  year?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  id,
  title,
  posterPath,
  mediaType,
  rating,
  year,
}) => {
  const router = useRouter();
  const posterUrl = getPosterUrl(posterPath);

  const handlePress = () => {
    if (mediaType === 'movie') {
      router.push(`/movie/${id}`);
    } else {
      router.push(`/tv/${id}`);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.posterContainer}>
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterLogo}>
              LAURA<Text style={styles.noPosterRed}>TV</Text>
            </Text>
            <Text style={styles.noPosterSub}>No Poster</Text>
          </View>
        )}

        {/* Rating Badge */}
        {rating !== undefined && rating > 0 && (
          <View style={styles.ratingBadge}>
            <Text style={styles.starText}>★</Text>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Media Type Tag */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{mediaType === 'movie' ? 'Film' : 'Series'}</Text>
        </View>

        {/* Bottom Dark Gradient Info */}
        <View style={styles.bottomOverlay}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.year}>{year || '—'}</Text>
            <Text style={styles.watchHint}>View →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.bg.surface,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.raised,
    padding: 12,
  },
  noPosterLogo: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  noPosterRed: {
    color: colors.brand.red,
  },
  noPosterSub: {
    fontSize: 10,
    color: colors.text.faint,
    marginTop: 4,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 12, 16, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 3,
  },
  starText: {
    fontSize: 10,
    color: colors.accent.primary,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(10, 12, 16, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(10, 12, 16, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  year: {
    fontSize: 10,
    color: colors.text.faint,
  },
  watchHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent.primary,
  },
});
