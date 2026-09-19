import React from 'react';
import {
  BackHandler,
  Linking,
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
import type { AppRelease } from './types';
import { LAURATV_DOWNLOAD_URL } from './update-service';

type Props = {
  release: AppRelease;
};

export function UpdateRequiredScreen({
  release,
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

  const openDownload = React.useCallback(async () => {
    try {
      await Linking.openURL(
        LAURATV_DOWNLOAD_URL,
      );
    } catch {
      // Keep the mandatory update screen visible if the
      // browser cannot be opened.
    }
  }, []);

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
            { width: contentWidth },
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
            UPDATE REQUIRED
          </Text>

          <Text style={styles.title}>
            LauraTV v{release.versionName} is available.
          </Text>

          <Text style={styles.description}>
            Your current version must be updated before you can continue.
          </Text>

          {release.releaseNotes?.trim() ? (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>
                WHAT&apos;S NEW
              </Text>

              <Text style={styles.notesText}>
                {release.releaseNotes.trim()}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Download LauraTV version ${release.versionName}`}
            activeOpacity={0.82}
            onPress={openDownload}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Download LauraTV v{release.versionName}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            The latest LauraTV release is required to keep the app compatible and secure.
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
    backgroundColor: colors.accent.primary,
    opacity: 0.8,
  },

  eyebrow: {
    color: colors.accent.primary,
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

  description: {
    marginTop: 14,
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 440,
  },

  notes: {
    width: '100%',
    marginTop: 28,
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.bg.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },

  notesLabel: {
    color: colors.text.faint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },

  notesText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 21,
  },

  button: {
    width: '100%',
    minHeight: 52,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
  },

  buttonText: {
    color: '#0d0f12',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
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