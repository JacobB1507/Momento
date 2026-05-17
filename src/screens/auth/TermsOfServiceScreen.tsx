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

export default function TermsOfServiceScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section
          heading="Acceptance of Terms"
          body="By creating a Momento account you agree to these Terms of Service. If you do not agree, do not use the app. We may update these terms from time to time; continued use of the app after changes constitutes acceptance."
        />
        <Section
          heading="Eligibility"
          body="You must be at least 13 years old to use Momento. By registering, you confirm that you meet this requirement. Accounts found to belong to users under 13 will be terminated."
        />
        <Section
          heading="Your Account"
          body="You are responsible for maintaining the security of your account credentials. You must provide accurate information at signup. You may not share your account or use another person's account without their permission."
        />
        <Section
          heading="Acceptable Use"
          body="You agree not to upload content that is illegal, harassing, abusive, or infringes on another person's rights. You may not use Momento to spam, impersonate others, or engage in any activity that disrupts the service or other users."
        />
        <Section
          heading="Content You Upload"
          body="You retain ownership of photos and content you upload. By uploading to Momento you grant us a limited license to store and display that content to users you have permitted. We do not claim ownership of your content."
        />
        <Section
          heading="Content Removal"
          body="We reserve the right to remove content that violates these terms or that we determine is harmful to the community, without prior notice."
        />
        <Section
          heading="Private Beta"
          body="Momento is currently in private beta. Features may change, be removed, or be unavailable at any time. We are not liable for any data loss during this beta period, though we take reasonable precautions to protect your data."
        />
        <Section
          heading="Account Termination"
          body="We may suspend or terminate your account if you violate these terms. You may delete your account at any time from Settings, which will permanently remove your data."
        />
        <Section
          heading="Disclaimers"
          body="Momento is provided 'as is' without warranties of any kind. We are not responsible for content uploaded by other users. Our liability to you is limited to the maximum extent permitted by applicable law."
        />
        <Section
          heading="Contact"
          body="Questions about these terms? Email us at getmomentoapp@gmail.com"
        />

        <Text style={styles.lastUpdated}>Last updated: May 11, 2026</Text>
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
