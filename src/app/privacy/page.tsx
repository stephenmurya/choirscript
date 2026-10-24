import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | ChoirScript",
  description: "How ChoirScript collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains what ChoirScript collects, why it is used, and the choices you have about your information."
      effectiveDate="October 24, 2026"
    >
      <p>
        ChoirScript is provided by Omen Interactive Visuals, also known as Omen IV. In this
        policy, “ChoirScript,” “we,” “us,” and “our” refer to Omen Interactive Visuals and the
        ChoirScript service.
      </p>

      <LegalSection title="Information we collect">
        <p>We collect information that is needed to provide and protect ChoirScript:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground/70">
          <li>
            <strong className="font-medium text-foreground">Account information:</strong> your
            name, email address, profile image, sign-in provider, and account identifier. If you
            sign in with Google, Google provides this information according to the permissions
            shown during sign-in.
          </li>
          <li>
            <strong className="font-medium text-foreground">Your choir content:</strong> song
            titles, lyrics, syllables, vocal-part cues, timing, techniques, notes, and workspace
            settings that you create or upload.
          </li>
          <li>
            <strong className="font-medium text-foreground">Shared snapshots:</strong> when you
            choose to create a read-only link, we store a copy of that song so the link can work.
          </li>
          <li>
            <strong className="font-medium text-foreground">Device and service information:</strong>{" "}
            basic technical information such as IP address, browser type, device type, and error
            or security logs may be processed by our hosting and infrastructure providers.
          </li>
          <li>
            <strong className="font-medium text-foreground">Browser storage:</strong> ChoirScript
            may store preferences, onboarding status, and migration progress on your device so the
            app remembers your choices and preserves older local work.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use your information">
        <p>We use this information to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground/70">
          <li>create and secure your account;</li>
          <li>save, sync, display, print, and share the choir scripts you ask us to process;</li>
          <li>maintain the service, prevent misuse, and troubleshoot problems;</li>
          <li>communicate important service, security, or policy updates; and</li>
          <li>comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
        <p>We do not sell your personal information or use your song content for advertising.</p>
      </LegalSection>

      <LegalSection title="Service providers">
        <p>
          ChoirScript relies on trusted service providers to operate. Google Firebase provides
          authentication and cloud data storage. Vercel provides application hosting and storage
          for read-only share snapshots. These providers process information on our behalf under
          their own security and privacy terms.
        </p>
        <p>
          If you choose Google sign-in, Google also processes your sign-in directly under Google’s
          privacy policy. We receive only the account information you approve during sign-in.
        </p>
      </LegalSection>

      <LegalSection title="Read-only share links">
        <p>
          A share link can be opened by anyone who has it. Shared links are snapshots, so later
          edits to your private song do not update an existing link. Before sharing, make sure the
          snapshot does not include lyrics, notes, names, or other information you do not have
          permission to share.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep information">
        <p>
          We keep account and workspace information while your account is active and as reasonably
          needed to operate the service, meet legal obligations, resolve disputes, and protect the
          service. You can delete songs from your workspace. Read-only snapshots may remain
          available through their links unless they are removed by us or the service is retired.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can review and update your profile name in ChoirScript, delete songs you control,
          choose whether to create a public share link, and clear browser-stored preferences using
          your browser settings. You may also request access to, correction of, or deletion of
          personal information where applicable law provides those rights.
        </p>
      </LegalSection>

      <LegalSection title="Security and international processing">
        <p>
          We use reasonable technical and organizational safeguards to protect information. No
          online service can guarantee complete security. Our service providers may process data
          in countries other than the one where you live, subject to the safeguards required by
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Children’s privacy">
        <p>
          ChoirScript is not directed to children under 13, and we do not knowingly collect their
          personal information. If you believe a child has provided personal information, please
          contact us so we can review and remove it where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this policy as ChoirScript changes. We will post the revised policy here
          and update the effective date. When a change is important, we may also provide notice in
          the service.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions or requests may be directed to Omen Interactive Visuals (Omen IV)
          through the official support contact published for ChoirScript. We may need to verify
          your identity before completing a request involving account data.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
