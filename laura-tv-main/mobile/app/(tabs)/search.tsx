import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/common/Header';
import { MediaCard } from '../../src/components/media/MediaCard';
import { MediaGridSkeleton } from '../../src/components/common/Skeleton';
import { GenrePillList } from '../../src/components/media/GenrePillList';
import {
  searchMovies,
  searchTVShows,
  fetchTrendingMovies,
  fetchTopRatedMovies,
  fetchTrendingTVShows,
  fetchMovieGenres,
} from '../../src/services/media-api';
import { colors } from '../../src/theme/colors';

export default function SearchScreen() {
  const [inputText, setInputText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'top-rated'>('trending');

  // Debounce input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputText.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [inputText]);

  // Search queries
  const { data: movieResults = [], isLoading: moviesLoading } = useQuery({
    queryKey: ['searchMovies', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const { data: tvResults = [], isLoading: tvLoading } = useQuery({
    queryKey: ['searchTV', debouncedQuery],
    queryFn: () => searchTVShows(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  // Default explore queries (when no query is entered)
  const { data: trendingMovies = [], isLoading: trendingMoviesLoading } = useQuery({
    queryKey: ['trendingMovies'],
    queryFn: fetchTrendingMovies,
    enabled: debouncedQuery.length === 0 && activeTab === 'trending',
  });

  const { data: trendingTV = [], isLoading: trendingTVLoading } = useQuery({
    queryKey: ['trendingTV'],
    queryFn: fetchTrendingTVShows,
    enabled: debouncedQuery.length === 0 && activeTab === 'trending',
  });

  const { data: topRatedMovies = [], isLoading: topRatedLoading } = useQuery({
    queryKey: ['topRatedMovies'],
    queryFn: fetchTopRatedMovies,
    enabled: debouncedQuery.length === 0 && activeTab === 'top-rated',
  });

  const { data: movieGenres = [] } = useQuery({
    queryKey: ['movieGenres'],
    queryFn: fetchMovieGenres,
    enabled: debouncedQuery.length === 0,
  });

  const hasQuery = debouncedQuery.length > 0;
  const isSearchLoading = hasQuery && (moviesLoading || tvLoading);
  const totalResults = movieResults.length + tvResults.length;

  const defaultMovies = activeTab === 'trending' ? trendingMovies : topRatedMovies;
  const defaultTV = activeTab === 'trending' ? trendingTV : [];
  const isDefaultLoading =
    debouncedQuery.length === 0 &&
    (activeTab === 'trending' ? trendingMoviesLoading || trendingTVLoading : topRatedLoading);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Search & Explore" showLogo={false} />

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={colors.text.secondary} style={styles.searchIcon} />
            <TextInput
            style={styles.input}
            placeholder="Search"
            placeholderTextColor={colors.text.faint}
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputText.length > 0 && (
            <TouchableOpacity
              onPress={() => setInputText('')}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Results Mode */}
        {hasQuery ? (
          <View style={styles.resultsArea}>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.metaBadge}>SEARCH RESULTS</Text>
                <Text style={styles.resultsTitle}>
                  Results for "{debouncedQuery}"
                </Text>
              </View>
              {!isSearchLoading && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{totalResults} titles</Text>
                </View>
              )}
            </View>

            {isSearchLoading ? (
              <MediaGridSkeleton count={6} />
            ) : totalResults === 0 ? (
              <View style={styles.emptyResultsBox}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="search-outline" size={28} color={colors.text.faint} />
                </View>
                <Text style={styles.emptyTitle}>No matching titles found</Text>
                <Text style={styles.emptyMessage}>
                  Check your spelling, or try searching for titles, actors, or genres.
                </Text>
              </View>
            ) : (
              <View style={styles.resultsSections}>
                {/* Feature Films */}
                {movieResults.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Feature Films</Text>
                      <Text style={styles.sectionCount}>({movieResults.length})</Text>
                    </View>
                    <View style={styles.gridRow}>
                      {movieResults.map((item) => (
                        <View key={`movie-${item.id}`} style={styles.gridCol}>
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

                {/* Television Series */}
                {tvResults.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Television Series</Text>
                      <Text style={styles.sectionCount}>({tvResults.length})</Text>
                    </View>
                    <View style={styles.gridRow}>
                      {tvResults.map((item) => (
                        <View key={`tv-${item.id}`} style={styles.gridCol}>
                          <MediaCard
                            id={item.id}
                            title={item.name || 'Untitled'}
                            posterPath={item.poster_path}
                            mediaType="tv"
                            rating={item.vote_average}
                            year={item.first_air_date?.slice(0, 4)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Default Explore Mode */
          <View style={styles.exploreArea}>
            <View style={styles.exploreHeader}>
              <View>
                <Text style={styles.metaBadge}>DISCOVERY TERMINAL</Text>
                <Text style={styles.resultsTitle}>Explore Catalog</Text>
              </View>

              <View style={styles.tabSwitcher}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'trending' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('trending')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'trending' && styles.tabButtonTextActive]}>
                    Trending
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'top-rated' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('top-rated')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'top-rated' && styles.tabButtonTextActive]}>
                    Top Rated
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Genre Explorer */}
            {movieGenres.length > 0 && (
              <View style={styles.genreSection}>
                <Text style={styles.genreLabel}>POPULAR GENRES</Text>
                <GenrePillList
                  genres={movieGenres.slice(0, 10)}
                  selectedGenreId={null}
                  onSelectGenre={(id) => {
                    const genre = movieGenres.find((g) => g.id === id);
                    if (genre) setInputText(genre.name);
                  }}
                />
              </View>
            )}

            {isDefaultLoading ? (
              <MediaGridSkeleton count={6} />
            ) : (
              <View style={styles.resultsSections}>
                {/* Default Movies Stream */}
                {defaultMovies.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        {activeTab === 'trending' ? 'Trending Feature Films' : 'Top Rated Masterpieces'}
                      </Text>
                    </View>
                    <View style={styles.gridRow}>
                      {defaultMovies.slice(0, 12).map((item) => (
                        <View key={`default-movie-${item.id}`} style={styles.gridCol}>
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

                {/* Default TV Stream (for Trending) */}
                {activeTab === 'trending' && defaultTV.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Trending Television Series</Text>
                    </View>
                    <View style={styles.gridRow}>
                      {defaultTV.slice(0, 12).map((item) => (
                        <View key={`default-tv-${item.id}`} style={styles.gridCol}>
                          <MediaCard
                            id={item.id}
                            title={item.name || 'Untitled'}
                            posterPath={item.poster_path}
                            mediaType="tv"
                            rating={item.vote_average}
                            year={item.first_air_date?.slice(0, 4)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
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
    paddingHorizontal: 12,
    paddingBottom: 36,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  inputWrapper: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultsArea: {
    paddingTop: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  metaBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  countText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  emptyResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginVertical: 16,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  resultsSections: {
    gap: 24,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCol: {
    width: '48.5%',
    marginBottom: 12,
  },
  exploreArea: {
    paddingTop: 16,
  },
  exploreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 2,
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.accent.primary,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabButtonTextActive: {
    color: colors.bg.base,
    fontWeight: '800',
  },
  genreSection: {
    marginBottom: 16,
  },
  genreLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 1.2,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
});
