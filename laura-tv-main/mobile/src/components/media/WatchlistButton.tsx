import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isInWatchlist, toggleWatchlist } from '../../services/storage/watchlist';
import { colors } from '../../theme/colors';
import type { MediaType } from '../../types/media';

interface WatchlistButtonProps {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null | undefined;
  rating?: number;
  year?: string;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  id,
  mediaType,
  title,
  posterPath,
  rating,
  year,
}) => {
  const [inList, setInList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    isInWatchlist(id, mediaType).then((status) => {
      if (isMounted) {
        setInList(status);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id, mediaType]);

  const handleToggle = async () => {
    setLoading(true);
    const result = await toggleWatchlist({
      id,
      mediaType,
      title,
      posterPath: posterPath || null,
      rating,
      year,
      addedAt: new Date().toISOString(),
    });
    setInList(result.added);
    setLoading(false);
  };

  return (
    <TouchableOpacity
      style={[styles.button, inList && styles.buttonActive]}
      onPress={handleToggle}
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text.primary} />
      ) : (
        <>
          <Ionicons
            name={inList ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={inList ? colors.bg.base : colors.text.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.text, inList && styles.textActive]}>
            {inList ? 'In Watchlist' : 'Add to Watchlist'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  buttonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  textActive: {
    color: colors.bg.base,
    fontWeight: '700',
  },
});
