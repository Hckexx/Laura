import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { Header } from '../../src/components/common/Header';
import { ContinueWatchingRow } from '../../src/features/progress/ContinueWatchingRow';
import {
  getContinueWatching,
  removeContinueWatching,
} from '../../src/features/progress/storage';
import type { ContinueWatchingRecord } from '../../src/features/progress/types';
import { WATCH_CATEGORIES } from '../../src/features/watch/categories';
import { fetchWatchCategory, type WatchDiscoveryItem } from '../../src/features/watch/category-service';
import { WatchRow } from '../../src/features/watch/WatchRow';
import { getWatchlist } from '../../src/services/storage/watchlist';
import { colors } from '../../src/theme/colors';
import type { WatchlistItem } from '../../src/types/watchlist';

const toDiscoveryItem = (item: WatchlistItem): WatchDiscoveryItem => ({
  id: item.id,
  title: item.mediaType === 'movie' ? item.title : undefined,
  name: item.mediaType === 'tv' ? item.title : undefined,
  poster_path: item.posterPath,
  media_type: item.mediaType,
  vote_average: item.rating,
  ...(item.mediaType === 'movie' ? { release_date: item.year } : { first_air_date: item.year }),
});

export default function WatchHubScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<ContinueWatchingRecord[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const categoryQueries = useQueries({
    queries: WATCH_CATEGORIES.map((category) => ({
      queryKey: ['watch-category', category.id],
      queryFn: () => fetchWatchCategory(category),
      staleTime: 1000 * 60 * 10,
      retry: 1,
    })),
  });

  const loadLocalRows = useCallback(async () => {
    const [nextHistory, nextWatchlist] = await Promise.all([
      getContinueWatching(),
      getWatchlist(),
    ]);
    setHistory(nextHistory);
    setWatchlist(nextWatchlist);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLocalRows();
    }, [loadLocalRows]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadLocalRows(),
      ...categoryQueries.map((query) => query.refetch()),
    ]);
    setRefreshing(false);
  }, [categoryQueries, loadLocalRows]);

  const handleRemoveHistory = useCallback(async (record: ContinueWatchingRecord) => {
    const updated = await removeContinueWatching(record.mediaId, record.mediaType);
    setHistory(updated);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.title}>Watch</Text>
          <Text style={styles.subtitle}>Movies, series, and your saved picks in one place.</Text>
        </View>

        <ContinueWatchingRow records={history} onRemove={handleRemoveHistory} />

        <WatchRow
          title="My List"
          items={watchlist.map(toDiscoveryItem)}
          actionLabel={watchlist.length > 0 ? 'See All' : undefined}
          onAction={() => router.push('/watchlist')}
        />

        {WATCH_CATEGORIES.map((category, index) => {
          const query = categoryQueries[index];
          return (
            <WatchRow
              key={category.id}
              title={category.title}
              items={query.data || []}
              isLoading={query.isLoading}
              isError={query.isError}
              onRetry={() => void query.refetch()}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  intro: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 2,
  },
  title: {
    color: colors.text.primary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
});
