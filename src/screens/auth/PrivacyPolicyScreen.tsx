import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: any };

export default function PrivacyPolicyScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section
          heading="Introduction"
          body="Momento is a photo sharing app that lets you create shared galleries with friends. This policy explains what data we collect, how we use it, and your rights."
        />
        <Section
          heading="Data We Collect"
          body="Email address and password (authentication), username and display name (profile), profile photo (optional), photos uploaded to galleries, messages sent to other users, comments posted, and friend connections."
        />
        <Section
          heading="How We Use Your Data"
          body="To operate your account and provide app features, to send notifications about gallery activity, to verify your email address. We do not sell your data to third parties. We do not show ads."
        />
        <Section
          heading="Photo Storage"
          body="Photos you upload are stored securely on Supabase cloud infrastructure. Gallery privacy settings (private, friends only, public) control who can view your photos."
        />
        <Section
          heading="Sharing With Others"
          body="Your username and profile photo are visible to other Momento users. Gallery contents are only visible based on your privacy settings. Direct messages are only visible to you and the recipient."
        />
        <Section
          heading="Data Deletion"
          body="You can delete your account at any time from Settings. This permanently removes all your data including photos, messages, and profile information."
        />
        <Section
          heading="Children's Privacy"
          body="Momento is not intended for users under 13. We do not knowingly collect data from children under 13."
        />
        <Section
          heading="Contact"
          body="Questions? Email us at getmomentoapp@gmail.com"
        />

        <Text style={styles.lastUpdated}>Last updated: May 8, 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111111',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 34,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  sectionBody: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 22,
  },
  lastUpdated: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 40,
    marginTop: 8,
  },
});
