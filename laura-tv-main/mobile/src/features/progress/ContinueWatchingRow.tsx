import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { ContinueWatchingCard } from './ContinueWatchingCard';
import type { ContinueWatchingRecord } from './types';

type Props = {
  records: ContinueWatchingRecord[];
  onRemove: (record: ContinueWatchingRecord) => void;
};

export function ContinueWatchingRow({ records, onRemove }: Props) {
  if (records.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Continue Watching</Text>
      <FlatList
        horizontal
        data={records}
        keyExtractor={(record) => `${record.mediaType}:${record.mediaId}`}
        renderItem={({ item }) => <ContinueWatchingCard record={item} onRemove={onRemove} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
  },
  heading: {
    marginHorizontal: 16,
    marginBottom: 12,
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  row: {
    paddingHorizontal: 16,
  },
  separator: {
    width: 12,
  },
});
