# Charte Graphique et UX - Plateforme d'Annales

> **Note importante** : Cette plateforme sera déployée en **instances multiples**, une par formation (ex: BUT Informatique IUT Robert Schuman). Le design system doit donc être **facilement thémable** et **maintenable** pour permettre la personnalisation par instance (couleurs, logo, nom) sans duplication de code.

## Philosophie de Design

### Principes Directeurs

1. **Clarté avant tout** : L'information doit être accessible en 2-3 clics maximum
2. **Minimalisme fonctionnel** : Chaque élément a une raison d'être
3. **Lisibilité optimale** : Les PDF et annotations sont au centre, l'UI s'efface
4. **Performance perçue** : Feedbacks instantanés, états de chargement clairs
5. **Accessibilité** : Contraste WCAG AA minimum, navigation au clavier
6. **Qualité de code irréprochable** : Pas de valeurs en dur, composants réutilisables, maintenabilité maximale
7. **Responsive-first** : Conception mobile d'abord, adaptatif sur tous les écrans
8. **Multi-instances** : Thémable facilement via variables d'environnement, sans duplication de code

### Cas d'Usage Principaux

1. **Consultation rapide** : Trouver et consulter une annale en moins de 30 secondes
2. **Annotation collaborative** : Ajouter des réponses texte/LaTeX/image intuitivement
3. **Organisation académique** : Filtrer par année, module, type d'examen
4. **Modération fluide** : Les admins traitent les signalements efficacement

---

## Palette de Couleurs

⚠️ **IMPORTANT - Multi-instances** : Les couleurs primaires doivent être configurables par instance via variables d'environnement. Ne jamais coder en dur `#2563eb`, toujours utiliser `primary` dans Tailwind.

### Couleurs Principales (Thémables)

```css
/* Identité académique - CONFIGURABLES PAR INSTANCE */
--primary: #2563eb;        /* Couleur principale de l'instance (ex: bleu IUT) */
--primary-hover: #1d4ed8;  /* Version hover (générée automatiquement ou config) */
--primary-light: #dbeafe;  /* Backgrounds subtils (générée automatiquement ou config) */

/* Neutres - FIXES (identiques pour toutes les instances) */
--secondary: #64748b;      /* Gris ardoise - Textes secondaires */
--secondary-dark: #334155; /* Textes importants */

/* Backgrounds - FIXES */
--bg-primary: #ffffff;     /* Background principal */
--bg-secondary: #f8fafc;   /* Zones secondaires, cards */
--bg-tertiary: #f1f5f9;    /* Hover, états actifs */

/* Bordures - FIXES */
--border: #e2e8f0;         /* Bordures par défaut */
--border-focus: #3b82f6;   /* Focus états */
```

### Couleurs Sémantiques (Fixes)

```css
/* Statuts et feedbacks - FIXES (standardisées) */
--success: #10b981;        /* Succès, validation */
--success-bg: #d1fae5;     /* Background succès */

--warning: #f59e0b;        /* Avertissements */
--warning-bg: #fef3c7;     /* Background warning */

--error: #ef4444;          /* Erreurs, suppressions */
--error-bg: #fee2e2;       /* Background erreur */

--info: #3b82f6;           /* Informations */
--info-bg: #dbeafe;        /* Background info */
```

**Rationale** : Les couleurs sémantiques restent fixes pour garantir la cohérence et éviter la confusion (ex: rouge = danger partout).

### Couleurs Fonctionnelles

```css
/* Système d'annotations */
--annotation-text: #8b5cf6;      /* Annotation texte */
--annotation-latex: #ec4899;     /* Annotation LaTeX */
--annotation-image: #06b6d4;     /* Annotation image */

/* Rôles utilisateurs */
--role-admin: #dc2626;           /* Badge admin */
--role-user: #64748b;            /* Badge utilisateur */
```

---

## Typographie

### Familles de Polices

```css
/* Interface */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

/* Contenu académique (annotations, titres d'examens) */
--font-display: 'Inter', sans-serif;

/* Code et LaTeX */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Échelle Typographique

```css
/* Titres */
--text-3xl: 1.875rem;  /* 30px - Titre page principale */
--text-2xl: 1.5rem;    /* 24px - Titres sections */
--text-xl: 1.25rem;    /* 20px - Titres cards */
--text-lg: 1.125rem;   /* 18px - Sous-titres */

/* Corps de texte */
--text-base: 1rem;     /* 16px - Texte standard */
--text-sm: 0.875rem;   /* 14px - Métadonnées, labels */
--text-xs: 0.75rem;    /* 12px - Badges, timestamps */

/* Poids */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Hiérarchie Visuelle

- **H1** : Nom de la plateforme, page principale (text-3xl, font-bold)
- **H2** : Titres de sections (text-2xl, font-semibold)
- **H3** : Titres d'examens dans les cards (text-xl, font-semibold)
- **Body** : Texte courant (text-base, font-normal)
- **Caption** : Métadonnées (text-sm, font-normal, couleur secondaire)

---

## Espacements et Grille

### Système d'Espacement (8px base)

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Règles d'Application

- **Composants internes** : space-3 ou space-4
- **Entre composants** : space-6 ou space-8
- **Sections** : space-12 ou space-16
- **Marges conteneur** : space-6 (mobile), space-8 (desktop)

### Grille Responsive

```css
/* Largeurs de conteneur */
--container-sm: 640px;   /* Mobile landscape */
--container-md: 768px;   /* Tablettes */
--container-lg: 1024px;  /* Desktop */
--container-xl: 1280px;  /* Large desktop */

/* Grille d'examens */
/* Mobile : 1 colonne */
/* Tablet : 2 colonnes */
/* Desktop : 3-4 colonnes (selon largeur) */
```

---

## Composants UI

### Boutons

