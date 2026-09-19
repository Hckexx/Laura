import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/common/Header';
import { WatchlistButton } from '../../src/components/media/WatchlistButton';
import { MediaCard } from '../../src/components/media/MediaCard';
import { Skeleton } from '../../src/components/common/Skeleton';
import { ErrorState } from '../../src/components/common/ErrorState';
import {
  fetchMovieDetails,
  fetchMovieCredits,
  fetchSimilarMovies,
  fetchMovieVideos,
  getBackdropUrl,
  getPosterUrl,
  getProfileUrl,
  getTrailerKey,
} from '../../src/services/media-api';
import { colors } from '../../src/theme/colors';

export default function MovieDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);

  const {
    data: movie,
    isLoading: movieLoading,
    isError: movieError,
    refetch: refetchMovie,
  } = useQuery({
    queryKey: ['movieDetails', movieId],
    queryFn: () => fetchMovieDetails(movieId),
    enabled: !!movieId,
  });

  const { data: credits } = useQuery({
    queryKey: ['movieCredits', movieId],
    queryFn: () => fetchMovieCredits(movieId),
    enabled: !!movieId,
  });

  const { data: similar = [] } = useQuery({
    queryKey: ['similarMovies', movieId],
    queryFn: () => fetchSimilarMovies(movieId),
    enabled: !!movieId,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['movieVideos', movieId],
    queryFn: () => fetchMovieVideos(movieId),
    enabled: !!movieId,
  });

  if (movieLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header showBack={true} />
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <Skeleton width="100%" height={260} borderRadius={0} />
          <View style={styles.loadingContent}>
            <Skeleton width="70%" height={24} borderRadius={6} />
            <Skeleton width="40%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={80} borderRadius={8} style={{ marginTop: 16 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (movieError || !movie) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header showBack={true} />
        <ErrorState
          title="Movie Not Found"
          message="Unable to retrieve details for this movie."
          onRetry={refetchMovie}
        />
      </SafeAreaView>
    );
  }

  const backdropUrl = getBackdropUrl(movie.backdrop_path);
  const posterUrl = getPosterUrl(movie.poster_path);
  const cast = credits?.cast?.slice(0, 12) || [];
  const trailerKey = getTrailerKey(videos);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header showBack={true} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Backdrop & Hero */}
        <View style={styles.heroWrapper}>
          {backdropUrl ? (
            <Image
              source={{ uri: backdropUrl }}
              style={styles.backdropImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noBackdrop} />
          )}
          <View style={styles.backdropGradient} />

          {/* Floating Poster & Info Header */}
          <View style={styles.heroContent}>
            {posterUrl && (
              <Image
                source={{ uri: posterUrl }}
                style={styles.posterThumb}
                resizeMode="cover"
              />
            )}
            <View style={styles.heroMeta}>
              <Text style={styles.title} numberOfLines={2}>
                {movie.title}
              </Text>
              {movie.tagline ? (
                <Text style={styles.tagline} numberOfLines={2}>
                  "{movie.tagline}"
                </Text>
              ) : null}

              {/* Badges Row */}
              <View style={styles.badgesRow}>
                {movie.vote_average > 0 && (
                  <View style={styles.ratingPill}>
                    <Text style={styles.starText}>★</Text>
                    <Text style={styles.ratingText}>{movie.vote_average.toFixed(1)}</Text>
                  </View>
                )}
                {movie.release_date && (
                  <Text style={styles.metaYear}>{movie.release_date.slice(0, 4)}</Text>
                )}
                {movie.runtime > 0 && (
                  <Text style={styles.metaRuntime}>
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.map((genre) => (
              <View key={genre.id} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{genre.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.watchNowButton}
            onPress={() => router.push(`/watch/${movie.id}?type=movie`)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={18} color={colors.bg.base} />
            <Text style={styles.watchNowText}>Watch Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.watchTogetherButton}
            onPress={() => router.push(`/cowatch?type=movie&id=${movie.id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={18} color={colors.accent.primary} />
            <Text style={styles.watchTogetherText}>Watch Together</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <View style={{ flex: 1 }}>
              <WatchlistButton
                id={movie.id}
                mediaType="movie"
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                year={movie.release_date?.slice(0, 4)}
              />
            </View>

            {trailerKey && (
              <TouchableOpacity
                style={styles.trailerButton}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-youtube" size={16} color="#ef4444" />
                <Text style={styles.trailerText}>Trailer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Synopsis / Overview */}
        {movie.overview ? (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionHeading}>SYNOPSIS</Text>
            <Text style={styles.overviewText}>{movie.overview}</Text>
          </View>
        ) : null}

        {/* Featured Cast */}
        {cast.length > 0 && (
          <View style={styles.castSection}>
            <Text style={styles.sectionHeading}>FEATURED CAST</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.castList}
            >
              {cast.map((person) => {
                const profileUrl = getProfileUrl(person.profile_path);
                return (
                  <View key={person.id} style={styles.castCard}>
                    <View style={styles.castImageContainer}>
                      {profileUrl ? (
                        <Image
                          source={{ uri: profileUrl }}
                          style={styles.castImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.castPlaceholder}>
                          <Ionicons name="person" size={24} color={colors.text.faint} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.castName} numberOfLines={1}>
                      {person.name}
                    </Text>
                    <Text style={styles.castChar} numberOfLines={1}>
                      {person.character}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Similar Titles */}
        {similar.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.sectionHeading}>SIMILAR TITLES</Text>
            <View style={styles.similarGrid}>
              {similar.slice(0, 6).map((item) => (
                <View key={item.id} style={styles.similarCol}>
                  <MediaCard
                    id={item.id}
                    title={item.title || 'Untitled'}
                    posterPath={item.poster_path}
                    mediaType="movie"
                    rating={item.vote_average}
                    year={item.release_date?.slice(0, 4)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
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
    paddingBottom: 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    paddingBottom: 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContent: {
    padding: 16,
  },
  heroWrapper: {
    position: 'relative',
    height: 280,
    justifyContent: 'flex-end',
  },
  backdropImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.7,
  },
  noBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg.raised,
  },
  backdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    backgroundColor: 'rgba(13, 15, 18, 0.85)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  posterThumb: {
    width: 90,
    height: 135,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.text.secondary,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 184, 105, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent.border,
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
  metaYear: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  metaRuntime: {
    fontSize: 12,
    color: colors.text.faint,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  genreTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  genreTagText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  watchNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  watchNowText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.bg.base,
  },
  watchTogetherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  watchTogetherText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  trailerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  overviewSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 6,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  overviewText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  castSection: {
    marginTop: 24,
    paddingLeft: 16,
  },
  castList: {
    paddingRight: 16,
    gap: 12,
    marginTop: 8,
  },
  castCard: {
    width: 80,
    alignItems: 'center',
  },
  castImageContainer: {
    width: 72,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 6,
  },
  castImage: {
    width: '100%',
    height: '100%',
  },
  castPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  castName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  castChar: {
    fontSize: 9,
    color: colors.text.faint,
    textAlign: 'center',
  },
  similarSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  similarCol: {
    width: '48.5%',
    marginBottom: 12,
  },
});
