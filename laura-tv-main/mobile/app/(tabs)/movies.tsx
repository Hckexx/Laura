import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../src/components/common/Header';
import { MediaGrid } from '../../src/components/media/MediaGrid';
import { MediaGridSkeleton } from '../../src/components/common/Skeleton';
import { ErrorState } from '../../src/components/common/ErrorState';
import { GenrePillList } from '../../src/components/media/GenrePillList';
import {
  fetchPopularMovies,
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
  fetchNowPlayingMovies,
  fetchMovieGenres,
  fetchMoviesByGenre,
} from '../../src/services/media-api';
import { colors } from '../../src/theme/colors';

type MovieSection = 'popular' | 'trending' | 'top-rated' | 'upcoming' | 'now-playing' | 'genre';

const SECTIONS: { id: MovieSection; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'trending', label: 'Trending' },
  { id: 'top-rated', label: 'Top Rated' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'now-playing', label: 'Now Playing' },
  { id: 'genre', label: 'By Genre' },
];

export default function MoviesScreen() {
  const [activeSection, setActiveSection] = useState<MovieSection>('popular');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  // Genres query
  const { data: movieGenres = [] } = useQuery({
    queryKey: ['movieGenres'],
    queryFn: fetchMovieGenres,
  });

  // Section queries
  const {
    data: popularMovies,
    isLoading: popularLoading,
    isError: popularError,
    refetch: refetchPopular,
    isRefetching: popularRefetching,
  } = useQuery({
    queryKey: ['popularMovies'],
    queryFn: fetchPopularMovies,
    enabled: activeSection === 'popular',
  });

  const {
    data: trendingMovies,
    isLoading: trendingLoading,
    isError: trendingError,
    refetch: refetchTrending,
    isRefetching: trendingRefetching,
  } = useQuery({
    queryKey: ['trendingMovies'],
    queryFn: fetchTrendingMovies,
    enabled: activeSection === 'trending',
  });

  const {
    data: topRatedMovies,
    isLoading: topRatedLoading,
    isError: topRatedError,
    refetch: refetchTopRated,
    isRefetching: topRatedRefetching,
  } = useQuery({
    queryKey: ['topRatedMovies'],
    queryFn: fetchTopRatedMovies,
    enabled: activeSection === 'top-rated',
  });

  const {
    data: upcomingMovies,
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
    isRefetching: upcomingRefetching,
  } = useQuery({
    queryKey: ['upcomingMovies'],
    queryFn: fetchUpcomingMovies,
    enabled: activeSection === 'upcoming',
  });

  const {
    data: nowPlayingMovies,
    isLoading: nowPlayingLoading,
    isError: nowPlayingError,
    refetch: refetchNowPlaying,
    isRefetching: nowPlayingRefetching,
  } = useQuery({
    queryKey: ['nowPlayingMovies'],
    queryFn: fetchNowPlayingMovies,
    enabled: activeSection === 'now-playing',
  });

  const {
    data: genreMovies,
    isLoading: genreLoading,
    isError: genreError,
    refetch: refetchGenre,
    isRefetching: genreRefetching,
  } = useQuery({
    queryKey: ['genreMovies', selectedGenre],
    queryFn: () => fetchMoviesByGenre(selectedGenre!),
    enabled: activeSection === 'genre' && !!selectedGenre,
  });

  const handleSectionChange = (section: MovieSection) => {
    setActiveSection(section);
    if (section === 'genre' && !selectedGenre && movieGenres.length > 0) {
      setSelectedGenre(movieGenres[0].id);
    }
  };

  const items =
    activeSection === 'popular'
      ? popularMovies || []
      : activeSection === 'trending'
      ? trendingMovies || []
      : activeSection === 'top-rated'
      ? topRatedMovies || []
      : activeSection === 'upcoming'
      ? upcomingMovies || []
      : activeSection === 'now-playing'
      ? nowPlayingMovies || []
      : genreMovies || [];

  const isLoading =
    (activeSection === 'popular' && popularLoading) ||
    (activeSection === 'trending' && trendingLoading) ||
    (activeSection === 'top-rated' && topRatedLoading) ||
    (activeSection === 'upcoming' && upcomingLoading) ||
    (activeSection === 'now-playing' && nowPlayingLoading) ||
    (activeSection === 'genre' && (genreLoading || !selectedGenre));

  const isError =
    (activeSection === 'popular' && popularError) ||
    (activeSection === 'trending' && trendingError) ||
    (activeSection === 'top-rated' && topRatedError) ||
    (activeSection === 'upcoming' && upcomingError) ||
    (activeSection === 'now-playing' && nowPlayingError) ||
    (activeSection === 'genre' && genreError);

  const isRefetching =
    popularRefetching ||
    trendingRefetching ||
    topRatedRefetching ||
    upcomingRefetching ||
    nowPlayingRefetching ||
    genreRefetching;

  const handleRefresh = () => {
    if (activeSection === 'popular') refetchPopular();
    else if (activeSection === 'trending') refetchTrending();
    else if (activeSection === 'top-rated') refetchTopRated();
    else if (activeSection === 'upcoming') refetchUpcoming();
    else if (activeSection === 'now-playing') refetchNowPlaying();
    else if (activeSection === 'genre') refetchGenre();
  };

  const renderHeader = () => (
    <View style={styles.headerArea}>
      <View style={styles.titleSection}>
        <Text style={styles.metaBadge}>FEATURE FILMS · CATALOG</Text>
        <Text style={styles.screenTitle}>Movies</Text>
        <Text style={styles.screenSubtitle}>
          Explore box office hits, festival classics, and upcoming theatrical releases.
        </Text>
      </View>

      {/* Segment switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentContainer}
      >
        {SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <TouchableOpacity
              key={sec.id}
              style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
              onPress={() => handleSectionChange(sec.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentButtonText,
                  isActive && styles.segmentButtonTextActive,
                ]}
              >
                {sec.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Genre pill row if genre section active */}
      {activeSection === 'genre' && movieGenres.length > 0 && (
        <View style={styles.genreRow}>
          <Text style={styles.genreLabel}>SELECT GENRE</Text>
          <GenrePillList
            genres={movieGenres}
            selectedGenreId={selectedGenre}
            onSelectGenre={setSelectedGenre}
          />
        </View>
      )}

      {isLoading && <MediaGridSkeleton count={8} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      {isError && !isLoading ? (
        <View style={styles.errorWrapper}>
          {renderHeader()}
          <ErrorState onRetry={handleRefresh} />
        </View>
      ) : (
        <MediaGrid
          items={isLoading ? [] : items}
          mediaType="movie"
          ListHeaderComponent={renderHeader()}
          refreshing={isRefetching}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  headerArea: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleSection: {
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  metaBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    lineHeight: 17,
  },
  segmentContainer: {
    paddingHorizontal: 4,
    paddingBottom: 12,
    gap: 6,
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  segmentButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  segmentButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  segmentButtonTextActive: {
    color: colors.bg.base,
    fontWeight: '800',
  },
  genreRow: {
    marginTop: 4,
    marginBottom: 10,
  },
  genreLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 1.2,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  errorWrapper: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