**Hiérarchie** :
1. **Primary** : Action principale par écran (ex: "Soumettre", "Télécharger")
2. **Secondary** : Actions secondaires (ex: "Annuler", "Retour")
3. **Ghost** : Actions tertiaires, navigation discrète
4. **Danger** : Actions destructives (ex: "Supprimer")

**Variantes** :

```tsx
// Primary
<Button variant="primary">Télécharger PDF</Button>
// bg-primary, text-white, hover:bg-primary-hover

// Secondary
<Button variant="secondary">Annuler</Button>
// bg-white, border-border, text-secondary-dark, hover:bg-bg-tertiary

// Ghost
<Button variant="ghost">Voir détails</Button>
// bg-transparent, text-secondary, hover:bg-bg-tertiary

// Danger
<Button variant="danger">Supprimer</Button>
// bg-error, text-white, hover:bg-red-600
```

**Tailles** :
- `sm` : 32px hauteur, padding 8px/12px (badges, actions inline)
- `md` : 40px hauteur, padding 10px/16px (défaut)
- `lg` : 48px hauteur, padding 12px/24px (CTAs importants)

### Cards

**Structure** :
```
┌─────────────────────────────────────┐
│ [Badge]              [Menu ⋮]       │ ← Header (optionnel)
│                                     │
│ Titre de l'examen (text-xl)        │ ← Titre cliquable
│ Module • Année • Type               │ ← Métadonnées (text-sm)
│                                     │
│ [Icon] 12 réponses                  │ ← Stats (text-sm)
│                                     │
│ [Bouton] Consulter →                │ ← Action (optionnel)
└─────────────────────────────────────┘
```

**Propriétés** :
- Background : `bg-white` (pas `bg-secondary`)
- Border : `border border-border` (Tailwind, pas px en dur)
- Border-radius : `rounded-card` (12px, défini dans config)
- Padding : `p-6`
- Hover : `hover:shadow-md hover:border-primary` (si cliquable)
- Transition : `transition-all duration-150 ease`

### Inputs

**Structure** :
```
[Label] (text-sm, font-medium)
[Input field] (40px hauteur minimum)
[Helper text / Error] (text-xs)
```

**États** :
- **Default** : `border-border bg-white`
- **Focus** : `focus:border-primary focus:ring-2 focus:ring-primary/20` (pas de valeurs px en dur)
- **Error** : `border-error` + helper text avec `text-error text-xs`
- **Disabled** : `disabled:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-60`

**Types spécifiques** :
- **Search** : Icon loupe à gauche, `pl-10` pour compenser l'icône
- **Select** : Icon chevron à droite, `pr-10`
- **Textarea** : `min-h-[120px] resize-y` (pas de px en dur, sauf dans array Tailwind)

### Badges

**Utilisation** :
- Statuts (Pending, Approved, Rejected)
- Rôles (Admin, User)
- Types d'annotations (Texte, LaTeX, Image)
- Années, modules

**Style** :
- Border-radius : `rounded-md` (6px)
- Padding : `px-2 py-1` (pas de valeurs en dur)
- Font-size : `text-xs`
- Font-weight : `font-medium`
- Couleur : Background léger + texte foncé assorti (ex: `bg-red-100 text-red-700`)

```tsx
// Exemple : Badge Admin
<Badge variant="admin">Admin</Badge>
// bg-red-100, text-red-700, border-red-200
```

### Modales

**Structure** :
```
Overlay (bg-black/50, backdrop-blur-sm)
  └─ Modal Container (max-width, centré)
       ├─ Header : Titre + Bouton fermeture
       ├─ Content : Contenu scrollable
       └─ Footer : Actions (alignées à droite)
```

**Propriétés** :
- Max-width : `max-w-md` (768px, Tailwind standard)
- Border-radius : `rounded-2xl` (16px)
- Padding : `p-6`
- Animation : Fade simple uniquement (150ms, pas de scale)
- Focus trap : Tab navigation circulaire (via library ou custom hook)

### Tooltips

- Apparition : Hover 500ms delay
- Position : Au-dessus par défaut, ajustement automatique
- Max-width : `max-w-xs` (320px, Tailwind)
- Background : `bg-secondary-dark`
- Text : `text-white text-sm`
- Padding : `px-3 py-2`
- Border-radius : `rounded-lg` (8px)

---

## Layouts et Navigation

### Navigation Principale

**Structure** :
```
┌─────────────────────────────────────────────────────┐
│ [Logo] {NOM_INSTANCE}  [Recherche]  [User] [Login] │
└─────────────────────────────────────────────────────┘
```

⚠️ **Multi-instances** : Le nom et logo sont configurables par instance via env vars (ex: "Annales BUT Info", "Annales DUT RT", etc.)

**Comportement** :
- Sticky top avec `sticky top-0 z-50`, shadow au scroll (`shadow-sm`)
- Mobile : Hamburger menu avec drawer (shadcn/ui Sheet ou Dialog)
- Search bar : `w-full md:w-auto` - expand on focus (mobile), always visible (desktop)
- User dropdown : Profil, Paramètres, Déconnexion

**Actions rapides** (icônes + tooltips) :
- Upload (si authentifié)
- Notifications (si admin)
- Mode sombre (futur)

### Structure des Pages

**Page Liste d'Examens** :
```
┌────────────────────────────────────────────┐
│ Navigation (sticky)                        │
├────────────────────────────────────────────┤
│ [Titre] Annales disponibles      [Upload] │
│                                            │
│ [Filtres] Année • Module • Type           │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │ Card │ │ Card │ │ Card │ │ Card │      │
│ └──────┘ └──────┘ └──────┘ └──────┘      │
│ [Pagination ou Infinite scroll]           │
└────────────────────────────────────────────┘
```

