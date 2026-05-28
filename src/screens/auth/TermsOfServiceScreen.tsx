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
        <Text style={styles.lastUpdated}>Last Updated: May 25, 2026</Text>

        <Section
          heading="Introduction"
          body={'These Terms of Service ("Terms") govern your use of the Momento mobile application ("App") operated by Momento ("we," "us," or "our"). By creating an account or using the App, you agree to these Terms. If you do not agree, do not use the App.'}
        />

        <Section
          heading="1. Eligibility"
          body={"• You must be at least 13 years old to use Momento. Users between 13 and 17 require verifiable parental or guardian consent.\n• By using Momento, you represent that you meet the age requirement above and that all information you provide is accurate.\n• Momento is currently available by invitation only during our beta period. Creating an account requires a valid invite code."}
        />

        <Section
          heading="2. Your Account"
          body={"• You are responsible for maintaining the confidentiality of your account credentials. Do not share your password with anyone.\n• You are responsible for all activity that occurs under your account, whether or not you authorized it.\n• You must provide accurate information when creating your account. Impersonating another person or entity is prohibited.\n• You may only create one account per person. Creating duplicate accounts to circumvent bans or restrictions is prohibited.\n• Notify us immediately at getmomentoapp@gmail.com if you believe your account has been compromised."}
        />

        <Section
          heading="3. Acceptable Use"
          body={"You agree not to use Momento to:\n• Post, upload, or share content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable.\n• Upload or share any content depicting nudity, sexual acts, or explicit material.\n• Upload or share content that exploits or harms minors in any way. This includes content that sexualizes minors. Violations will be reported to the National Center for Missing and Exploited Children (NCMEC) and law enforcement.\n• Harass, bully, stalk, or intimidate other users.\n• Impersonate any person or entity, or misrepresent your affiliation with a person or entity.\n• Spam other users, including sending unsolicited messages or repeatedly sending the same content.\n• Upload content you do not have the right to share, including copyrighted material owned by others without permission.\n• Use the App for any commercial purpose without our written consent.\n• Attempt to gain unauthorized access to any part of the App, our servers, or another user's account.\n• Use automated tools, bots, or scripts to interact with the App.\n• Interfere with or disrupt the integrity or performance of the App or its servers.\n• Reverse engineer, decompile, or disassemble any part of the App.\n• Violate any applicable law or regulation."}
        />

        <Section
          heading="4. Content You Post"
          body={"You retain ownership of content you upload to Momento (photos, comments, messages, gallery titles).\n\nBy uploading content, you grant Momento a non-exclusive, royalty-free, worldwide license to store, display, and distribute that content solely for the purpose of operating and providing the App to you and other users. This license ends when you delete the content or your account.\n\nYou represent and warrant that: (a) you own or have the necessary rights to the content you upload; (b) your content does not infringe any third-party intellectual property, privacy, or other rights; and (c) your content complies with these Terms.\n\nWe reserve the right (but have no obligation) to review, remove, or restrict access to content that violates these Terms or our community guidelines, at our sole discretion and without prior notice."}
        />

        <Section
          heading="5. Privacy Settings and Content Visibility"
          body={"You control who sees your galleries via three privacy settings: Private (gallery members only), Friends Only (confirmed friends), and Public (all Momento users).\n\nYou are responsible for setting appropriate privacy levels for your content. Momento is not liable for content you make publicly visible.\n\nEven private galleries are stored on our servers. Refer to our Privacy Policy for how we protect your data."}
        />

        <Section
          heading="6. Photo Removal"
          body={"• You may delete any photo you have uploaded at any time.\n• You may request removal of a photo uploaded by another gallery member. The original uploader must approve, or a majority (>50%) of gallery members must vote to approve removal, after which the photo is automatically deleted.\n• Momento may remove content at any time that violates these Terms, without requiring a vote."}
        />

        <Section
          heading="7. Reporting and Moderation"
          body={"• You may report users or content you believe violates these Terms using the in-app report feature.\n• We review reports and take action at our discretion, which may include content removal, account warnings, temporary suspension, or permanent ban.\n• We do not guarantee that all reported content will be reviewed or removed.\n• False or malicious reports submitted in bad faith may result in action against the reporting account."}
        />

        <Section
          heading="8. Blocking and Safety"
          body={"• You may block any user at any time. Blocked users cannot see your profile, message you, or interact with your content.\n• Blocking is not a guarantee of complete isolation — for example, content in shared public galleries may still be visible."}
        />

        <Section
          heading="9. Intellectual Property"
          body={"The Momento app, including its design, code, trademarks, logos, and all content created by us, is owned by Momento and protected by intellectual property laws.\n\nYou may not copy, reproduce, distribute, modify, or create derivative works of the App or its content without our written permission.\n\nIf you believe content on Momento infringes your copyright, contact us at getmomentoapp@gmail.com with: (a) identification of the copyrighted work; (b) identification of the allegedly infringing content; (c) your contact information; (d) a statement of good faith belief; and (e) a statement of accuracy under penalty of perjury."}
        />

        <Section
          heading="10. Third-Party Services"
          body={"Momento uses third-party services including Supabase (database/storage) and Expo (push notifications). Your use of the App is also subject to those providers' terms. The App allows sharing via third-party platforms (SMS, WhatsApp, email). We are not responsible for those platforms."}
        />

        <Section
          heading="11. Disclaimers"
          body={`THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. We do not guarantee that the App will be uninterrupted or error-free. We are not responsible for content posted by users.`}
        />

        <Section
          heading="12. Limitation of Liability"
          body={"TO THE MAXIMUM EXTENT PERMITTED BY LAW, MOMENTO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n\nOUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR YOUR USE OF THE APP SHALL NOT EXCEED THE GREATER OF (A) $100 USD OR (B) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM."}
        />

        <Section
          heading="13. Indemnification"
          body={
            "You agree to indemnify and hold harmless Momento and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including legal fees) arising from:\n\n" +
            "• Your use of the app.\n\n" +
            "• Your user content.\n\n" +
            "• Your violation of these Terms."
          }
        />

        <Section
          heading="14. Termination"
          body={"• You may stop using the App and delete your account at any time from Settings → Delete Account.\n• We may suspend or terminate your account at any time, with or without notice, if we believe you have violated these Terms or for any other reason at our discretion.\n• Upon termination, your right to use the App ceases. Sections 4, 9, 11, 12, 13, and 15 survive termination."}
        />

        <Section
          heading="15. Governing Law and Disputes"
          body={"• These Terms are governed by the laws of the Province of British Columbia, Canada, without regard to conflict of law principles.\n• Any disputes arising under these Terms shall be resolved in the courts located in Vancouver, British Columbia, Canada.\n• To the extent permitted by law, you waive any right to a jury trial or class action proceeding."}
        />

        <Section
          heading="16. Changes to These Terms"
          body={'We may update these Terms at any time. We will notify you of material changes by updating the "Last Updated" date and, where appropriate, by sending an in-app notification. Continued use of the App after changes become effective constitutes your acceptance of the revised Terms.'}
        />

        <Section
          heading="17. Contact"
          body="For all inquiries including privacy, legal, and support: getmomentoapp@gmail.com"
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
