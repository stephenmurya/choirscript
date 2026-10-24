import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | ChoirScript",
  description: "The terms that apply when you use ChoirScript.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms describe the rules and responsibilities that apply when you use ChoirScript."
      effectiveDate="October 24, 2026"
    >
      <p>
        ChoirScript is provided by Omen Interactive Visuals, also known as Omen IV. In these
        terms, “ChoirScript,” “we,” “us,” and “our” refer to Omen Interactive Visuals and the
        ChoirScript service.
      </p>

      <LegalSection title="Accepting these terms">
        <p>
          By creating an account, signing in, or using ChoirScript, you agree to these Terms of
          Service and acknowledge our Privacy Policy. If you do not agree, do not use the service.
          You must be at least 13 years old and legally able to enter into these terms. If you use
          ChoirScript for an organization, you confirm that you have authority to accept these
          terms for that organization.
        </p>
      </LegalSection>

      <LegalSection title="What ChoirScript provides">
        <p>
          ChoirScript is a choir-direction tool for creating, annotating, rehearsing, printing,
          and sharing lyric-based rehearsal scripts. It is not formal sheet-music software, a
          music licensing service, or a substitute for professional legal or musical advice.
        </p>
        <p>
          Features may change as the product develops. We may add, update, limit, or discontinue
          parts of the service when reasonably necessary.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You are responsible for providing accurate account information, protecting access to
          your account, and all activity performed through it. Tell us promptly if you believe
          your account has been accessed without permission. You may not share credentials in a
          way that compromises the service or another person’s information.
        </p>
      </LegalSection>

      <LegalSection title="Your content and music rights">
        <p>
          You keep ownership of the content you create or upload. You give us a limited license to
          host, copy, process, display, and transmit that content only as needed to provide and
          protect ChoirScript, including cloud sync, rehearsal views, printing, and sharing that
          you request.
        </p>
        <p>
          You are responsible for ensuring that you have permission to use, reproduce, annotate,
          and share lyrics, arrangements, notes, recordings, names, and any other material you add
          to ChoirScript. The service does not grant you rights to copyrighted songs or lyrics.
        </p>
      </LegalSection>

      <LegalSection title="Sharing songs">
        <p>
          When you create a read-only share link, anyone with that link may view the snapshot. Do
          not share confidential or restricted information. A shared snapshot does not update when
          you later edit the private song, and creating a new link does not necessarily disable an
          earlier one.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You may not use ChoirScript to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground/70">
          <li>break the law or violate another person’s rights;</li>
          <li>upload or share content you do not have permission to use;</li>
          <li>harass, deceive, exploit, or harm another person;</li>
          <li>introduce malware, disrupt the service, or bypass security measures;</li>
          <li>probe, scrape, reverse engineer, or access the service in an abusive manner; or</li>
          <li>use the service to send spam or distribute unlawful material.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          ChoirScript uses third-party services, including Google Firebase and Vercel, for sign-in,
          storage, and hosting. Your use of features provided by those services may also be subject
          to their terms and policies. We are not responsible for third-party services outside our
          reasonable control.
        </p>
      </LegalSection>

      <LegalSection title="Availability and backups">
        <p>
          We work to keep ChoirScript available and protect saved work, but uninterrupted access
          and perfect data preservation cannot be guaranteed. Keep independent copies or exports
          of material that is important to you. Planned maintenance, security work, internet
          failures, or events outside our control may interrupt the service.
        </p>
      </LegalSection>

      <LegalSection title="Suspension and termination">
        <p>
          You may stop using ChoirScript at any time. We may suspend or end access when reasonably
          necessary to protect the service or its users, comply with law, respond to a serious
          breach of these terms, or discontinue the service. Provisions that should reasonably
          continue after termination, including content responsibility, disclaimers, and liability
          limits, will remain in effect.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers">
        <p>
          ChoirScript is provided “as is” and “as available.” To the fullest extent permitted by
          law, we disclaim implied warranties, including merchantability, fitness for a particular
          purpose, non-infringement, and any warranty that the service will always be uninterrupted,
          secure, or error-free. Nothing in these terms excludes rights that cannot legally be
          excluded.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Omen Interactive Visuals and its suppliers will
          not be liable for indirect, incidental, special, consequential, exemplary, or punitive
          damages, or for loss of data, profits, goodwill, or business opportunity arising from
          ChoirScript. Our total liability for claims relating to the service will not exceed the
          amount you paid us for the service during the 12 months before the event giving rise to
          the claim, or the minimum amount required by applicable law if you paid nothing.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms as ChoirScript changes. We will post the revised terms here and
          update the effective date. If a change is important, we may also provide notice in the
          service. Continuing to use ChoirScript after updated terms take effect means you accept
          them.
        </p>
      </LegalSection>

      <LegalSection title="Governing terms">
        <p>
          These terms are governed by applicable law, without regard to conflict-of-law rules. If
          any provision is unenforceable, the remaining provisions will continue in effect. These
          terms and the Privacy Policy form the agreement between you and us concerning
          ChoirScript, unless another written agreement expressly applies.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms may be directed to Omen Interactive Visuals (Omen IV)
          through the official support contact published for ChoirScript.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