**Page Visualisation PDF** :
```
┌─────────────────────────────────────────────────────┐
│ [← Retour] Titre de l'examen          [⋮ Actions]  │
├────────────────┬────────────────────────────────────┤
│                │                                    │
│ Sidebar        │        PDF Viewer                  │
│ Annotations    │        (Centré, scroll)            │
│ (Scrollable)   │                                    │
│                │ [+] Ajouter une annotation         │
│                │                                    │
└────────────────┴────────────────────────────────────┘
```

- **Ordinateur** : Sidebar fixe `w-80` (320px), PDF `flex-1`
- **Tablette** : Sidebar collapsible, toggle button visible
- **Téléphone** : Onglets (PDF / Annotations) - 2 vues séparées

---

## Interactions et Animations

### Principes

- **Simplicité absolue** : Animations minimales, pas d'effets complexes
- **Durées courtes** : 150ms maximum pour la plupart des transitions
- **Easing standard** : `ease` ou `ease-out` uniquement
- **Pas d'animations superflues** : Uniquement pour guider l'œil et signaler les changements d'état
- **Respect des préférences utilisateur** : `prefers-reduced-motion` pour désactiver les animations

### Micro-interactions

**Boutons** :
```css
/* Transition simple sur le background uniquement */
transition: background-color 150ms ease;
/* Pas de scale, pas de transform - trop complexe */
```

**Cards cliquables** :
```css
/* Transition sur bordure et ombre uniquement */
transition: box-shadow 150ms ease, border-color 150ms ease;
```

**Inputs focus** :
```css
/* Transition sur bordure uniquement */
transition: border-color 150ms ease;
/* Pas d'animation sur box-shadow - changement instantané OK */
```

### États de Chargement

**Skeleton screens** : Préférer aux spinners pour le contenu initial
- Forme : Réplique grise du contenu final
- Animation : Pulse subtil ou gradient shimmer

**Spinners** : Pour actions ponctuelles (submit, delete)
- Taille : `w-4 h-4` (sm), `w-6 h-6` (md), `w-8 h-8` (lg)
- Couleur : `text-primary` ou `text-white` (selon background)

**Progress bars** : Pour uploads/téléchargements
- Hauteur : `h-1` (4px, discrète)
- Position : `fixed top-0 left-0 right-0 z-50`

### Feedbacks

**Modales et alertes (SweetAlert2)** :
- Utilisé pour confirmations importantes, alertes, dialogues
- Configuration par défaut simple et cohérente avec le design system
- Pas d'animations complexes (fade simple uniquement)
- Exemples d'usage :
  - Confirmation de suppression
  - Messages de succès après actions importantes
  - Alertes d'erreur avec explications
  - Prompts pour saisie utilisateur

**Toast notifications (optionnel)** :
- Position : Top-right (desktop), top-center (mobile)
- Auto-dismiss : 5s (info/success), 7s (warning), Permanent (error)
- Max simultanés : 3 (stack verticalement)
- Alternative : Utiliser SweetAlert2 en mode toast

**Messages inline** :
- À côté de l'élément concerné (forms, actions)
- Icon + texte explicatif
- Couleur selon type (success/warning/error)

---

## Iconographie

### Bibliothèque

**Lucide React** (cohérence, 24px par défaut)

### Icônes Principales

| Fonction | Icône | Usage |
|----------|-------|-------|
| Upload | `Upload` | Bouton upload PDF |
| Download | `Download` | Télécharger PDF/réponses |
| Search | `Search` | Barre de recherche |
| Filter | `Filter` | Filtres avancés |
| User | `User` | Profil utilisateur |
| Settings | `Settings` | Paramètres |
| Logout | `LogOut` | Déconnexion |
| Edit | `Edit2` | Modifier annotation |
| Delete | `Trash2` | Supprimer |
| Eye | `Eye` | Voir détails |
| Flag | `Flag` | Signaler contenu |
| Check | `Check` | Validation, approuvé |
| X | `X` | Fermer, refusé |
| ChevronRight | `ChevronRight` | Navigation forward |
| ChevronLeft | `ChevronLeft` | Navigation back |
| MoreVertical | `MoreVertical` | Menu actions |
| Plus | `Plus` | Ajouter annotation |
| FileText | `FileText` | Document PDF |
| MessageSquare | `MessageSquare` | Annotations/commentaires |
| Calendar | `Calendar` | Année |
| BookOpen | `BookOpen` | Module |
| AlertCircle | `AlertCircle` | Avertissement |
| Info | `Info` | Information |

### Tailles d'Icônes

- **16px** : Inline avec texte (badges, labels)
- **20px** : Boutons sm, menu items
- **24px** : Défaut (boutons, headers)
- **32px** : Illustrations, états vides

---

## Accessibilité (A11y)

### Contrastes

- **Texte normal** : Ratio 4.5:1 minimum (WCAG AA)
- **Texte large (>18px)** : Ratio 3:1 minimum
- **Éléments interactifs** : Contours visibles au focus

### Navigation Clavier

- **Tab order** : Logique et prévisible
- **Focus visible** : Outline 2px avec offset, couleur primary
- **Shortcuts** :
  - `Cmd/Ctrl + K` : Ouvrir recherche
  - `Escape` : Fermer modales/drawers
  - `←/→` : Naviguer entre pages PDF

### ARIA et Sémantique

- Utiliser les balises HTML5 sémantiques (`<nav>`, `<main>`, `<article>`)
- ARIA labels pour icônes seules
- `role="dialog"` pour modales avec `aria-labelledby`
- États dynamiques : `aria-live="polite"` (notifications)

### Support Screen Readers

- Alt text descriptifs pour images
- Labels cachés visuellement si nécessaire (`sr-only`)
- Annonces des changements d'état (uploads, soumissions)

---

## Responsive Design

⚠️ **APPROCHE MOBILE-FIRST OBLIGATOIRE**

### Philosophie Responsive

