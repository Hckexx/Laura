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
  fetchPopularTVShows,
  fetchTrendingTVShows,
  fetchTopRatedTVShows,
  fetchAiringTodayTV,
  fetchTVGenres,
  fetchTVShowsByGenre,
} from '../../src/services/media-api';
import { colors } from '../../src/theme/colors';

type TVSection = 'popular' | 'trending' | 'top-rated' | 'airing-today' | 'genre';

const SECTIONS: { id: TVSection; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'trending', label: 'Trending' },
  { id: 'top-rated', label: 'Top Rated' },
  { id: 'airing-today', label: 'Airing Today' },
  { id: 'genre', label: 'By Genre' },
];

export default function TVShowsScreen() {
  const [activeSection, setActiveSection] = useState<TVSection>('popular');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  // TV genres query
  const { data: tvGenres = [] } = useQuery({
    queryKey: ['tvGenres'],
    queryFn: fetchTVGenres,
  });

  // Section queries
  const {
    data: popularTV,
    isLoading: popularLoading,
    isError: popularError,
    refetch: refetchPopular,
    isRefetching: popularRefetching,
  } = useQuery({
    queryKey: ['popularTV'],
    queryFn: fetchPopularTVShows,
    enabled: activeSection === 'popular',
  });

  const {
    data: trendingTV,
    isLoading: trendingLoading,
    isError: trendingError,
    refetch: refetchTrending,
    isRefetching: trendingRefetching,
  } = useQuery({
    queryKey: ['trendingTV'],
    queryFn: fetchTrendingTVShows,
    enabled: activeSection === 'trending',
  });

  const {
    data: topRatedTV,
    isLoading: topRatedLoading,
    isError: topRatedError,
    refetch: refetchTopRated,
    isRefetching: topRatedRefetching,
  } = useQuery({
    queryKey: ['topRatedTV'],
    queryFn: fetchTopRatedTVShows,
    enabled: activeSection === 'top-rated',
  });

  const {
    data: airingTodayTV,
    isLoading: airingLoading,
    isError: airingError,
    refetch: refetchAiring,
    isRefetching: airingRefetching,
  } = useQuery({
    queryKey: ['airingTodayTV'],
    queryFn: fetchAiringTodayTV,
    enabled: activeSection === 'airing-today',
  });

  const {
    data: genreTV,
    isLoading: genreLoading,
    isError: genreError,
    refetch: refetchGenre,
    isRefetching: genreRefetching,
  } = useQuery({
    queryKey: ['genreTV', selectedGenre],
    queryFn: () => fetchTVShowsByGenre(selectedGenre!),
    enabled: activeSection === 'genre' && !!selectedGenre,
  });

  const handleSectionChange = (section: TVSection) => {
    setActiveSection(section);
    if (section === 'genre' && !selectedGenre && tvGenres.length > 0) {
      setSelectedGenre(tvGenres[0].id);
    }
  };

  const items =
    activeSection === 'popular'
      ? popularTV || []
      : activeSection === 'trending'
      ? trendingTV || []
      : activeSection === 'top-rated'
      ? topRatedTV || []
      : activeSection === 'airing-today'
      ? airingTodayTV || []
      : genreTV || [];

  const isLoading =
    (activeSection === 'popular' && popularLoading) ||
    (activeSection === 'trending' && trendingLoading) ||
    (activeSection === 'top-rated' && topRatedLoading) ||
    (activeSection === 'airing-today' && airingLoading) ||
    (activeSection === 'genre' && (genreLoading || !selectedGenre));

  const isError =
    (activeSection === 'popular' && popularError) ||
    (activeSection === 'trending' && trendingError) ||
    (activeSection === 'top-rated' && topRatedError) ||
    (activeSection === 'airing-today' && airingError) ||
    (activeSection === 'genre' && genreError);

  const isRefetching =
    popularRefetching ||
    trendingRefetching ||
    topRatedRefetching ||
    airingRefetching ||
    genreRefetching;

  const handleRefresh = () => {
    if (activeSection === 'popular') refetchPopular();
    else if (activeSection === 'trending') refetchTrending();
    else if (activeSection === 'top-rated') refetchTopRated();
    else if (activeSection === 'airing-today') refetchAiring();
    else if (activeSection === 'genre') refetchGenre();
  };

  const renderHeader = () => (
    <View style={styles.headerArea}>
      <View style={styles.titleSection}>
        <Text style={styles.metaBadge}>SERIALIZED BROADCASTS · TELEVISION</Text>
        <Text style={styles.screenTitle}>TV Shows</Text>
        <Text style={styles.screenSubtitle}>
          Stream serialized dramas, prestige television, weekly broadcasts, and complete series.
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
      {activeSection === 'genre' && tvGenres.length > 0 && (
        <View style={styles.genreRow}>
          <Text style={styles.genreLabel}>SELECT GENRE</Text>
          <GenrePillList
            genres={tvGenres}
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
          mediaType="tv"
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
