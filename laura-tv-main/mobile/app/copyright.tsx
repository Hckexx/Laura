import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../src/components/common/Header';
import { colors } from '../src/theme/colors';

export default function CopyrightScreen() {
  const openCopyrightEmail = () => {
    void Linking.openURL('mailto:copyright@theunfilteredgoose.in');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header showBack={true} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.metaBadge}>
              LEGAL &amp; INTELLECTUAL PROPERTY
            </Text>

            <Text style={styles.screenTitle}>Legal</Text>

            <Text style={styles.lastUpdated}>
              Last Updated: September 2026
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              1. About LauraTV
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV is a private software project that provides an interface
              for discovering media, accessing viewing experiences, and using
              features such as synchronized Cowatch sessions.
            </Text>

            <Text style={styles.sectionNote}>
              LauraTV does not claim ownership of third-party movies,
              television programs, characters, artwork, trademarks, or other
              intellectual property merely because they may be referenced,
              displayed, indexed, linked, embedded, or otherwise accessible
              through the service.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              2. LauraTV Original Material
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV retains rights in material originally created
              specifically for the project, including its name, branding, logo,
              original interface design, original written content, custom
              software, and other original project assets.
            </Text>

            <Text style={styles.sectionNote}>
              This does not extend to third-party material incorporated into or
              referenced by LauraTV. Third-party software, libraries, assets,
              trademarks, and other materials remain subject to the rights and
              licences of their respective owners.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              3. Third-Party Content &amp; Intellectual Property
            </Text>

            <Text style={styles.sectionBody}>
              Movies, television shows, posters, artwork, titles, descriptions,
              characters, trademarks, logos, audiovisual works, and other
              third-party materials belong to their respective owners and
              rights holders.
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV makes no claim of copyright or other proprietary
              ownership over such third-party material.
            </Text>

            <Text style={styles.sectionNote}>
              The appearance or availability of third-party material through
              LauraTV does not by itself imply that LauraTV is affiliated with,
              sponsored by, endorsed by, or officially associated with the
              relevant creator, studio, distributor, platform, or rights
              holder.
            </Text>

            <Text style={styles.sectionNote}>
              All trademarks and registered trademarks remain the property of
              their respective owners.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              4. External Services &amp; Content Sources
            </Text>

            <Text style={styles.sectionBody}>
              Some material or functionality accessible through LauraTV may
              originate from, link to, embed, communicate with, or otherwise
              depend upon independent third-party services.
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV does not claim ownership or control over content stored
              or operated exclusively on infrastructure belonging to
              independent third parties.
            </Text>

            <Text style={styles.sectionNote}>
              Where a complaint concerns something controlled by LauraTV
              itself, such as a LauraTV page, link, reference, image, metadata
              entry, or other project-controlled material, LauraTV can review
              and, where appropriate, modify, disable, or remove that material.
            </Text>

            <Text style={styles.sectionNote}>
              LauraTV cannot directly delete or modify material hosted
              exclusively on infrastructure that it does not operate or
              control.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              5. User Responsibility
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV is intended for personal use within its intended private
              audience.
            </Text>

            <Text style={styles.sectionBody}>
              Users are responsible for using LauraTV in accordance with laws
              and regulations applicable to them and for respecting the rights
              of copyright owners and other third parties.
            </Text>

            <Text style={styles.sectionNote}>
              Nothing on LauraTV grants users ownership of or a licence to
              redistribute, reproduce, sell, re-upload, commercially exploit,
              or otherwise exercise rights over third-party material except
              where those rights have separately been granted by the relevant
              rights holder or applicable law.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              6. Rights Holder Requests &amp; Takedowns
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV respects intellectual property rights.
            </Text>

            <Text style={styles.sectionBody}>
              If you are a copyright owner, rights holder, or an authorised
              representative and believe that something controlled or
              referenced by LauraTV infringes your rights or should be removed,
              please contact us directly.
            </Text>

            <Text style={styles.sectionNote}>
              A request should preferably include:
            </Text>

            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                • Identification of the work or material concerned.
              </Text>

              <Text style={styles.bulletItem}>
                • The LauraTV page, URL, link, image, reference, or other item
                involved.
              </Text>

              <Text style={styles.bulletItem}>
                • A clear explanation of the issue.
              </Text>

              <Text style={styles.bulletItem}>
                • Your name and contact information.
              </Text>

              <Text style={styles.bulletItem}>
                • Where relevant, information showing that you are the rights
                holder or authorised to act on their behalf.
              </Text>
            </View>

            <Text style={styles.sectionNote}>
              You do not need to use a particular form before contacting us.
            </Text>

            <Text style={styles.sectionNote}>
              LauraTV will review legitimate requests in good faith and may
              remove, disable, replace, or otherwise modify LauraTV-controlled
              material where appropriate.
            </Text>

            <Text style={styles.sectionNote}>
              If the disputed material exists exclusively on an independent
              third-party service, we may direct you to the relevant third
              party because LauraTV may not have the technical ability or
              authority to remove the underlying material itself.
            </Text>
          </View>

          {/* Section 7 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              7. No Ownership Claim Through Reference or Access
            </Text>

            <Text style={styles.sectionBody}>
              Displaying, indexing, linking to, embedding, identifying, or
              providing an interface that interacts with third-party material
              does not constitute a claim by LauraTV that the material belongs
              to LauraTV.
            </Text>

            <Text style={styles.sectionNote}>
              Copyright and other intellectual-property rights remain with
              their respective owners unless expressly stated otherwise.
            </Text>
          </View>

          {/* Section 8 */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              8. Availability &amp; Changes
            </Text>

            <Text style={styles.sectionBody}>
              LauraTV may change, remove, disable, or discontinue features,
              links, references, integrations, or other parts of the service at
              any time.
            </Text>

            <Text style={styles.sectionNote}>
              Third-party services may also change or become unavailable
              independently of LauraTV.
            </Text>

            <Text style={styles.sectionNote}>
              Nothing on this page is intended to waive, restrict, or override
              rights or obligations that apply under applicable law.
            </Text>
          </View>

          {/* Contact Box */}
          <View style={styles.agentBox}>
            <Text style={styles.agentBadge}>
              LEGAL &amp; RIGHTS HOLDER CONTACT
            </Text>

            <Text style={styles.agentTitle}>
              LauraTV Legal Inquiries
            </Text>

            <Text style={styles.agentSubtitle}>
              For copyright concerns, intellectual-property questions,
              takedown requests, or other legal inquiries relating to LauraTV,
              contact:
            </Text>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={openCopyrightEmail}
              activeOpacity={0.7}
            >
              <Ionicons
                name="mail-outline"
                size={16}
                color={colors.accent.primary}
              />

              <Text style={styles.emailText}>
                copyright@theunfilteredgoose.in
              </Text>
            </TouchableOpacity>

            <Text style={styles.agentNote}>
              Please identify the relevant material clearly so that the issue
              can be reviewed efficiently.
            </Text>

            <Text style={styles.agentNote}>
              LauraTV prefers to address legitimate concerns directly and
              promptly whenever possible.
            </Text>
          </View>

          {/* Policy Update Note */}
          <View style={styles.policyFooter}>
            <Text style={styles.policyFooterText}>
              LauraTV may update this page as the project, its technical
              architecture, or applicable requirements evolve.
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },

  headerSection: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: 20,
  },

  metaBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.4,
  },

  lastUpdated: {
    fontSize: 11,
    color: colors.text.faint,
    marginTop: 4,
    fontFamily: 'monospace',
  },

  sectionBlock: {
    marginBottom: 20,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },

  sectionBody: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
  },

  sectionNote: {
    fontSize: 12,
    color: colors.text.faint,
    lineHeight: 17,
  },

  bulletList: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  bulletItem: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },

  agentBox: {
    backgroundColor: colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },

  agentBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent.primary,
    letterSpacing: 1.2,
  },

  agentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },

  agentSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },

  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent.muted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  emailText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent.primary,
    fontFamily: 'monospace',
  },

  agentNote: {
    fontSize: 12,
    color: colors.text.faint,
    lineHeight: 17,
    marginTop: 2,
  },

  policyFooter: {
    marginTop: 24,
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  policyFooterText: {
    fontSize: 11,
    color: colors.text.faint,
    lineHeight: 16,
  },
});