1. **Toujours commencer par le mobile** : Design et code pour mobile d'abord
2. **Tester sur vrais devices** : Pas uniquement le mode responsive du navigateur
3. **3 breakpoints uniquement** : Base (téléphone), `md:` (tablette), `lg:` (ordinateur) - **PAS de sm:, xl:, 2xl:**
4. **Pas de valeurs fixes** : Utiliser `w-full`, `max-w-*`, `min-h-screen`
5. **Flexibilité** : Les composants s'adaptent, ne cassent jamais

### Breakpoints (3 tailles uniquement)

```js
// À utiliser via les préfixes de classe
// Pas de 'sm', pas de 'xl', pas de '2xl' - seulement 3 breakpoints
md: '768px'   // Tablette
lg: '1024px'  // Ordinateur
```

**Utilisation** :
```tsx
// ✅ BON : Mobile first (3 breakpoints seulement)
<div className="w-full md:w-1/2 lg:w-1/3">

// ❌ MAUVAIS : Desktop first
<div className="w-1/3 lg:w-1/2 md:w-full">

// ✅ BON : Grille responsive (Téléphone → Tablette → Ordi)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ❌ MAUVAIS : Largeur fixe
<div style={{width: '300px'}}>

// ❌ MAUVAIS : Trop de breakpoints
<div className="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
```

### Adaptations par Taille (3 uniquement)

**📱 Téléphone (< 768px) - BASE** :
- Navigation : Hamburger menu (drawer)
- Grille examens : 1 colonne (`grid-cols-1`)
- PDF viewer : Plein écran, annotations en onglets
- Formulaires : Inputs pleine largeur (`w-full`)
- Padding conteneur : `p-4`
- Touch targets : Minimum `h-11` (44px) pour cliquabilité
- Font size : Base 16px minimum (lisibilité)

**📱 Tablette (768px - 1023px)** :
- Navigation : Horizontale complète ou hybride
- Grille examens : 2 colonnes (`md:grid-cols-2`)
- PDF viewer : Sidebar collapsible avec toggle
- Padding conteneur : `md:p-6`
- Espacement augmenté : `md:gap-6`

**💻 Ordinateur (1024px+)** :
- Navigation : Tous les éléments visibles
- Grille examens : 3 colonnes (`lg:grid-cols-3`)
- PDF viewer : Sidebar fixe + PDF côte à côte
- Padding conteneur : `lg:p-8`
- Hover effects activés (via `@media (hover: hover)`)
- Conteneur max : `max-w-7xl` (1280px)

### Bonnes Pratiques Responsive

**Images et médias** :
```tsx
// ✅ Toujours responsive
<img className="w-full h-auto" />

// ✅ Avec max-width
<img className="w-full max-w-md h-auto" />
```

**Typographie responsive** :
```tsx
// ✅ Échelle adaptative
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// ✅ Leading adaptatif
<p className="text-base leading-relaxed lg:text-lg lg:leading-loose">
```

**Espacements responsifs** :
```tsx
// ✅ Padding adaptatif
<div className="p-4 md:p-6 lg:p-8">

// ✅ Gap adaptatif dans grille
<div className="grid gap-4 md:gap-6 lg:gap-8">
```

**Visibilité conditionnelle** :
```tsx
// ✅ Cacher sur mobile
<div className="hidden md:block">

// ✅ Montrer uniquement sur mobile
<div className="block md:hidden">
```

### Touch vs Mouse

- **Touch** : Zones cliquables minimum `h-11 w-11` (44x44px - accessibilité)
- **Mouse** : Hover states via `hover:` (appliqué automatiquement sur desktop)
- **Détection hover** : `@media (hover: hover)` pour CSS custom
- **Focus visible** : `focus-visible:` pour navigation clavier

### Test Responsive

**3 tailles à tester obligatoirement** :
- **390px** : Téléphone (iPhone 12/13/14 standard)
- **768px** : Tablette (iPad portrait)
- **1440px** : Ordinateur (Desktop standard)

**Outils** :
- Chrome DevTools (mode responsive)
- Tests sur vrais devices (iOS + Android)
- BrowserStack ou similaire pour compatibilité

---

## États Spéciaux

### État Vide (Empty States)

**Structure** :
```
┌─────────────────────────┐
│                         │
│      [Icône 64px]       │
│                         │
│    Titre explicatif     │
│  Texte d'aide subtil    │
│                         │
│   [Bouton action CTA]   │
│                         │
└─────────────────────────┘
```

**Exemples** :
- "Aucun examen trouvé" → Ajuster filtres ou Upload
- "Aucune annotation" → Soyez le premier à contribuer

### Messages d'Erreur

**Priorités** :
1. **Dire ce qui ne va pas** clairement
2. **Expliquer pourquoi** (si pertinent)
3. **Proposer une solution** actionable

**Exemple** :
```
❌ Mauvais : "Erreur 400"
✅ Bon : "Le fichier doit être un PDF de moins de 50 Mo"
```

### Confirmation d'Actions Destructives

- Modal de confirmation pour delete/reject
- Texte explicite : "Supprimer définitivement l'examen ?" (pas juste "Confirmer")
- Bouton danger + bouton annuler (annuler par défaut au focus)

---

## Bonnes Pratiques UX

### Performance Perçue

1. **Optimistic UI** : Afficher le changement immédiatement, rollback si erreur
2. **Skeleton screens** : Montrer la structure pendant le chargement
3. **Lazy loading** : Images et PDFs chargés progressivement
4. **Debounce search** : 300ms avant requête

### Guidage Utilisateur

1. **Onboarding discret** : Tooltips contextuels au premier usage
2. **Validation inline** : Feedback immédiat sur les formulaires
3. **États désactivés** : Expliquer pourquoi (tooltip ou texte)
4. **Breadcrumbs** : Montrer où on est (pages profondes)

