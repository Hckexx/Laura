import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '../src/components/common/Header';
import { MediaGrid } from '../src/components/media/MediaGrid';
import { getWatchlist } from '../src/services/storage/watchlist';
import type { WatchlistItem } from '../src/types/watchlist';
import { colors } from '../src/theme/colors';

type WatchlistFilter = 'all' | 'movie' | 'tv';

export default function WatchlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [filter, setFilter] = useState<WatchlistFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadWatchlist = async () => {
    const list = await getWatchlist();
    setItems(list);
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
  };

  const filteredItems =
    filter === 'all' ? items : items.filter((item) => item.mediaType === filter);

  const movieCount = items.filter((i) => i.mediaType === 'movie').length;
  const tvCount = items.filter((i) => i.mediaType === 'tv').length;

  const renderHeader = () => (
    <View style={styles.headerArea}>
      <View style={styles.titleSection}>
        <Text style={styles.metaBadge}>SAVED TITLES · CLIENT STORAGE</Text>
        <Text style={styles.screenTitle}>My List</Text>
        <Text style={styles.screenSubtitle}>
          Personal saved movies and series for later viewing.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'movie' && styles.filterButtonActive]}
          onPress={() => setFilter('movie')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'movie' && styles.filterTextActive]}>
            Movies ({movieCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'tv' && styles.filterButtonActive]}
          onPress={() => setFilter('tv')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'tv' && styles.filterTextActive]}>
            TV Shows ({tvCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const gridItems = filteredItems.map((item) => ({
    id: item.id,
    title: item.title,
    poster_path: item.posterPath,
    media_type: item.mediaType,
    vote_average: item.rating,
    release_date: item.year,
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header showBack={true} />
      <MediaGrid
        items={gridItems}
        mediaType="movie"
        ListHeaderComponent={renderHeader()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        emptyTitle={items.length === 0 ? 'Your List is Empty' : `No ${filter === 'movie' ? 'Movies' : 'TV Shows'}`}
        emptyMessage={
          items.length === 0
            ? 'Save movies and TV shows from details pages to easily find them.'
            : 'You have not saved any titles in this category yet.'
        }
      />
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
    paddingBottom: 12,
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
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterTextActive: {
    color: colors.bg.base,
    fontWeight: '800',
  },
});
