import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { searchMulti, fetchTVDetails, fetchTVSeason, getPosterUrl } from '../../services/media-api';
import type { CowatchMedia, ProviderId } from '../../services/cowatch/types';
import type { MediaItem } from '../../types/media';
import { colors } from '../../theme/colors';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: CowatchMedia) => void;
  currentProviderId?: ProviderId;
};

export function CowatchMediaPickerSheet({
  isOpen,
  onClose,
  onSelectMedia,
  currentProviderId = 'embedmaster',
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['mediaPickerSearch', query],
    queryFn: () => searchMulti(query),
    enabled: query.trim().length > 1,
  });

  const { data: tvDetails } = useQuery({
    queryKey: ['mediaPickerTVDetails', selectedItem?.id],
    queryFn: () => fetchTVDetails(selectedItem!.id),
    enabled: selectedItem?.media_type === 'tv',
  });

  const { data: tvSeasonData } = useQuery({
    queryKey: ['mediaPickerSeason', selectedItem?.id, selectedSeason],
    queryFn: () => fetchTVSeason(selectedItem!.id, selectedSeason),
    enabled: selectedItem?.media_type === 'tv' && selectedSeason !== undefined && Number.isInteger(selectedSeason) && selectedSeason >= 0,
  });

  const handleSelectResult = (item: MediaItem) => {
    if (item.media_type === 'movie') {
      onSelectMedia({
        type: 'movie',
        id: item.id,
        providerId: currentProviderId,
      });
      handleClose();
    } else {
      setSelectedItem(item);
      setSelectedSeason(1);
      setSelectedEpisode(1);
    }
  };

  const handleConfirmTVEpisode = () => {
    if (!selectedItem) return;
    onSelectMedia({
      type: 'tv',
      id: selectedItem.id,
      season: selectedSeason,
      episode: selectedEpisode,
      providerId: currentProviderId,
    });
    handleClose();
  };

  const handleClose = () => {
    setSelectedItem(null);
    setQuery('');
    onClose();
  };

  const renderSearchResult = ({ item }: { item: MediaItem }) => {
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const poster = getPosterUrl(item.poster_path);

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectResult(item)}
        activeOpacity={0.7}
      >
        <Image
          source={poster ? { uri: poster } : require('../../../assets/icon.png')}
          style={styles.resultPoster}
          resizeMode="cover"
        />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.resultMeta}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.media_type === 'movie' ? 'MOVIE' : 'TV SHOW'}
              </Text>
            </View>
            {year ? <Text style={styles.yearText}>{year}</Text> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.faint} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="film" size={18} color={colors.accent.primary} />
              <Text style={styles.sheetTitle}>
                {selectedItem ? 'Select Season & Episode' : 'Choose Screening Title'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Search View or Episode Selector */}
          {!selectedItem ? (
            <View style={styles.contentView}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.text.faint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search movie or TV show name..."
                  placeholderTextColor={colors.text.faint}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus={true}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.text.faint} />
                  </TouchableOpacity>
                )}
              </View>

              {isSearching ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="small" color={colors.accent.primary} />
                  <Text style={styles.loadingText}>Searching catalog...</Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults?.results || []}
                  keyExtractor={(item) => `${item.media_type}-${item.id}`}
                  renderItem={renderSearchResult}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    query.trim().length > 1 ? (
                      <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>No results found</Text>
                      </View>
                    ) : (
                      <View style={styles.centerContainer}>
                        <Text style={styles.emptyPrompt}>Type to search movies and series</Text>
                      </View>
                    )
                  }
                />
              )}
            </View>
          ) : (
            <ScrollView style={styles.contentView} contentContainerStyle={styles.tvSelectContent}>
              <TouchableOpacity
                style={styles.backToSearch}
                onPress={() => setSelectedItem(null)}
              >
                <Ionicons name="arrow-back" size={14} color={colors.accent.primary} />
                <Text style={styles.backToSearchText}>Back to search</Text>
              </TouchableOpacity>

              <Text style={styles.tvShowTitle}>
                {selectedItem.title || selectedItem.name}
              </Text>

              {/* Seasons Selector */}
              <Text style={styles.sectionLabel}>SELECT SEASON</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                {tvDetails?.seasons?.map((season) => {
                  const isActive = selectedSeason === season.season_number;
                  return (
                    <TouchableOpacity
                      key={season.season_number}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => {
                        setSelectedSeason(season.season_number);
                        setSelectedEpisode(1);
                      }}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Episodes Selector */}
              <Text style={styles.sectionLabel}>SELECT EPISODE</Text>
              <View style={styles.episodesGrid}>
                {tvSeasonData?.episodes?.map((ep) => {
                  const isActive = selectedEpisode === ep.episode_number;
                  return (
                    <TouchableOpacity
                      key={ep.episode_number}
                      style={[styles.episodeCard, isActive && styles.episodeCardActive]}
                      onPress={() => setSelectedEpisode(ep.episode_number)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.episodeNumber,
                          isActive && styles.episodeNumberActive,
                        ]}
                      >
                        EP {ep.episode_number}
                      </Text>
                      <Text
                        style={[styles.episodeTitle, isActive && styles.episodeTitleActive]}
                        numberOfLines={1}
                      >
                        {ep.name || `Episode ${ep.episode_number}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmTVEpisode}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnText}>
                  Set Room to S{selectedSeason} E{selectedEpisode}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '80%',
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    backgroundColor: colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.medium,
    overflow: 'hidden',
  },
  sheetHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  contentView: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 6,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 10,
    padding: 8,
    gap: 10,
  },
  resultPoster: {
    width: 36,
    height: 52,
    borderRadius: 6,
    backgroundColor: colors.bg.raised,
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.accent.primary,
  },
  yearText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  emptyPrompt: {
    fontSize: 12,
    color: colors.text.faint,
  },
  tvSelectContent: {
    padding: 16,
    gap: 12,
  },
  backToSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToSearchText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  tvShowTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  pillsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pillActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  pillTextActive: {
    color: colors.bg.base,
    fontWeight: '800',
  },
  episodesGrid: {
    gap: 6,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  episodeCardActive: {
    backgroundColor: colors.accent.muted,
    borderColor: colors.accent.primary,
  },
  episodeNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.secondary,
  },
  episodeNumberActive: {
    color: colors.accent.primary,
  },
  episodeTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  episodeTitleActive: {
    color: colors.accent.primary,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.bg.base,
  },
});