### Cohérence

1. **Terminologie** : Vocabulaire uniforme (ex: "Annales" vs "Examens")
2. **Positions** : Actions primaires toujours au même endroit
3. **Comportements** : Interactions similaires = résultats similaires

### Priorisation Visuelle

1. **Une action primaire par écran** (bouton primary)
2. **Hiérarchie claire** : Titre > Métadonnées > Actions
3. **Groupement logique** : Espacement pour séparer les sections

---

## Implémentation Technique

### Stack Recommandé

- **Tailwind CSS** : Utility-first, déjà présent - **OBLIGATOIRE** pour éviter les valeurs en dur
- **CSS Variables** : Pour tokens de design (couleurs, espacements) - à utiliser dans Tailwind config
- **Lucide React** : Icônes cohérentes
- **shadcn/ui** : Composants React réutilisables et accessibles (recommandé)
  - Alternative premium à Headless UI
  - Composants copiables et personnalisables
  - Intégration parfaite avec Tailwind
  - Accessibilité intégrée
- **SweetAlert2** : Modales, alertes, confirmations élégantes
  - Remplace les modales custom pour les cas simples
  - Personnalisable selon la charte graphique
  - Pas d'animations complexes (configuration minimale)

### Structure de Composants

```
web/src/components/
├── ui/                    # Composants de base (Button, Input, Badge)
├── layout/                # Layout components (Nav, Sidebar, Container)
├── exam/                  # Composants spécifiques examens
├── annotation/            # Composants annotations
└── admin/                 # Composants admin (modération)
```

### Theming Multi-Instances

⚠️ **ARCHITECTURE CRITIQUE** : Une seule codebase, plusieurs instances thémées.

**Variables d'environnement par instance** :
```bash
# .env.instance-iut-info
INSTANCE_NAME="Annales BUT Informatique"
INSTANCE_SHORT_NAME="IUT Info RS"
PRIMARY_COLOR=#2563eb
LOGO_PATH=/logos/iut-info.svg

# .env.instance-dut-rt
INSTANCE_NAME="Annales DUT RT"
INSTANCE_SHORT_NAME="DUT RT"
PRIMARY_COLOR=#dc2626
LOGO_PATH=/logos/dut-rt.svg
```

**Configuration Tailwind dynamique** :
```js
// tailwind.config.js
const primaryColor = process.env.PRIMARY_COLOR || '#2563eb'

module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: primaryColor,
          // Générer automatiquement hover/light avec color-transform lib
          hover: lighten(primaryColor, -10),
          light: lighten(primaryColor, 80),
        },
      },
    },
  },
}
```

**Hook pour accès instance** :
```tsx
// hooks/useInstance.ts
export const useInstance = () => {
  return {
    name: process.env.VITE_INSTANCE_NAME || 'Annales',
    shortName: process.env.VITE_INSTANCE_SHORT_NAME || 'Annales',
    logoPath: process.env.VITE_LOGO_PATH || '/logo.svg',
  }
}

// Utilisation dans composants
const { name, logoPath } = useInstance()
<img src={logoPath} alt={name} />
```

**Avantages** :
- ✅ Un seul repo, plusieurs deployments
- ✅ Pas de duplication de code
- ✅ Mises à jour centralisées
- ✅ Thème personnalisé par formation

### Configuration Tailwind

⚠️ **RÈGLE D'OR : JAMAIS DE VALEURS EN DUR**

- **Interdictions strictes** :
  - ❌ `width: 250px` → ✅ `w-64` ou `max-w-sm`
  - ❌ `margin: 15px` → ✅ `m-4` (16px = 1rem)
  - ❌ `font-size: 18px` → ✅ `text-lg`
  - ❌ `color: #2563eb` → ✅ `text-primary`
  - ❌ Styles inline sauf cas très exceptionnels

- **Toujours utiliser** :
  - Classes Tailwind pour espacements (`p-4`, `m-6`, `gap-3`)
  - Tokens de taille (`w-full`, `h-screen`, `max-w-4xl`)
  - Classes responsive (`md:w-1/2`, `lg:grid-cols-3`)
  - Variables CSS pour valeurs custom (via Tailwind config)

Étendre `tailwind.config.js` avec les tokens de ce design system :

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Toutes les couleurs du design system
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          light: '#dbeafe',
        },
        secondary: {
          DEFAULT: '#64748b',
          dark: '#334155',
        },
        // ... (voir section Palette de Couleurs)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Utiliser l'échelle typographique définie
        '3xl': '1.875rem',
        '2xl': '1.5rem',
        'xl': '1.25rem',
        // etc.
      },
      spacing: {
        // Pas besoin de redéfinir, Tailwind utilise déjà une échelle 4px
        // Utiliser: space-1 (4px), space-2 (8px), space-4 (16px), etc.
      },
      borderRadius: {
        'card': '0.75rem',  // 12px pour les cards
        'input': '0.5rem',  // 8px pour les inputs
      },
      maxWidth: {
        'container-sm': '640px',
        'container-md': '768px',
        'container-lg': '1024px',
        'container-xl': '1280px',
      },
    },
  },
};
```

---

## Qualité de Code - Règles Strictes

### Principe Fondamental

**Le code doit être maintenable, lisible et évolutif.** Chaque composant doit pouvoir être compris et modifié par n'importe quel développeur de l'équipe sans documentation externe.

### Règles Strictes à Respecter

#### 1. Pas de Valeurs en Dur (Magic Numbers/Values)

```tsx
// ❌ MAUVAIS - Valeurs en dur partout
<div style={{ width: '250px', margin: '15px', fontSize: '18px', color: '#2563eb' }}>

// ✅ BON - Classes Tailwind
<div className="w-64 m-4 text-lg text-primary">

// ❌ MAUVAIS - CSS custom avec pixels
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px'
  }
}

