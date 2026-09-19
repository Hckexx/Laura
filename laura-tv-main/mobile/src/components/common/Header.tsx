import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showLogo = true,
  rightAction,
}) => {
  const router = useRouter();

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          )}

          {showLogo && (
            <TouchableOpacity
              style={styles.logoRow}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>
                LAURA<Text style={styles.logoRed}>TV</Text>
              </Text>
            </TouchableOpacity>
          )}

          {title && !showLogo && (
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.right}>
          {rightAction ? (
            rightAction
          ) : (
            <View style={styles.defaultActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push('/watchlist')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="My List"
              >
                <Ionicons name="bookmark-outline" size={19} color={colors.text.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push('/profile')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Personal Lounge Profile"
              >
                <Ionicons name="person-circle-outline" size={21} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.bg.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 26,
    height: 26,
    borderRadius: 6,
    marginRight: 8,
  },
  logoText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  logoRed: {
    color: colors.brand.red,
    fontWeight: '900',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
