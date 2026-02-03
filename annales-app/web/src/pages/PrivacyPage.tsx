import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-border p-8 md:p-12">
          {/* Header avec bouton retour */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-primary hover:text-primary-hover transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>

          <h1 className="text-3xl font-bold text-secondary-dark mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-secondary text-sm mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="space-y-8 text-secondary-dark">
            {/* 1. Introduction */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                La présente politique de confidentialité décrit comment la plateforme d&apos;annales
                (ci-après &quot;nous&quot;, &quot;notre&quot; ou &quot;la plateforme&quot;) collecte, utilise, stocke et protège
                vos données personnelles conformément au Règlement Général sur la Protection des Données
                (RGPD) et à la loi Informatique et Libertés.
              </p>
            </section>

            {/* 2. Responsable du traitement */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Responsable du Traitement</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p>
                  <strong>Plateforme d&apos;Annales Étudiantes</strong>
                </p>
                <p>Contact : privacy@annales.example.com</p>
                <p className="text-sm text-secondary mt-2">
                  Pour toute question concernant vos données personnelles, vous pouvez nous contacter
                  à l&apos;adresse ci-dessus.
                </p>
              </div>
            </section>

            {/* 3. Données collectées */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Données Collectées</h2>
              <p className="mb-4">Nous collectons les données suivantes :</p>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.1. Données d&apos;identification</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Adresse email (obligatoire pour l&apos;inscription)</li>
                    <li>Prénom et nom (obligatoires)</li>
                    <li>Mot de passe (chiffré avec bcrypt)</li>
                    <li>Rôle utilisateur (utilisateur standard ou administrateur)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.2. Données de contenu</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Examens téléversés (fichiers PDF)</li>
                    <li>Commentaires et annotations sur les examens</li>
                    <li>Réponses aux commentaires (threads de discussion)</li>
                    <li>Signalements de contenu</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.3. Données techniques</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Adresse IP (lors de la connexion)</li>
                    <li>Date et heure de connexion</li>
                    <li>Type de navigateur et système d&apos;exploitation</li>
                    <li>Tokens de session (JWT stockés localement)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Finalités et base légale */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Finalités et Base Légale</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-200 p-3 text-left">Finalité</th>
                      <th className="border border-gray-200 p-3 text-left">Base légale</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Création et gestion de votre compte
                      </td>
                      <td className="border border-gray-200 p-3">Exécution du contrat</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Partage et consultation d&apos;annales
                      </td>
                      <td className="border border-gray-200 p-3">Exécution du contrat</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Modération et lutte contre les abus
                      </td>
                      <td className="border border-gray-200 p-3">Intérêt légitime</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Amélioration de la plateforme
                      </td>
                      <td className="border border-gray-200 p-3">Intérêt légitime</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-3">
                        Respect des obligations légales
                      </td>
                      <td className="border border-gray-200 p-3">Obligation légale</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Durée de conservation */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Durée de Conservation</h2>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>
                  <strong>Compte actif :</strong> vos données sont conservées tant que votre compte est
                  actif
                </li>
                <li>
                  <strong>Après suppression de compte :</strong> vos données personnelles
                  (email, nom, prénom) sont supprimées immédiatement. Vos contributions (examens,
                  commentaires) sont anonymisées (auteur mis à null) et conservées pour préserver
                  l&apos;intérêt de la communauté
                </li>
                <li>
                  <strong>Données de connexion :</strong> conservées 12 mois maximum pour des raisons
                  de sécurité
                </li>
                <li>
                  <strong>Signalements :</strong> supprimés définitivement lors de la suppression de
                  votre compte
                </li>
              </ul>
            </section>

            {/* 6. Destinataires */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Destinataires des Données</h2>
              <p className="mb-4">Vos données peuvent être partagées avec :</p>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>
                  <strong>Hébergement :</strong> nos serveurs sont auto-hébergés. Nous utilisons MongoDB
                  pour la base de données et MinIO pour le stockage des fichiers PDF
                </li>
                <li>
                  <strong>Service email :</strong> un prestataire SMTP pour l&apos;envoi des emails de
                  vérification et de réinitialisation de mot de passe
                </li>
                <li>
                  <strong>Administrateurs :</strong> pour la modération du contenu signalé
                </li>
              </ul>
              <p className="mt-4 text-secondary">
                Aucune donnée n&apos;est vendue ou partagée avec des tiers à des fins commerciales.
              </p>
            </section>

            {/* 7. Vos droits */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Vos Droits</h2>
              <p className="mb-4">
                Conformément au RGPD, vous disposez des droits suivants concernant vos données
                personnelles :
              </p>

              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Droit d&apos;accès
                  </h3>
                  <p className="text-sm text-blue-800">
                    Vous pouvez consulter et exporter l&apos;ensemble de vos données depuis votre profil
                    (bouton &quot;Exporter mes données&quot;).
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Droit de rectification
                  </h3>
                  <p className="text-sm text-blue-800">
                    Vous pouvez modifier vos prénom, nom et email depuis votre profil.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;)
                  </h3>
                  <p className="text-sm text-blue-800">
                    Vous pouvez supprimer votre compte à tout moment depuis votre profil (bouton
                    &quot;Supprimer mon compte&quot;). Vos données personnelles seront supprimées et vos
                    contributions anonymisées.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Droit à la portabilité
                  </h3>
                  <p className="text-sm text-blue-800">
                    Vous pouvez exporter vos données au format JSON depuis votre profil.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-1 text-blue-900">
                    ✓ Droit d&apos;opposition et de limitation
                  </h3>
                  <p className="text-sm text-blue-800">
                    Vous pouvez vous opposer au traitement de vos données en supprimant votre compte
                    ou en nous contactant.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-secondary">
                Pour exercer vos droits, contactez-nous à{' '}
                <a href="mailto:privacy@annales.example.com" className="text-primary hover:underline">
                  privacy@annales.example.com
                </a>
              </p>
            </section>

            {/* 8. Sécurité */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Sécurité</h2>
              <p className="mb-4">Nous mettons en œuvre les mesures de sécurité suivantes :</p>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>Chiffrement des mots de passe avec bcrypt (10 rounds de salage)</li>
                <li>Authentification par JWT avec expiration</li>
                <li>HTTPS obligatoire en production (TLS/SSL)</li>
                <li>Protection CORS et en-têtes de sécurité (Helmet.js)</li>
                <li>Limitation du taux de requêtes (rate limiting)</li>
                <li>Validation stricte des entrées utilisateur (Zod)</li>
                <li>Séparation des environnements (dev/prod)</li>
                <li>Filtrage IP au niveau du reverse proxy (Nginx)</li>
              </ul>
            </section>

            {/* 9. Cookies */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Cookies et Stockage Local</h2>
              <p className="mb-4">
                Notre plateforme utilise le stockage local du navigateur (localStorage) pour :
              </p>
              <ul className="space-y-2 list-disc list-inside text-secondary">
                <li>
                  <strong>Token d&apos;authentification (JWT) :</strong> nécessaire au fonctionnement de
                  la plateforme, conservé jusqu&apos;à déconnexion
                </li>
                <li>
                  <strong>Préférences utilisateur :</strong> paramètres d&apos;affichage et de navigation
                </li>
              </ul>
              <p className="mt-4 text-secondary">
                Nous n&apos;utilisons pas de cookies tiers ou de trackers publicitaires. Tous les
                éléments stockés sont strictement nécessaires au fonctionnement de la plateforme.
              </p>
            </section>

            {/* 10. Transferts internationaux */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Transferts Internationaux</h2>
              <p className="text-secondary">
                Vos données sont hébergées en France et ne font l&apos;objet d&apos;aucun transfert hors de
                l&apos;Union Européenne.
              </p>
            </section>

            {/* 11. Mineurs */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Protection des Mineurs</h2>
              <p className="text-secondary">
                Notre plateforme est destinée aux étudiants majeurs. Si vous avez moins de 18 ans,
                l&apos;autorisation d&apos;un parent ou tuteur légal est requise avant toute inscription.
              </p>
            </section>

            {/* 12. Modifications */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                12. Modifications de la Politique
              </h2>
              <p className="text-secondary">
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout
                moment. Toute modification sera publiée sur cette page avec une mise à jour de la
                date. Les changements significatifs vous seront notifiés par email.
              </p>
            </section>

            {/* 13. Réclamations */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Droit de Réclamation</h2>
              <p className="text-secondary">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
                réclamation auprès de la Commission Nationale de l&apos;Informatique et des Libertés
                (CNIL) :
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="font-semibold">CNIL</p>
                <p className="text-sm text-secondary">3 Place de Fontenoy</p>
                <p className="text-sm text-secondary">TSA 80715</p>
                <p className="text-sm text-secondary">75334 Paris Cedex 07</p>
                <p className="text-sm text-secondary mt-2">
                  Site web :{' '}
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
              <h2 className="text-2xl font-semibold mb-4">14. Nous Contacter</h2>
              <p className="text-secondary mb-4">
                Pour toute question concernant cette politique de confidentialité ou vos données
                personnelles :
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Email :</strong>{' '}
                  <a
                    href="mailto:privacy@annales.example.com"
                    className="text-primary hover:underline"
                  >
                    privacy@annales.example.com
                  </a>
                </p>
                <p className="text-sm mt-2 text-secondary">
                  Nous nous engageons à répondre à toute demande dans un délai maximum de 30 jours.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