// ✅ BON - Tailwind ou variables CSS
<div className="p-6 max-w-7xl">
```

#### 2. Mobile-First Obligatoire

```tsx
// ❌ MAUVAIS - Desktop first
<div className="w-1/3 lg:w-1/2 md:w-full">
<div className="text-2xl md:text-xl sm:text-base">

// ✅ BON - Mobile first
<div className="w-full md:w-1/2 lg:w-1/3">
<div className="text-base md:text-xl lg:text-2xl">
```

#### 3. Composants Réutilisables

```tsx
// ❌ MAUVAIS - Composant trop spécifique
function ExamCardWithBlueBackground() {
  return <div className="bg-blue-500">...</div>
}

// ✅ BON - Composant générique avec props
interface CardProps {
  variant?: 'default' | 'primary' | 'secondary';
  children: React.ReactNode;
}

function Card({ variant = 'default', children }: CardProps) {
  const variants = {
    default: 'bg-white',
    primary: 'bg-primary',
    secondary: 'bg-secondary'
  }
  return <div className={variants[variant]}>{children}</div>
}
```

#### 4. TypeScript Strict

```tsx
// ❌ MAUVAIS - Types any, props non typées
function Button(props: any) {
  return <button onClick={props.onClick}>{props.children}</button>
}

// ✅ BON - Types stricts
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  children,
  className = ''
}: ButtonProps) {
  // Implementation
}
```

#### 5. Extraction des Logiques Complexes

```tsx
// ❌ MAUVAIS - Logique dans le JSX
<button
  className={`
    ${isActive ? 'bg-primary' : 'bg-secondary'}
    ${isLarge ? 'text-xl p-6' : 'text-base p-4'}
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-hover'}
  `}
>

// ✅ BON - Logique extraite
const getButtonClasses = (isActive: boolean, isLarge: boolean, isDisabled: boolean) => {
  const base = 'transition-colors'
  const state = isActive ? 'bg-primary' : 'bg-secondary'
  const size = isLarge ? 'text-xl p-6' : 'text-base p-4'
  const interactive = isDisabled
    ? 'opacity-50 cursor-not-allowed'
    : 'hover:bg-primary-hover'

  return `${base} ${state} ${size} ${interactive}`
}

<button className={getButtonClasses(isActive, isLarge, isDisabled)}>
```

#### 6. Utilisation de clsx ou cn pour Classes Conditionnelles

```tsx
// Installation recommandée
npm install clsx

// Utility function (inspirée de shadcn)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ Utilisation propre
<button
  className={cn(
    'px-4 py-2 rounded-lg transition-colors',
    variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
    variant === 'secondary' && 'bg-white border border-border hover:bg-bg-tertiary',
    disabled && 'opacity-50 cursor-not-allowed',
    className // Permet override depuis parent
  )}
>
```

#### 7. Pas de Duplication - DRY (Don't Repeat Yourself)

```tsx
// ❌ MAUVAIS - Duplication
function ExamCard1() {
  return (
    <div className="bg-white rounded-card p-6 border border-border">
      <h3 className="text-xl font-semibold">Exam 1</h3>
    </div>
  )
}

function ExamCard2() {
  return (
    <div className="bg-white rounded-card p-6 border border-border">
      <h3 className="text-xl font-semibold">Exam 2</h3>
    </div>
  )
}

// ✅ BON - Composant réutilisable
interface ExamCardProps {
  title: string;
  year?: number;
  module?: string;
}

function ExamCard({ title, year, module }: ExamCardProps) {
  return (
    <div className="bg-white rounded-card p-6 border border-border">
      <h3 className="text-xl font-semibold">{title}</h3>
      {year && <span className="text-sm text-secondary">{year}</span>}
      {module && <span className="text-sm text-secondary">{module}</span>}
    </div>
  )
}
```

#### 8. SweetAlert2 Configuration Centralisée

```tsx
// utils/swal.ts - Configuration centralisée
import Swal from 'sweetalert2'

export const swalConfig = {
  confirmButtonColor: '#2563eb', // primary
  cancelButtonColor: '#64748b',  // secondary
  showClass: {
    popup: 'animate-fade-in' // Animation simple
  },
  hideClass: {
    popup: 'animate-fade-out'
  }
}

// Helpers typés
export const showSuccess = (message: string) => {
  return Swal.fire({
    ...swalConfig,
    icon: 'success',
    title: 'Succès',
    text: message,
    timer: 3000
  })
}

export const showError = (message: string) => {
  return Swal.fire({
    ...swalConfig,
    icon: 'error',
    title: 'Erreur',
    text: message
  })
}

export const confirmDelete = async (itemName: string): Promise<boolean> => {
  const result = await Swal.fire({
    ...swalConfig,
    icon: 'warning',
    title: 'Confirmer la suppression',
    text: `Voulez-vous vraiment supprimer "${itemName}" ?`,
    showCancelButton: true,
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  })
  return result.isConfirmed
}

// ✅ Utilisation
import { showSuccess, confirmDelete } from '@/utils/swal'

const handleDelete = async () => {
  if (await confirmDelete(exam.title)) {
    // Delete logic
    await showSuccess('Examen supprimé avec succès')
  }
}
```

#### 9. Gestion d'État Propre

```tsx
// ❌ MAUVAIS - État non structuré
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
const [data, setData] = useState(null)

// ✅ BON - État groupé logiquement
interface ExamState {
  data: Exam | null;
  isLoading: boolean;
  error: string | null;
}

const [examState, setExamState] = useState<ExamState>({
  data: null,
  isLoading: false,
  error: null
})

// Ou avec reducers pour logique complexe
type ExamAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Exam }
  | { type: 'FETCH_ERROR'; error: string }

