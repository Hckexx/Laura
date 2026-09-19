import React from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';

import { colors } from '@/theme/colors';
import type { AppAnnouncement } from './types';

type Props = {
  announcement: AppAnnouncement;
  isRetrying: boolean;
  onRetry: () => void;
};

export function MaintenanceScreen({
  announcement,
  isRetrying,
  onRetry,
}: Props) {
  const { width } = useWindowDimensions();

  useFocusEffect(
    React.useCallback(() => {
      const subscription =
        BackHandler.addEventListener(
          'hardwareBackPress',
          () => true,
        );

      return () => {
        subscription.remove();
      };
    }, []),
  );

  const contentWidth = Math.min(
    Math.max(width - 32, 0),
    560,
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={[
            styles.content,
            {
              width: contentWidth,
            },
          ]}
        >
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />

          <Text style={styles.brand}>
            LauraTV
          </Text>

          <View style={styles.divider} />

          <Text style={styles.eyebrow}>
            MAINTENANCE
          </Text>

          <Text style={styles.title}>
            {announcement.title}
          </Text>

          <Text style={styles.message}>
            {announcement.message}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retry LauraTV"
            activeOpacity={0.82}
            disabled={isRetrying}
            onPress={onRetry}
            style={[
              styles.button,
              isRetrying &&
                styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {isRetrying
                ? 'Checking…'
                : 'Retry'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            LauraTV will continue automatically once maintenance has ended.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },

  content: {
    alignItems: 'center',
  },

  logo: {
    width: 76,
    height: 76,
    borderRadius: 18,
    marginBottom: 16,
  },

  brand: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  divider: {
    width: 34,
    height: 1,
    marginTop: 22,
    marginBottom: 28,
    backgroundColor: colors.status.warning,
    opacity: 0.85,
  },

  eyebrow: {
    color: colors.status.warning,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 12,
  },

  title: {
    color: colors.text.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
  },

  message: {
    marginTop: 14,
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 440,
  },

  button: {
    width: '100%',
    minHeight: 52,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#0d0f12',
    fontSize: 15,
    fontWeight: '800',
  },

  footer: {
    marginTop: 16,
    color: colors.text.faint,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 400,
  },
});