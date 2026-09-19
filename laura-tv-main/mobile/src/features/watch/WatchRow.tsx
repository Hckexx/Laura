import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { WatchDiscoveryItem } from './category-service';
import { WatchPosterCard } from './WatchPosterCard';

type Props = {
  title: string;
  items: WatchDiscoveryItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function WatchRow({
  title,
  items,
  isLoading = false,
  isError = false,
  onRetry,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((item) => <View key={item} style={styles.skeleton} />)}
        </View>
      ) : isError ? (
        <Pressable onPress={onRetry} style={styles.errorRow} accessibilityRole="button">
          <Text style={styles.errorText}>This row is unavailable. Tap to retry.</Text>
        </Pressable>
      ) : items.length > 0 ? (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item) => `${item.media_type}:${item.id}`}
          renderItem={({ item }) => <WatchPosterCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          initialNumToRender={6}
          windowSize={4}
        />
      ) : (
        <Text style={styles.emptyText}>Nothing saved here yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
  },
  headingRow: {
    minHeight: 28,
    marginHorizontal: 16,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: colors.text.primary,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  action: {
    color: colors.accent.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
  },
  separator: {
    width: 11,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  skeleton: {
    width: 126,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: colors.bg.raised,
    opacity: 0.72,
  },
  errorRow: {
    marginHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  emptyText: {
    marginHorizontal: 16,
    color: colors.text.faint,
    fontSize: 12,
  },
});
