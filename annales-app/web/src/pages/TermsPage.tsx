import { ArrowLeft } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import { useInstance } from '../hooks/useInstance';

export default function TermsPage() {
  const { navigate } = useRouter();
  const { contactEmail, name } = useInstance();
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-border p-8 md:p-12">
          {/* Header with back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-primary hover:text-primary-hover transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <h1 className="text-3xl font-bold text-secondary-dark mb-2">Terms of Service</h1>
          <p className="text-secondary text-sm mb-8">
            Last updated: {new Date().toLocaleDateString('en-US')}
          </p>

          <div className="space-y-8 text-secondary-dark">
            {/* 1. Acceptance */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="leading-relaxed text-secondary">
                By creating an account and using {name} (hereinafter &quot;the platform&quot;,
                &quot;the service&quot;), you unconditionally accept these terms of service. If you
                do not accept these terms, please do not use the platform.
              </p>
            </section>

            {/* 2. Purpose */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Purpose of the Platform</h2>
              <p className="leading-relaxed text-secondary">
                The platform enables students to share and access past exam papers in PDF format,
                annotate these documents, and exchange through comments. The service is provided
                free of charge for educational purposes and student collaboration.
              </p>
            </section>

            {/* 3. Registration */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Registration and User Account</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.1. Registration Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Registration is reserved for students</li>
                    <li>You must provide a valid email address</li>
                    <li>You must verify your email address before accessing the platform</li>
                    <li>Only one account per person is permitted</li>
                    <li>Minors must obtain parental or legal guardian consent</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.2. Account Security</h3>
                  <p className="text-secondary mb-2">You agree to:</p>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Choose a strong password and keep it confidential</li>
                    <li>Not share your login credentials</li>
                    <li>Notify us immediately of any unauthorized use</li>
                    <li>Be responsible for all activities conducted from your account</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Usage */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Use of the Platform</h2>

              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold mb-2 text-green-900">✓ Permitted Uses</h3>
                  <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
                    <li>Upload past exam papers that you have legitimately obtained</li>
                    <li>View and download available past exams</li>
                    <li>Annotate documents and share your answers</li>
                    <li>Participate in discussions in a spirit of mutual assistance</li>
                    <li>Report inappropriate content</li>
                  </ul>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold mb-2 text-red-900">✗ Prohibited Uses</h3>
                  <p className="text-sm text-red-800 mb-2">You agree not to:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-800 text-sm">
                    <li>Upload content protected by copyright without authorization</li>
                    <li>Publish illegal, offensive, defamatory, or hateful content</li>
                    <li>Impersonate another person</li>
                    <li>Spam or send advertising messages</li>
                    <li>Attempt to circumvent security measures</li>
                    <li>Use automated scripts (bots, scrapers)</li>
                    <li>Overload or disrupt the operation of the platform</li>
                    <li>Collect other users&apos; data</li>
                    <li>Use the platform for commercial purposes</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 5. Content */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Content and Intellectual Property</h2>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">5.1. Your Content</h3>
                  <p className="text-secondary mb-2">When you upload exams or post comments:</p>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>You retain ownership of your content</li>
                    <li>
                      You grant the platform a non-exclusive license to store, display, and share
                      this content with other users
                    </li>
                    <li>You warrant that you have the necessary rights to the shared content</li>
                    <li>You are responsible for the content you publish</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">5.2. Copyright</h3>
                  <p className="text-secondary">
                    We respect copyright. If you believe that content infringes your rights, please
                    contact us immediately. We reserve the right to remove any content reported as
                    infringing.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">5.3. Moderation</h3>
                  <p className="text-secondary">
                    We reserve the right to moderate, modify, or remove any content that does not
                    comply with these terms, without prior notice or justification.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Reporting */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Content Reporting</h2>
              <p className="text-secondary mb-4">A reporting system is available for you to:</p>
              <ul className="list-disc list-inside space-y-1 text-secondary">
                <li>Report inappropriate or offensive content</li>
                <li>Report spam or advertising messages</li>
                <li>Report an exam filed in the wrong category</li>
                <li>Report a copyright violation</li>
              </ul>
              <p className="mt-4 text-secondary">
                Reports are reviewed by administrators as promptly as possible. Abuse of the
                reporting system may result in suspension of your account.
              </p>
            </section>

            {/* 7. Sanctions */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Sanctions and Account Suspension</h2>
              <p className="text-secondary mb-4">
                In the event of non-compliance with these terms, we reserve the right to:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-warning font-bold">⚠</span>
                  <p className="text-secondary flex-1">
                    <strong>Warning:</strong> Notification of the identified violation
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-warning font-bold">⚠⚠</span>
                  <p className="text-secondary flex-1">
                    <strong>Content removal:</strong> Immediate removal of the offending content
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-danger font-bold">⛔</span>
                  <p className="text-secondary flex-1">
                    <strong>Temporary suspension:</strong> Access blocked for a specified period
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-danger font-bold">⛔⛔</span>
                  <p className="text-secondary flex-1">
                    <strong>Permanent deletion:</strong> Account closure without the possibility of
                    re-registration
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-secondary">
                These sanctions are applied at our discretion based on the severity and recurrence
                of violations.
              </p>
            </section>

            {/* 8. Liability */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-secondary mb-3">
                  The platform is provided &quot;as is&quot; without warranty of any kind.
                </p>
                <ul className="list-disc list-inside space-y-2 text-secondary text-sm">
                  <li>
                    We do not guarantee the accuracy, quality, or relevance of content shared by
                    users
                  </li>
                  <li>
                    We are not liable for any damages resulting from the use or inability to use the
                    platform
                  </li>
                  <li>We do not guarantee uninterrupted 24/7 availability</li>
                  <li>Users are solely responsible for how they use the available content</li>
                  <li>
                    We are not liable for data loss, although we make every effort to protect your
                    data
                  </li>
                </ul>
              </div>
            </section>

            {/* 9. Personal Data */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Personal Data</h2>
              <p className="text-secondary">
                The processing of your personal data is described in detail in our{' '}
                <button
                  onClick={() => navigate('privacy')}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Privacy Policy
                </button>
                . By using the platform, you consent to such processing in accordance with the GDPR.
              </p>
            </section>

            {/* 10. Availability */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Availability and Maintenance</h2>
              <p className="text-secondary">
                We strive to keep the platform accessible at all times, but we reserve the right to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-secondary mt-3">
                <li>Temporarily interrupt the service for maintenance</li>
                <li>Modify or permanently discontinue all or part of the service</li>
                <li>Restrict access in the event of overload or technical issues</li>
              </ul>
              <p className="mt-4 text-secondary">
                We are committed to minimizing interruptions and providing advance notice whenever
                possible.
              </p>
            </section>

            {/* 11. Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to These Terms</h2>
              <p className="text-secondary">
                We reserve the right to modify these terms at any time. Changes will be published on
                this page with an updated date. Continued use of the platform after any modification
                constitutes acceptance of the new terms. Significant changes will be notified to you
                by email.
              </p>
            </section>

            {/* 12. Termination */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
              <div className="space-y-3">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">12.1. By the User</h3>
                  <p className="text-secondary">
                    You may delete your account at any time from your profile. Deletion is immediate
                    and permanent. Your personal data will be deleted in accordance with our privacy
                    policy.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">12.2. By the Platform</h3>
                  <p className="text-secondary">
                    We may suspend or delete your account in the event of a violation of these
                    terms, without prior notice or compensation. Published content may be retained
                    in anonymized form.
                  </p>
                </div>
              </div>
            </section>

            {/* 13. Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Governing Law and Disputes</h2>
              <p className="text-secondary">
                These terms are governed by applicable law. In the event of a dispute, we encourage
                you to contact us first to seek an amicable resolution. Failing that, the competent
                courts shall have exclusive jurisdiction.
              </p>
            </section>

            {/* 14. Contact */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
              <p className="text-secondary mb-4">
                For any questions regarding these terms of service:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                    {contactEmail}
                  </a>
                </p>
              </div>
            </section>

            {/* Separator */}
            <div className="border-t border-gray-200 pt-6 mt-8">
              <p className="text-center text-sm text-secondary">
                By using the platform, you acknowledge that you have read, understood, and accepted
                these terms of service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