const examReducer = (state: ExamState, action: ExamAction): ExamState => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null }
    case 'FETCH_SUCCESS':
      return { data: action.payload, isLoading: false, error: null }
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.error }
    default:
      return state
  }
}
```

#### 10. Nommage Cohérent

```tsx
// ✅ Conventions de nommage
// Composants: PascalCase
function ExamCard() {}

// Hooks custom: camelCase avec préfixe "use"
function useExamData() {}

// Constantes: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Functions: camelCase
function formatExamTitle(title: string) {}

// Interfaces/Types: PascalCase avec suffixe si nécessaire
interface ExamCardProps {}
type ExamStatus = 'draft' | 'published'

// Fichiers: kebab-case pour files, PascalCase pour composants
exam-card.tsx  // ❌
ExamCard.tsx   // ✅

// CSS classes: kebab-case (Tailwind standard)
.exam-card-container  // Si CSS custom nécessaire
```

### Architecture des Composants

```
components/
├── ui/                      # Composants de base (shadcn/ui style)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── index.ts            # Export barrel
│
├── layout/                  # Layout components
│   ├── Navigation.tsx
│   ├── Sidebar.tsx
│   └── Container.tsx
│
├── exam/                    # Feature-specific
│   ├── ExamCard.tsx
│   ├── ExamList.tsx
│   ├── ExamFilters.tsx
│   └── index.ts
│
└── shared/                  # Composants partagés complexes
    ├── PdfViewer.tsx
    └── AnnotationEditor.tsx

utils/
├── cn.ts                    # clsx + twMerge utility
├── swal.ts                  # SweetAlert2 config
├── format.ts                # Formatters (dates, nombres)
└── validators.ts            # Validation helpers

hooks/
├── useExamData.ts
├── useAuth.ts
└── useMediaQuery.ts         # Responsive hooks
```

### Performance

```tsx
// ✅ Memoization pour composants lourds
import { memo } from 'react'

export const ExamCard = memo(({ exam }: ExamCardProps) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison si nécessaire
  return prevProps.exam._id === nextProps.exam._id
})

// ✅ Lazy loading pour routes
import { lazy, Suspense } from 'react'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>

// ✅ Debounce pour recherche
import { useDebouncedValue } from '@/hooks/useDebounce'

const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebouncedValue(searchTerm, 300)

useEffect(() => {
  // API call avec debouncedSearch
}, [debouncedSearch])
```

### Tests Unitaires (si applicable)

```tsx
// exam-card.test.tsx
import { render, screen } from '@testing-library/react'
import { ExamCard } from './ExamCard'

describe('ExamCard', () => {
  const mockExam = {
    _id: '1',
    title: 'Examen M12',
    year: 2023,
    module: 'Algorithmique'
  }

  it('affiche le titre de l\'examen', () => {
    render(<ExamCard exam={mockExam} />)
    expect(screen.getByText('Examen M12')).toBeInTheDocument()
  })

  it('est responsive', () => {
    const { container } = render(<ExamCard exam={mockExam} />)
    expect(container.firstChild).toHaveClass('w-full')
  })
})
```

---

## Évolutions Futures

### Phase 1 (Refonte actuelle)
- ✅ Design system de base
- ✅ Composants UI principaux
- ✅ Navigation et layouts

### Phase 2 (Court terme)
- Mode sombre (toggle dans nav)
- Recherche avancée avec filtres combinés
- Système de notifications (WebSocket)

### Phase 3 (Moyen terme)
- Annotations collaboratives en temps réel
- Système de favoris/bookmarks
- Export personnalisé (sélection de pages)

### Phase 4 (Long terme)
- Progressive Web App (offline support)
- Recherche full-text dans les PDFs (OCR)
- Gamification (contributions, badges)

---

## Erreurs Courantes à Éviter

### ❌ Erreurs de Valeurs en Dur

```tsx
// ❌ TRÈS MAUVAIS - Valeurs en dur multiples
<div style={{
  width: '300px',
  height: '200px',
  padding: '20px',
  marginTop: '15px',
  fontSize: '14px',
  color: '#64748b'
}}>

// ✅ CORRECT - Classes Tailwind
<div className="w-[300px] h-[200px] p-5 mt-4 text-sm text-secondary">
// Note: w-[300px] acceptable uniquement si pas d'équivalent Tailwind
```

### ❌ Erreurs de Responsive

```tsx
// ❌ MAUVAIS - Desktop first
<div className="grid-cols-3 md:grid-cols-2 grid-cols-1">

// ❌ MAUVAIS - Breakpoints interdits
<div className="sm:text-base xl:text-lg">

// ✅ CORRECT - Mobile first, 3 breakpoints
<div className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<div className="text-base md:text-lg">
```

### ❌ Erreurs de Theming

```tsx
// ❌ MAUVAIS - Nom hardcodé
<h1>Annales BUT Informatique</h1>

// ❌ MAUVAIS - Couleur hardcodée
<button style={{ backgroundColor: '#2563eb' }}>

// ✅ CORRECT - Via hook et Tailwind
const { name } = useInstance()
<h1>{name}</h1>
<button className="bg-primary">
```

### ❌ Erreurs de TypeScript

```tsx
// ❌ MAUVAIS - any partout
function Card(props: any) {
  return <div>{props.children}</div>
}

// ❌ MAUVAIS - Props optionnelles sans défaut
interface CardProps {
  variant?: string // Pas de validation
}

// ✅ CORRECT - Types stricts avec unions
interface CardProps {
  variant?: 'default' | 'primary' | 'secondary'
  children: React.ReactNode
}

function Card({ variant = 'default', children }: CardProps) {
  // ...
}
```

### ❌ Erreurs de Performance

```tsx
// ❌ MAUVAIS - Pas de memoization sur liste longue
{exams.map(exam => <ExamCard key={exam._id} exam={exam} />)}

