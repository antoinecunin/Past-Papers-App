import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-secondary text-sm mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>

          <div className="space-y-8 text-secondary-dark">
            {/* 1. Acceptation */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptation des Conditions</h2>
              <p className="leading-relaxed text-secondary">
                En créant un compte et en utilisant la plateforme d&apos;annales (ci-après &quot;la
                plateforme&quot;, &quot;le service&quot;), vous acceptez sans réserve les présentes conditions
                générales d&apos;utilisation (CGU). Si vous n&apos;acceptez pas ces conditions, veuillez ne
                pas utiliser la plateforme.
              </p>
            </section>

            {/* 2. Objet */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Objet de la Plateforme</h2>
              <p className="leading-relaxed text-secondary">
                La plateforme a pour objet de permettre aux étudiants de partager et consulter des
                annales d&apos;examens au format PDF, d&apos;annoter ces documents et d&apos;échanger via des
                commentaires. Le service est fourni à titre gratuit dans un but pédagogique et
                d&apos;entraide étudiante.
              </p>
            </section>

            {/* 3. Inscription */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Inscription et Compte Utilisateur</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.1. Conditions d&apos;inscription</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>L&apos;inscription est réservée aux étudiants</li>
                    <li>Vous devez fournir une adresse email valide</li>
                    <li>Vous devez vérifier votre adresse email avant d&apos;accéder à la plateforme</li>
                    <li>Un seul compte par personne est autorisé</li>
                    <li>Les mineurs doivent obtenir l&apos;autorisation d&apos;un parent ou tuteur</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">3.2. Sécurité du compte</h3>
                  <p className="text-secondary mb-2">Vous vous engagez à :</p>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Choisir un mot de passe robuste et le garder confidentiel</li>
                    <li>Ne pas partager vos identifiants de connexion</li>
                    <li>Nous informer immédiatement de toute utilisation non autorisée</li>
                    <li>Être responsable de toutes les activités effectuées depuis votre compte</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 4. Utilisation */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Utilisation de la Plateforme</h2>

              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold mb-2 text-green-900">
                    ✓ Utilisations autorisées
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
                    <li>Téléverser des annales d&apos;examens dont vous disposez légitimement</li>
                    <li>Consulter et télécharger les annales disponibles</li>
                    <li>Annoter les documents et partager vos réponses</li>
                    <li>Participer aux discussions dans un esprit d&apos;entraide</li>
                    <li>Signaler les contenus inappropriés</li>
                  </ul>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold mb-2 text-red-900">✗ Utilisations interdites</h3>
                  <p className="text-sm text-red-800 mb-2">
                    Vous vous engagez à ne pas :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-red-800 text-sm">
                    <li>
                      Téléverser des contenus protégés par le droit d&apos;auteur sans autorisation
                    </li>
                    <li>Publier des contenus illégaux, offensants, diffamatoires ou haineux</li>
                    <li>Usurper l&apos;identité d&apos;une autre personne</li>
                    <li>Spammer ou envoyer des messages publicitaires</li>
                    <li>Tenter de contourner les mesures de sécurité</li>
                    <li>Utiliser des scripts automatisés (bots, scrapers)</li>
                    <li>Surcharger ou perturber le fonctionnement de la plateforme</li>
                    <li>Collecter les données d&apos;autres utilisateurs</li>
                    <li>Utiliser la plateforme à des fins commerciales</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 5. Contenu */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Contenu et Propriété Intellectuelle</h2>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">5.1. Votre contenu</h3>
                  <p className="text-secondary mb-2">
                    Lorsque vous téléversez des examens ou publiez des commentaires :
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-secondary">
                    <li>Vous restez propriétaire de votre contenu</li>
                    <li>
                      Vous accordez à la plateforme une licence non exclusive pour stocker,
                      afficher et partager ce contenu avec les autres utilisateurs
                    </li>
                    <li>Vous garantissez disposer des droits nécessaires sur le contenu partagé</li>
                    <li>Vous êtes responsable du contenu que vous publiez</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">5.2. Droit d&apos;auteur</h3>
                  <p className="text-secondary">
                    Nous respectons le droit d&apos;auteur. Si vous estimez qu&apos;un contenu viole vos
                    droits, veuillez nous contacter immédiatement. Nous nous réservons le droit de
                    retirer tout contenu signalé comme contrevenant.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">5.3. Modération</h3>
                  <p className="text-secondary">
                    Nous nous réservons le droit de modérer, modifier ou supprimer tout contenu qui
                    ne respecte pas les présentes CGU, sans préavis ni justification.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Signalement */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Signalement de Contenu</h2>
              <p className="text-secondary mb-4">
                Un système de signalement est mis à votre disposition pour :
              </p>
              <ul className="list-disc list-inside space-y-1 text-secondary">
                <li>Signaler un contenu inapproprié ou offensant</li>
                <li>Signaler du spam ou des messages publicitaires</li>
                <li>Signaler un examen dans la mauvaise catégorie</li>
                <li>Signaler une violation du droit d&apos;auteur</li>
              </ul>
              <p className="mt-4 text-secondary">
                Les signalements sont traités par les administrateurs dans les meilleurs délais.
                L&apos;abus du système de signalement peut entraîner la suspension de votre compte.
              </p>
            </section>

            {/* 7. Sanctions */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                7. Sanctions et Suspension de Compte
              </h2>
              <p className="text-secondary mb-4">
                En cas de non-respect des présentes CGU, nous nous réservons le droit de :
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-warning font-bold">⚠</span>
                  <p className="text-secondary flex-1">
                    <strong>Avertissement :</strong> Notification de la violation constatée
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-warning font-bold">⚠⚠</span>
                  <p className="text-secondary flex-1">
                    <strong>Suppression de contenu :</strong> Retrait immédiat du contenu
                    problématique
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-danger font-bold">⛔</span>
                  <p className="text-secondary flex-1">
                    <strong>Suspension temporaire :</strong> Blocage de l&apos;accès pour une durée
                    déterminée
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-danger font-bold">⛔⛔</span>
                  <p className="text-secondary flex-1">
                    <strong>Suppression définitive :</strong> Fermeture du compte sans possibilité
                    de réinscription
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-secondary">
                Ces sanctions sont appliquées à notre discrétion en fonction de la gravité et de la
                récurrence des violations.
              </p>
            </section>

            {/* 8. Responsabilité */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation de Responsabilité</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-secondary mb-3">
                  La plateforme est fournie &quot;en l&apos;état&quot; sans garantie d&apos;aucune sorte.
                </p>
                <ul className="list-disc list-inside space-y-2 text-secondary text-sm">
                  <li>
                    Nous ne garantissons pas l&apos;exactitude, la qualité ou la pertinence du contenu
                    partagé par les utilisateurs
                  </li>
                  <li>
                    Nous ne sommes pas responsables des dommages résultant de l&apos;utilisation ou de
                    l&apos;impossibilité d&apos;utiliser la plateforme
                  </li>
                  <li>Nous ne garantissons pas une disponibilité 24/7 sans interruption</li>
                  <li>
                    Les utilisateurs sont seuls responsables de l&apos;utilisation qu&apos;ils font du
                    contenu disponible
                  </li>
                  <li>
                    Nous ne sommes pas responsables en cas de perte de données, bien que nous
                    mettions tout en œuvre pour les protéger
                  </li>
                </ul>
              </div>
            </section>

            {/* 9. Données personnelles */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Données Personnelles</h2>
              <p className="text-secondary">
                Le traitement de vos données personnelles est décrit en détail dans notre{' '}
                <button
                  onClick={() => navigate('privacy')}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Politique de Confidentialité
                </button>
                . En utilisant la plateforme, vous acceptez ce traitement conformément au RGPD.
              </p>
            </section>

            {/* 10. Disponibilité */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                10. Disponibilité et Maintenance
              </h2>
              <p className="text-secondary">
                Nous nous efforçons de maintenir la plateforme accessible en permanence, mais nous
                nous réservons le droit de :
              </p>
              <ul className="list-disc list-inside space-y-1 text-secondary mt-3">
                <li>Interrompre temporairement le service pour maintenance</li>
                <li>Modifier ou interrompre définitivement tout ou partie du service</li>
                <li>Limiter l&apos;accès en cas de surcharge ou de problèmes techniques</li>
              </ul>
              <p className="mt-4 text-secondary">
                Nous nous engageons à minimiser les interruptions et à vous prévenir dans la mesure
                du possible.
              </p>
            </section>

            {/* 11. Modifications des CGU */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                11. Modifications des Conditions
              </h2>
              <p className="text-secondary">
                Nous nous réservons le droit de modifier les présentes CGU à tout moment. Les
                modifications seront publiées sur cette page avec mise à jour de la date. Toute
                utilisation de la plateforme après modification vaut acceptation des nouvelles
                conditions. Les changements significatifs vous seront notifiés par email.
              </p>
            </section>

            {/* 12. Résiliation */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Résiliation</h2>
              <div className="space-y-3">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">12.1. Par l&apos;utilisateur</h3>
                  <p className="text-secondary">
                    Vous pouvez supprimer votre compte à tout moment depuis votre profil. La
                    suppression est immédiate et définitive. Vos données personnelles seront
                    supprimées conformément à notre politique de confidentialité.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">12.2. Par la plateforme</h3>
                  <p className="text-secondary">
                    Nous pouvons suspendre ou supprimer votre compte en cas de violation des
                    présentes CGU, sans préavis ni indemnité. Les contenus publiés pourront être
                    conservés de manière anonymisée.
                  </p>
                </div>
              </div>
            </section>

            {/* 13. Droit applicable */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Droit Applicable et Litiges</h2>
              <p className="text-secondary">
                Les présentes CGU sont régies par le droit français. En cas de litige, nous vous
                invitons à nous contacter en premier lieu pour tenter de trouver une solution
                amiable. À défaut, les tribunaux français seront seuls compétents.
              </p>
            </section>

            {/* 14. Contact */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Nous Contacter</h2>
              <p className="text-secondary mb-4">
                Pour toute question concernant ces conditions générales d&apos;utilisation :
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Email :</strong>{' '}
                  <a href="mailto:support@annales.example.com" className="text-primary hover:underline">
                    support@annales.example.com
                  </a>
                </p>
              </div>
            </section>

            {/* Séparateur */}
            <div className="border-t border-gray-200 pt-6 mt-8">
              <p className="text-center text-sm text-secondary">
                En utilisant la plateforme, vous reconnaissez avoir lu, compris et accepté les
                présentes conditions générales d&apos;utilisation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
