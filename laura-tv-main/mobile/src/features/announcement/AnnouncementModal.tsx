import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { colors } from '@/theme/colors';
import type {
  AppAnnouncement,
  AnnouncementType,
} from './types';

type Props = {
  announcement: AppAnnouncement;
  visible: boolean;
  onDismiss: () => void;
};

function getTypeLabel(
  type: AnnouncementType,
): string {
  switch (type) {
    case 'warning':
      return 'NOTICE';

    case 'maintenance':
      return 'MAINTENANCE NOTICE';

    case 'info':
    default:
      return 'ANNOUNCEMENT';
  }
}

function getAccentColor(
  type: AnnouncementType,
): string {
  switch (type) {
    case 'warning':
    case 'maintenance':
      return colors.status.warning;

    case 'info':
    default:
      return colors.accent.primary;
  }
}

export function AnnouncementModal({
  announcement,
  visible,
  onDismiss,
}: Props) {
  const { width, height } =
    useWindowDimensions();

  const modalWidth = Math.min(
    Math.max(width - 32, 0),
    540,
  );

  const accentColor =
    getAccentColor(announcement.type);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
        />

        <View
          style={[
            styles.card,
            {
              width: modalWidth,
              maxHeight: height * 0.76,
            },
          ]}
        >
          <View
            style={[
              styles.accentLine,
              {
                backgroundColor:
                  accentColor,
              },
            ]}
          />

          <Text
            style={[
              styles.eyebrow,
              {
                color: accentColor,
              },
            ]}
          >
            {getTypeLabel(
              announcement.type,
            )}
          </Text>

          <Text style={styles.title}>
            {announcement.title}
          </Text>

          <ScrollView
            style={styles.messageScroller}
            contentContainerStyle={
              styles.messageContent
            }
            showsVerticalScrollIndicator={
              false
            }
            bounces={false}
          >
            <Text style={styles.message}>
              {announcement.message}
            </Text>
          </ScrollView>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Dismiss announcement"
            activeOpacity={0.82}
            onPress={onDismiss}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Got it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor:
      'rgba(0, 0, 0, 0.72)',
  },

  card: {
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    borderRadius: 18,
    backgroundColor: colors.bg.raised,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderColor: colors.border.medium,
  },

  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 10,
  },

  title: {
    color: colors.text.primary,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
  },

  messageScroller: {
    marginTop: 14,
    flexShrink: 1,
  },

  messageContent: {
    paddingBottom: 2,
  },

  message: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 23,
  },

  button: {
    minHeight: 48,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingHorizontal: 18,
    backgroundColor:
      colors.accent.primary,
  },

  buttonText: {
    color: '#0d0f12',
    fontSize: 14,
    fontWeight: '800',
  },
});