// ✅ CORRECT - Memo pour composant lourd
const ExamCard = memo(({ exam }: ExamCardProps) => {
  // ...
}, (prev, next) => prev.exam._id === next.exam._id)

// ❌ MAUVAIS - Pas de debounce sur search
<input onChange={(e) => searchExams(e.target.value)} />

// ✅ CORRECT - Debounce 300ms
const debouncedSearch = useDebouncedValue(searchTerm, 300)
useEffect(() => searchExams(debouncedSearch), [debouncedSearch])
```

### ❌ Erreurs d'Accessibilité

```tsx
// ❌ MAUVAIS - Bouton non accessible
<div onClick={handleClick}>Cliquer</div>

// ❌ MAUVAIS - Icône sans label
<button><TrashIcon /></button>

// ✅ CORRECT - Sémantique + ARIA
<button onClick={handleClick} aria-label="Supprimer l'examen">
  <TrashIcon className="w-5 h-5" />
</button>
```

### ❌ Erreurs de Duplication

```tsx
// ❌ MAUVAIS - Code dupliqué
function ExamCard1() {
  return <div className="bg-white p-6 rounded-lg">...</div>
}
function ExamCard2() {
  return <div className="bg-white p-6 rounded-lg">...</div>
}

// ✅ CORRECT - Composant réutilisable
function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white p-6 rounded-lg', className)}>
      {children}
    </div>
  )
}
```

---

## Checklist Validation Design

Avant de valider un composant/page :

### Qualité de Code
- [ ] **Aucune valeur en dur** : Pas de px, pas de couleurs hex directes (sauf env vars pour theming)
- [ ] **Classes Tailwind uniquement** : Pas de CSS inline sauf exception
- [ ] **Mobile-first** : Code commence par mobile, puis breakpoints `md:`, `lg:` uniquement
- [ ] **Réutilisable** : Composant peut être utilisé ailleurs sans modification
- [ ] **Props typées** : TypeScript strict avec interfaces claires
- [ ] **Pas de duplication** : Code partagé extrait dans utils/composants
- [ ] **Multi-instances compatible** : Utilise `useInstance()` pour nom/logo, pas de hardcode

### Design System
- [ ] Respecte la palette de couleurs définie (via classes Tailwind)
- [ ] Utilise l'échelle typographique cohérente (`text-sm`, `text-base`, etc.)
- [ ] Espacement selon Tailwind (`p-4`, `m-6`, `gap-3`)
- [ ] Border-radius cohérent (`rounded-card`, `rounded-input`)

### Responsive
- [ ] **Testé sur 3 tailles** : 390px (téléphone), 768px (tablette), 1440px (ordi)
- [ ] **Mobile-first** : Design fonctionne parfaitement sur mobile
- [ ] Grilles adaptatives en 3 paliers (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- [ ] Padding/margin adaptatifs (`p-4 md:p-6 lg:p-8`)
- [ ] Images responsives (`w-full h-auto`)
- [ ] Touch targets minimum 44px sur mobile (`h-11 w-11` minimum)
- [ ] Pas de `sm:` ni `xl:` ni `2xl:` utilisés

### Interactions
- [ ] États interactifs (hover, focus, disabled, active) définis
- [ ] Transitions simples uniquement (150ms max, pas de transform complexe)
- [ ] `focus-visible:` pour navigation clavier
- [ ] Hover désactivé sur touch (`@media (hover: hover)` si custom CSS)

### Accessibilité
- [ ] Contraste WCAG AA minimum (4.5:1 texte, 3:1 UI)
- [ ] Navigation clavier fonctionnelle (tab order logique)
- [ ] ARIA labels pour icônes seules
- [ ] Textes alternatifs pour images
- [ ] États annoncés (loading, success, error)

### Feedback Utilisateur
- [ ] États de chargement gérés (skeleton ou spinner)
- [ ] Messages d'erreur clairs et actionnables
- [ ] SweetAlert2 configuré selon charte (si utilisé)
- [ ] Confirmations pour actions destructives

### Tests
- [ ] Testé sur Chrome, Firefox, Safari
- [ ] Testé sur mobile réel (iOS et/ou Android)
- [ ] Testé avec clavier uniquement
- [ ] Testé avec zoom 200% (accessibilité)
- [ ] Pas de console errors/warnings

---

## Installation des Dépendances Recommandées

```bash
# Frontend (web/)
cd web

# Tailwind + plugins essentiels
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
npm install -D tailwind-merge clsx

# shadcn/ui (composants accessibles)
npx shadcn-ui@latest init
# Installer au fur et à mesure: button, input, card, badge, dialog, dropdown-menu, etc.

# SweetAlert2
npm install sweetalert2

# Icônes
npm install lucide-react

# Utilitaires
npm install react-hook-form zod @hookform/resolvers  # Forms + validation
npm install date-fns  # Manipulation dates (au lieu de moment.js)

# Performance
npm install @tanstack/react-query  # Cache + fetch (optionnel mais recommandé)
```

**Rationale des choix** :
- **tailwind-merge** : Fusionner classes Tailwind sans conflits
- **clsx** : Classes conditionnelles propres
- **shadcn/ui** : Composants copiables (pas de dépendance npm lourde), accessibles par défaut
- **SweetAlert2** : Modales élégantes sans réinventer la roue
- **lucide-react** : Icônes cohérentes, tree-shakable
- **react-hook-form + zod** : Forms performantes avec validation TypeScript
- **@tanstack/react-query** : Cache intelligent, évite re-fetches inutiles

**À éviter** :
- ❌ Material-UI / Ant Design : Trop opiniâtre, difficile à thématiser
- ❌ Styled-components : Moins performant que Tailwind, runtime CSS
- ❌ Moment.js : Lourd, date-fns est plus léger et modulaire
- ❌ Axios : fetch natif suffit, ou utiliser react-query qui wrappe fetch
