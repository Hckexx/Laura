import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../../../src/components/common/Header';
import { Skeleton } from '../../../../src/components/common/Skeleton';
import { ErrorState } from '../../../../src/components/common/ErrorState';
import {
  fetchTVDetails,
  fetchTVSeason,
  getPosterUrl,
  getStillUrl,
} from '../../../../src/services/media-api';
import { colors } from '../../../../src/theme/colors';

export default function SeasonDetailsScreen() {
  const router = useRouter();
  const { id, seasonNumber } = useLocalSearchParams<{
    id: string;
    seasonNumber: string;
  }>();

  const tvId = Number(id);
  const seasonNum = Number(seasonNumber);
  const [episodeSearch, setEpisodeSearch] = useState('');

  const { data: show } = useQuery({
    queryKey: ['tvDetails', tvId],
    queryFn: () => fetchTVDetails(tvId),
    enabled: !!tvId,
  });

  const {
    data: season,
    isLoading: seasonLoading,
    isError: seasonError,
    refetch: refetchSeason,
  } = useQuery({
    queryKey: ['tvSeason', tvId, seasonNum],
    queryFn: () => fetchTVSeason(tvId, seasonNum),
    enabled: !!tvId && Number.isInteger(seasonNum) && seasonNum >= 0,
  });

  const episodes = useMemo(() => season?.episodes || [], [season?.episodes]);

  const filteredEpisodes = useMemo(() => {
    const query = episodeSearch.trim().toLowerCase();
    if (!query) return episodes;

    return episodes.filter((ep) => {
      const nameMatch = (ep.name || '').toLowerCase().includes(query);
      const overviewMatch = (ep.overview || '').toLowerCase().includes(query);
      const numMatch = String(ep.episode_number) === query;
      return nameMatch || overviewMatch || numMatch;
    });
  }, [episodes, episodeSearch]);

  if (seasonLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header showBack={true} />
        <View style={styles.loadingArea}>
          <Skeleton width="100%" height={160} borderRadius={0} />
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton width="60%" height={24} borderRadius={6} />
            <Skeleton width="100%" height={100} borderRadius={12} />
            <Skeleton width="100%" height={100} borderRadius={12} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (seasonError || !season) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header showBack={true} />
        <ErrorState
          title="Season Not Found"
          message="Unable to retrieve details for this season."
          onRetry={refetchSeason}
        />
      </SafeAreaView>
    );
  }

  const seasonPoster = getPosterUrl(season.poster_path || show?.poster_path);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header showBack={true} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Season Hero Header */}
        <View style={styles.seasonHero}>
          {seasonPoster && (
            <Image
              source={{ uri: seasonPoster }}
              style={styles.heroPosterBlur}
              resizeMode="cover"
              blurRadius={10}
            />
          )}
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <TouchableOpacity
              style={styles.backToSeriesRow}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={14} color={colors.accent.primary} />
              <Text style={styles.backToSeriesText} numberOfLines={1}>
                Back to {show?.name || 'Series'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.seasonTitle}>{season.name}</Text>
            <Text style={styles.seasonMeta}>
              {episodes.length} episodes
              {season.air_date ? ` • ${season.air_date.slice(0, 4)}` : ''}
            </Text>

            {season.overview ? (
              <Text style={styles.seasonOverview} numberOfLines={3}>
                {season.overview}
              </Text>
            ) : null}

            {/* Episode Search Bar */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={16} color={colors.text.faint} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search or filter episodes..."
                placeholderTextColor={colors.text.faint}
                value={episodeSearch}
                onChangeText={setEpisodeSearch}
              />
              {episodeSearch ? (
                <TouchableOpacity onPress={() => setEpisodeSearch('')} style={styles.clearSearch}>
                  <Ionicons name="close-circle" size={16} color={colors.text.faint} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Episode Cards List */}
        <View style={styles.episodesList}>
          {filteredEpisodes.length === 0 ? (
            <View style={styles.emptyEpisodes}>
              <Text style={styles.emptyText}>No episodes match "{episodeSearch}"</Text>
            </View>
          ) : (
            filteredEpisodes.map((episode) => {
              const stillUrl = getStillUrl(episode.still_path);
              return (
                <View key={episode.id} style={styles.episodeCard}>
                  {/* Episode Still */}
                  <View style={styles.stillWrapper}>
                    {stillUrl ? (
                      <Image
                        source={{ uri: stillUrl }}
                        style={styles.stillImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noStill}>
                        <Ionicons name="film" size={24} color={colors.text.faint} />
                      </View>
                    )}
                    <View style={styles.epBadge}>
                      <Text style={styles.epBadgeText}>E{episode.episode_number}</Text>
                    </View>
                  </View>

                  {/* Episode Info */}
                  <View style={styles.episodeInfo}>
                    <View style={styles.epTitleRow}>
                      <Text style={styles.epTitle} numberOfLines={1}>
                        {episode.name}
                      </Text>
                      {episode.vote_average > 0 && (
                        <View style={styles.epRatingBadge}>
                          <Text style={styles.starText}>★</Text>
                          <Text style={styles.epRatingText}>{episode.vote_average.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.epMeta}>
                      {episode.runtime > 0 ? `${episode.runtime} min` : 'Standard length'}
                      {episode.air_date ? ` • ${episode.air_date}` : ''}
                    </Text>

                    {episode.overview ? (
                      <Text style={styles.epOverview} numberOfLines={2}>
                        {episode.overview}
                      </Text>
                    ) : null}

                    {/* Action Buttons */}
                    <View style={styles.epActionRow}>
                      <TouchableOpacity
                        style={styles.watchEpButton}
                        onPress={() =>
                          router.push(
                            `/watch/${tvId}?type=tv&season=${seasonNum}&episode=${episode.episode_number}`,
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={12} color={colors.bg.base} />
                        <Text style={styles.watchEpText}>Watch</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.togetherEpButton}
                        onPress={() =>
                          router.push(
                            `/cowatch?type=tv&id=${tvId}&season=${seasonNum}&episode=${episode.episode_number}`,
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="people" size={12} color={colors.text.primary} />
                        <Text style={styles.togetherEpText}>Together</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
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
    paddingBottom: 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  loadingArea: {
    flex: 1,
  },
  seasonHero: {
    position: 'relative',
    backgroundColor: colors.bg.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    overflow: 'hidden',
  },
  heroPosterBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 15, 18, 0.8)',
  },
  heroContent: {
    padding: 16,
    gap: 8,
  },
  backToSeriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backToSeriesText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  seasonTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  seasonMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  seasonOverview: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
    marginTop: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  clearSearch: {
    padding: 2,
  },
  episodesList: {
    padding: 16,
    gap: 12,
  },
  emptyEpisodes: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.faint,
  },
  episodeCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  stillWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.bg.raised,
    position: 'relative',
  },
  stillImage: {
    width: '100%',
    height: '100%',
  },
  noStill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.primary,
  },
  episodeInfo: {
    gap: 4,
  },
  epTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  epTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  epRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  starText: {
    fontSize: 9,
    color: colors.accent.primary,
  },
  epRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  epMeta: {
    fontSize: 11,
    color: colors.text.faint,
  },
  epOverview: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  epActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  watchEpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  watchEpText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg.base,
  },
  togetherEpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  togetherEpText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
