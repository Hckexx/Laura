import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import type { Genre } from '../../types/genres';

interface GenrePillListProps {
  genres: Genre[];
  selectedGenreId: number | null;
  onSelectGenre: (genreId: number) => void;
}

export const GenrePillList: React.FC<GenrePillListProps> = ({
  genres,
  selectedGenreId,
  onSelectGenre,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {genres.map((genre) => {
        const isSelected = selectedGenreId === genre.id;
        return (
          <TouchableOpacity
            key={genre.id}
            style={[styles.pill, isSelected && styles.selectedPill]}
            onPress={() => onSelectGenre(genre.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isSelected && styles.selectedPillText]}>
              {genre.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  selectedPill: {
    backgroundColor: colors.accent.muted,
    borderColor: colors.accent.border,
  },
  pillText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  selectedPillText: {
    color: colors.accent.primary,
    fontWeight: '700',
  },
});
