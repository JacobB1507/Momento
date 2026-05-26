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
        <Text style={styles.lastUpdated}>Last Updated: May 25, 2026</Text>

        <Section
          heading="Introduction"
          body={'Momento ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, who we share it with, your rights, and how to contact us. By using the Momento app, you agree to this policy.'}
        />

        <Section
          heading="1.1 Information You Provide Directly"
          body={"• Account registration: email address, phone number, password (hashed — never stored in plaintext), display name, and username.\n• Profile: optional profile photo and bio.\n• Content: photos you upload to galleries, gallery titles, comments, and direct messages."}
        />
        <Section
          heading="1.2 Information We Collect Automatically"
          body={"• Device push notification token (Expo push token) to deliver notifications.\n• Session tokens stored in device local storage (AsyncStorage) for authentication persistence."}
        />
        <Section
          heading="1.3 Contacts (Optional)"
          body="If you grant permission, we access your device contacts solely to help you find friends already using Momento. Phone numbers are hashed using SHA-256 on your device before being sent to our servers. We never store raw phone numbers from your contacts. Hashed values are compared against hashed phone numbers of registered users and then discarded. You can revoke contacts permission at any time in your device Settings."
        />
        <Section
          heading="1.4 Photos and Media"
          body="Photos you upload are stored securely on our servers (Supabase Storage, hosted on AWS us-west-2). Photos are only accessible according to the privacy setting you choose for each gallery: Private (gallery members only), Friends Only (your confirmed friends), or Public (anyone using Momento)."
        />

        <Section
          heading="2. How We Use Your Information"
          body={"We use the information we collect to:\n• Create and maintain your account.\n• Provide core app functionality: galleries, photo sharing, messaging, friend connections, and notifications.\n• Match you with friends via hashed contact lookup.\n• Deliver push notifications for activity relevant to you.\n• Enforce our Terms of Service, including detecting spam, abuse, and policy violations.\n• Process content reports submitted through the in-app reporting tool.\n• Respond to your support requests.\n• Comply with applicable law.\n\nWe do not use your information for advertising. We do not sell your data. We do not share your data with advertisers."}
        />

        <Section
          heading="3.1 With Other Users"
          body={"• Your display name, username, profile photo, and bio are visible to other users based on your privacy settings.\n• Photos in Public galleries are visible to all Momento users.\n• Photos in Friends Only galleries are visible to your confirmed friends.\n• Photos in Private galleries are visible only to gallery members you have invited.\n• Direct messages are visible only to the recipient."}
        />
        <Section
          heading="3.2 With Service Providers"
          body={"We use the following third-party service providers who process data on our behalf:\n• Supabase (database and file storage, hosted on AWS us-west-2, United States)\n• Expo (push notification delivery infrastructure)\n• Apple (Sign In with Apple authentication)\n\nWe have data processing agreements with these providers. They are not permitted to use your data for their own purposes."}
        />
        <Section
          heading="3.3 Legal Requirements"
          body="We may disclose your information if required by law, court order, or governmental authority, or if we believe disclosure is necessary to protect the rights, property, or safety of Momento, our users, or the public."
        />
        <Section
          heading="3.4 Business Transfers"
          body="If Momento is acquired or merges with another company, your information may be transferred as part of that transaction. We will notify you before your data is transferred and becomes subject to a different privacy policy."
        />

        <Section
          heading="4. Data Retention"
          body={"• Account data is retained for as long as your account is active.\n• You may delete your account at any time from Settings → Delete Account. Upon deletion, your profile, photos, galleries you own, messages, and all associated data are permanently deleted from our servers within 30 days.\n• Deleted messages are removed immediately from the recipient's view but may remain in our database for up to 30 days before permanent deletion.\n• Content reports you submit are retained for moderation and legal compliance purposes even after account deletion.\n• Hashed contact data from contact sync is not retained — it is used in real time and discarded."}
        />

        <Section
          heading="5. Data Security"
          body={"We implement industry-standard security measures including:\n• All data transmitted between the app and our servers is encrypted using TLS.\n• Passwords are hashed using bcrypt (managed by Supabase Auth — we never see or store plaintext passwords).\n• Row-Level Security (RLS) policies in our database ensure users can only access data they are authorized to see.\n• Contact phone numbers are hashed on-device before transmission and never stored in raw form.\n\nNo method of transmission or storage is 100% secure. If we become aware of a security breach affecting your data, we will notify you as required by applicable law."}
        />

        <Section
          heading="6. Children's Privacy"
          body="Momento is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at getmomentoapp@gmail.com and we will delete it promptly. Users between 13 and 17 may use Momento only with verifiable parental or guardian consent."
        />

        <Section
          heading="7. Your Rights and Choices"
          body={"Depending on where you live, you may have the following rights:\n• Access: request a copy of the personal data we hold about you.\n• Correction: request that we correct inaccurate information.\n• Deletion: request deletion of your account and associated data (Settings → Delete Account, or contact us).\n• Portability: request your data in a portable format.\n• Objection: object to certain processing of your data.\n• Withdraw consent: where processing is based on consent (e.g. contacts permission), you may withdraw it at any time via device Settings.\n\nTo exercise any of these rights, contact us at getmomentoapp@gmail.com. We will respond within 30 days.\n\nCalifornia residents: you have additional rights under the CCPA, including the right to know what personal information is sold or disclosed (we do not sell personal information) and the right to non-discrimination for exercising your rights."}
        />

        <Section
          heading="8. Third-Party Links and Services"
          body="The app may allow you to share content via third-party platforms (SMS, WhatsApp, email). We are not responsible for the privacy practices of those platforms. Review their privacy policies before sharing."
        />

        <Section
          heading="9. Changes to This Policy"
          body={'We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last Updated" date and, where appropriate, by sending an in-app notification or email. Continued use of Momento after changes become effective constitutes your acceptance of the revised policy.'}
        />

        <Section
          heading="10. Contact Us"
          body={"If you have questions about this Privacy Policy or your personal data, contact us at:\nEmail: getmomentoapp@gmail.com"}
        />
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
