import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/common/Header';
import { colors } from '../src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header showBack={true} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Header Title */}
          <View style={styles.headerSection}>
            <Text style={styles.metaBadge}>SESSION PREFERENCES</Text>
            <Text style={styles.screenTitle}>Personal Lounge</Text>
            <Text style={styles.screenSubtitle}>
              Private session settings, local storage, and security guarantees.
            </Text>
          </View>

          {/* Privacy Architecture Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={18} color={colors.status.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Privacy Architecture</Text>
                <Text style={styles.cardSubtitle}>Zero-knowledge ephemeral lounge design</Text>
              </View>
            </View>

            <Text style={styles.privacyBody}>
              LauraTV contains zero public account registration, password databases, tracking pixels, or public directory indexes. Cowatch sessions are strictly private and room-code/slug protected. Chat messages and WebRTC media streams are completely ephemeral and never persisted.
            </Text>
          </View>

          {/* Quick Navigation Card */}
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/copyright')}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.menuText}>Copyright &amp; Content Policy</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/(tabs)/cowatch')}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.menuText}>Watch Together Lounge</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          </View>

          {/* Clean User-Facing Release Identity */}
          <View style={styles.identityBox}>
            <Text style={styles.identityTitle}>LauraTV v1.0.0</Text>
            <Text style={styles.identitySubtitle}>Private Cinematic Lounge</Text>
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
    paddingBottom: 36,
  },
  contentWrapper: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  metaBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    lineHeight: 17,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  privacyBody: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  menuCard: {
    backgroundColor: colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: 4,
    marginBottom: 18,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: 16,
  },
  identityBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  identityTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  identitySubtitle: {
    fontSize: 10,
    color: colors.text.faint,
  },
});
