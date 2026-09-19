import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaCard } from './MediaCard';
import { colors } from '../../theme/colors';
import type { MediaItem, MediaType } from '../../types/media';

interface MediaGridProps {
  items: MediaItem[];
  mediaType: MediaType;
  ListHeaderComponent?: React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  mediaType,
  ListHeaderComponent,
  refreshing = false,
  onRefresh,
  emptyTitle = 'No titles found',
  emptyMessage = 'Try selecting another category or filter.',
}) => {
  const { width } = useWindowDimensions();

  // Responsive column count based on viewport width
  const numColumns =
    width >= 1024 ? 5 : width >= 768 ? 4 : width >= 480 ? 3 : 2;

  const renderItem = ({ item }: { item: MediaItem }) => {
    const title = item.title || item.name || 'Untitled';
    const year = item.release_date
      ? item.release_date.slice(0, 4)
      : item.first_air_date
      ? item.first_air_date.slice(0, 4)
      : undefined;

    return (
      <View style={styles.gridItem}>
        <MediaCard
          id={item.id}
          title={title}
          posterPath={item.poster_path}
          mediaType={item.media_type || mediaType}
          rating={item.vote_average}
          year={year}
        />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="film-outline" size={28} color={colors.text.secondary} />
      </View>
      <Text style={styles.emptyTitle}>{emptyTitle}</Text>
      <Text style={styles.emptyMessage}>{emptyMessage}</Text>
    </View>
  );

  return (
    <FlatList
      key={`grid-cols-${numColumns}`}
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      numColumns={numColumns}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews={true}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        ) : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 36,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
  },
  emptyContainer: {
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
  },
});
