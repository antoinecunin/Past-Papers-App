import { ArrowLeft } from 'lucide-react';
import { useInstance } from '../hooks/useInstance';

export default function PrivacyPage() {
  const { organizationName, contactEmail, name } = useInstance();
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

          <h1 className="text-3xl font-bold text-secondary-dark mb-2">
            Privacy Policy
          </h1>
          <p className="text-secondary text-sm mb-8">
            Last updated: {new Date().toLocaleDateString('en-US')}
          </p>

          <div className="space-y-8 text-secondary-dark">
            {/* 1. Introduction */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                This privacy policy describes how {name} (hereinafter &quot;we&quot;, &quot;our&quot;,
                or &quot;the platform&quot;) collects, uses, stores, and protects your personal data in
                accordance with the General Data Protection Regulation (GDPR) and applicable data
                protection legislation.
              </p>
            </section>

            {/* 2. Data Controller */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p>
                  <strong>{organizationName}</strong>
                </p>
                <p>Contact: {contactEmail}</p>
                <p className="text-sm text-secondary mt-2">
                  For any questions regarding your personal data, you may contact us at the address
                  above.
                </p>
              </div>
            </section>

            {/* 3. Data Collected */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Data Collected</h2>
              <p className="mb-4">We collect the following data:</p>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.1. Identification Data</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Email address (required for registration)</li>
                    <li>First name and last name (required)</li>
                    <li>Password (encrypted with bcrypt)</li>
                    <li>User role (standard user or administrator)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.2. Content Data</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Uploaded exams (PDF files)</li>
                    <li>Comments and annotations on exams</li>
                    <li>Replies to comments (discussion threads)</li>
                    <li>Content reports</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.3. Technical Data</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>IP address (upon login)</li>
                    <li>Date and time of login</li>
                    <li>Browser type and operating system</li>
                    <li>Session tokens (JWT stored locally)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Purposes and Legal Basis */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Purposes and Legal Basis</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 p-3 text-left">Purpose</th>
                      <th className="border border-gray-200 p-3 text-left">Legal Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Account creation and management
                      </td>
                      <td className="border border-gray-200 p-3">Performance of contract</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Sharing and viewing past exams
                      </td>
                      <td className="border border-gray-200 p-3">Performance of contract</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Moderation and abuse prevention
                      </td>
                      <td className="border border-gray-200 p-3">Legitimate interest</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Platform improvement
                      </td>
                      <td className="border border-gray-200 p-3">Legitimate interest</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Compliance with legal obligations
                      </td>
                      <td className="border border-gray-200 p-3">Legal obligation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>
                  <strong>Active account:</strong> your data is retained for as long as your account
                  remains active
                </li>
                <li>
                  <strong>After account deletion:</strong> your personal data (email, name) is
                  deleted immediately. Your contributions (exams, comments) are anonymized (author
                  set to null) and retained to preserve their value to the community
                </li>
                <li>
                  <strong>Login data:</strong> retained for a maximum of 12 months for security
                  purposes
                </li>
                <li>
                  <strong>Reports:</strong> permanently deleted upon deletion of your account
                </li>
              </ul>
            </section>

            {/* 6. Data Recipients */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data Recipients</h2>
              <p className="mb-4">Your data may be shared with:</p>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>
                  <strong>Hosting:</strong> our servers are self-hosted. We use MongoDB for the
                  database and MinIO for PDF file storage
                </li>
                <li>
                  <strong>Email service:</strong> an SMTP provider for sending verification and
                  password reset emails
                </li>
                <li>
                  <strong>Administrators:</strong> for moderation of reported content
                </li>
              </ul>
              <p className="mt-4 text-secondary">
                No data is sold or shared with third parties for commercial purposes.
              </p>
            </section>

            {/* 7. Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
              <p className="mb-4">
                In accordance with the GDPR, you have the following rights regarding your personal
                data:
              </p>

              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Right of Access
                  </h3>
                  <p className="text-sm text-blue-800">
                    You can view and export all of your data from your profile (&quot;Export My
                    Data&quot; button).
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Right to Rectification
                  </h3>
                  <p className="text-sm text-blue-800">
                    You can modify your first name, last name, and email address from your profile.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Right to Erasure (&quot;Right to Be Forgotten&quot;)
                  </h3>
                  <p className="text-sm text-blue-800">
                    You can delete your account at any time from your profile (&quot;Delete My
                    Account&quot; button). Your personal data will be deleted and your contributions
                    will be anonymized.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Right to Data Portability
                  </h3>
                  <p className="text-sm text-blue-800">
                    You can export your data in JSON format from your profile.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Right to Object and Right to Restriction
                  </h3>
                  <p className="text-sm text-blue-800">
                    You can object to the processing of your data by deleting your account or by
                    contacting us.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-secondary">
                To exercise your rights, contact us at{' '}
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </a>
              </p>
            </section>

            {/* 8. Security */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Security</h2>
              <p className="mb-4">We implement the following security measures:</p>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>Password encryption with bcrypt (10 salt rounds)</li>
                <li>JWT authentication with expiration</li>
                <li>Mandatory HTTPS in production (TLS/SSL)</li>
                <li>CORS protection and security headers (Helmet.js)</li>
                <li>Rate limiting on requests</li>
                <li>Strict user input validation (Zod)</li>
                <li>Environment separation (dev/prod)</li>
                <li>IP filtering at the reverse proxy level (Nginx)</li>
              </ul>
            </section>

            {/* 9. Cookies */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Cookies and Local Storage</h2>
              <p className="mb-4">
                Our platform uses browser local storage (localStorage) for:
              </p>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>
                  <strong>Authentication token (JWT):</strong> required for the platform to function,
                  retained until logout
                </li>
                <li>
                  <strong>User preferences:</strong> display and navigation settings
                </li>
              </ul>
              <p className="mt-4 text-secondary">
                We do not use third-party cookies or advertising trackers. All stored items are
                strictly necessary for the operation of the platform.
              </p>
            </section>

            {/* 10. International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">10. International Transfers</h2>
              <p className="text-secondary">
                Your data is hosted within the European Union and is not subject to any transfer
                outside of the European Union.
              </p>
            </section>

            {/* 11. Minors */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Protection of Minors</h2>
              <p className="text-secondary">
                Our platform is intended for adult students. If you are under 18 years of age,
                parental or legal guardian consent is required before registration.
              </p>
            </section>

            {/* 12. Modifications */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                12. Changes to This Policy
              </h2>
              <p className="text-secondary">
                We reserve the right to modify this privacy policy at any time. Any changes will be
                published on this page with an updated date. Significant changes will be notified to
                you by email.
              </p>
            </section>

            {/* 13. Complaints */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Right to Lodge a Complaint</h2>
              <p className="text-secondary">
                If you believe that your rights are not being respected, you may lodge a complaint
                with your local data protection authority. For users in France, this is the
                Commission Nationale de l&apos;Informatique et des Libertés (CNIL):
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="font-semibold">CNIL</p>
                <p className="text-sm text-secondary">3 Place de Fontenoy</p>
                <p className="text-sm text-secondary">TSA 80715</p>
                <p className="text-sm text-secondary">75334 Paris Cedex 07</p>
                <p className="text-sm text-secondary mt-2">
                  Website:{' '}
                  <a
                    href="https://www.cnil.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.cnil.fr
                  </a>
                </p>
              </div>
            </section>

            {/* 14. Contact */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
              <p className="text-secondary mb-4">
                For any questions regarding this privacy policy or your personal data:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Email:</strong>{' '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-primary hover:underline"
                  >
                    {contactEmail}
                  </a>
                </p>
                <p className="text-sm mt-2 text-secondary">
                  We are committed to responding to any request within a maximum of 30 days.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
