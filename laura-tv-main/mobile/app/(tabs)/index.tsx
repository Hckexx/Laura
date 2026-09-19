import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/common/Header';
import { colors } from '../../src/theme/colors';

const DEVELOPERS = [
  {
    name: 'Mohammed Ghouse',
    role: 'Co-founder',
    initials: 'MG',
    email: 'theunfilteredgoose@gmail.com',
    instagram: 'ghouseeeeee',
  },
  {
    name: 'Muhammed Usmaan',
    role: 'Co-founder',
    initials: 'MU',
    email: 'usmaan@gmail.com',
    instagram: 'usmaanibrahim.t',
  },
];

const CAPABILITIES = [
  {
    num: '01',
    title: 'Browse movies and TV shows',
    description: 'Explore full library catalogs, release schedules, and comprehensive details.',
  },
  {
    num: '02',
    title: 'Create private Cowatch rooms',
    description: 'Instant invitations via unique 6-character room codes or personal link slugs.',
  },
  {
    num: '03',
    title: 'Watch together with synchronized playback',
    description: 'Real-time playback synchronization so everyone stays in sync.',
  },
  {
    num: '04',
    title: 'Chat, voice, and video while watching',
    description: 'Integrated live mesh voice, video, and ephemeral room chat alongside the screen.',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Ambient Top Glow Effect */}
          <View style={styles.ambientGlow} />

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.badgeRow}>
              <View style={styles.badgePulse} />
              <Text style={styles.badgeText}>PRIVATE CINEMATIC LOUNGE</Text>
            </View>

            <Text style={styles.heroTitle}>
              A private place to watch movies and shows,{' '}
              <Text style={styles.heroTitleItalic}>alone or together.</Text>
            </Text>

            <Text style={styles.heroBody}>
              LauraTV is a private streaming interface for browsing movies and TV shows, watching on your own, or starting a private Cowatch room with friends.
            </Text>

            <Text style={styles.heroSubBody}>
              It brings discovery, synchronized playback, chat, voice, and video into one place so movie nights feel less fragmented.
            </Text>

            {/* Action Buttons */}
            <View style={[styles.actionRow, isNarrow && styles.actionRowStacked]}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/(tabs)/watch')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Browse Movies</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.bg.base} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/(tabs)/cowatch')}
                activeOpacity={0.85}
              >
                <View style={styles.greenDot} />
                <Text style={styles.secondaryButtonText}>Watch Together</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Co-founders Cards */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubtitle}>FOUNDING TEAM</Text>
            <Text style={styles.sectionTitle}>Built for Private Screenings</Text>
          </View>

          <View style={[styles.devsContainer, isNarrow && styles.devsContainerStacked]}>
            {DEVELOPERS.map((dev) => (
              <View key={dev.name} style={styles.devCard}>
                <View style={styles.devCardTop}>
                  <View style={styles.initialsBox}>
                    <Text style={styles.initialsText}>{dev.initials}</Text>
                  </View>
                  <View style={styles.foundingPill}>
                    <Text style={styles.foundingText}>FOUNDING</Text>
                  </View>
                </View>

                <Text style={styles.devName}>{dev.name}</Text>
                <Text style={styles.devRole}>{dev.role}</Text>

                <View style={styles.devDivider} />

                <TouchableOpacity
                  style={styles.devContactRow}
                  onPress={() => Linking.openURL(`mailto:${dev.email}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={13} color={colors.accent.primary} />
                  <Text style={styles.devContactText} numberOfLines={1}>
                    {dev.email}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.devContactRow}
                  onPress={() => Linking.openURL(`https://instagram.com/${dev.instagram}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-instagram" size={13} color={colors.accent.primary} />
                  <Text style={styles.devContactText} numberOfLines={1}>
                    @{dev.instagram}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Core Capabilities */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubtitle}>CORE FEATURES</Text>
            <Text style={styles.sectionTitle}>Platform Capabilities</Text>
          </View>

          <View style={styles.capabilitiesContainer}>
            {CAPABILITIES.map((cap) => (
              <View key={cap.num} style={styles.capCard}>
                <Text style={styles.capNum}>{cap.num}</Text>
                <Text style={styles.capTitle}>{cap.title}</Text>
                <Text style={styles.capDescription}>{cap.description}</Text>
              </View>
            ))}
          </View>

          {/* Footer Info */}
          <View style={styles.footerSection}>
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={() => router.push('/copyright')} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Copyright &amp; Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>•</Text>
              <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Personal Lounge</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.footerCopyright}>
              LauraTV v1.0.0 · Private Cinematic Screening
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  contentWrapper: {
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: 140,
    backgroundColor: colors.accent.glow,
    borderRadius: 70,
    opacity: 0.4,
  },
  heroSection: {
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent.muted,
    borderWidth: 1,
    borderColor: colors.accent.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
    gap: 6,
  },
  badgePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  heroTitleItalic: {
    color: colors.accent.primary,
    fontStyle: 'italic',
  },
  heroBody: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  heroSubBody: {
    fontSize: 12,
    color: colors.text.faint,
    lineHeight: 18,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionRowStacked: {
    flexDirection: 'column',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.bg.base,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.success,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  devsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  devsContainerStacked: {
    flexDirection: 'column',
  },
  devCard: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  devCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  initialsBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.primary,
  },
  foundingPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  foundingText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.text.faint,
    letterSpacing: 0.8,
  },
  devName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  devRole: {
    fontSize: 11,
    color: colors.accent.primary,
    fontWeight: '500',
  },
  devDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: 10,
  },
  devContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  devContactText: {
    fontSize: 10,
    color: colors.text.secondary,
    flex: 1,
  },
  capabilitiesContainer: {
    gap: 10,
  },
  capCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  capNum: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1,
    marginBottom: 3,
  },
  capTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  capDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  footerSection: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    alignItems: 'center',
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  footerDot: {
    fontSize: 10,
    color: colors.text.faint,
  },
  footerCopyright: {
    fontSize: 10,
    color: colors.text.faint,
  },
});
