# Design System - Plateforme d'Annales

Ce document décrit le système de design implémenté dans le frontend de la plateforme.

## Principes

1. **Mobile-first** : Design pensé pour mobile, adapté ensuite pour tablette et desktop
2. **Tailwind CSS** : Utility-first, pas de valeurs en dur (px, couleurs hex directes)
3. **Accessibilité** : Contraste WCAG AA, navigation clavier, focus visible
4. **Simplicité** : Animations minimales (150ms max), pas d'effets complexes

---

## Palette de Couleurs

Définie dans `tailwind.config.js` et utilisable via les classes Tailwind.

### Couleurs Principales

| Token | Valeur | Usage |
|-------|--------|-------|
| `primary` | #2563eb | Actions principales, liens, focus |
| `primary-hover` | #1d4ed8 | Hover des éléments primary |
| `primary-light` | #dbeafe | Backgrounds subtils |
| `secondary` | #64748b | Textes secondaires |
| `secondary-dark` | #334155 | Textes importants |

### Backgrounds

| Token | Valeur | Usage |
|-------|--------|-------|
| `bg-primary` | #ffffff | Background principal |
| `bg-secondary` | #f8fafc | Zones secondaires, cards |
| `bg-tertiary` | #f1f5f9 | Hover, états actifs |

### Couleurs Sémantiques

| Token | Couleur | Background | Usage |
|-------|---------|------------|-------|
| `success` | #10b981 | #d1fae5 | Validation, succès |
| `warning` | #f59e0b | #fef3c7 | Avertissements |
| `error` | #ef4444 | #fee2e2 | Erreurs, danger |
| `info` | #3b82f6 | #dbeafe | Informations |

### Bordures

| Token | Valeur | Usage |
|-------|--------|-------|
| `border` | #e2e8f0 | Bordures par défaut |
| `border-focus` | #3b82f6 | États focus |

---

## Typographie

### Familles de Polices

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Échelle (Tailwind par défaut)

- `text-xs` : 12px - Badges, timestamps
- `text-sm` : 14px - Métadonnées, labels
- `text-base` : 16px - Texte standard
- `text-lg` : 18px - Sous-titres
- `text-xl` : 20px - Titres cards
- `text-2xl` : 24px - Titres sections
- `text-3xl` : 30px - Titre page

---

## Espacements et Rayons

### Border Radius

| Token | Valeur | Usage |
|-------|--------|-------|
| `rounded-input` | 8px | Inputs, badges |
| `rounded-card` | 12px | Cards |
| `rounded-xl` | 12px | Cards principales |
| `rounded-2xl` | 16px | Modales |

### Containers

| Token | Valeur |
|-------|--------|
| `max-w-container-sm` | 640px |
| `max-w-container-md` | 768px |
| `max-w-container-lg` | 1024px |
| `max-w-container-xl` | 1280px |

---

## Composants UI

Situés dans `web/src/components/ui/`.

### Button

```tsx
import { Button } from '@/components/ui'

<Button variant="primary" size="md">Action</Button>
```

**Variants** : `primary` | `secondary` | `ghost` | `danger`
**Sizes** : `sm` (h-8) | `md` (h-10) | `lg` (h-12)

### Input

```tsx
import { Input } from '@/components/ui'

<Input
  label="Email"
  error="Email invalide"
  helperText="Utilisez votre email universitaire"
/>
```

**Props** : `label`, `error`, `helperText` + attributs HTML standard

### Icon

```tsx
import { SearchIcon, TrashIcon } from '@/components/ui/Icon'

<SearchIcon size="md" className="text-secondary" />
```

**Sizes** : `sm` (12px) | `md` (16px) | `lg` (20px)

**Icônes disponibles** : SearchIcon, ModuleIcon, DocumentIcon, EyeIcon, ErrorIcon, EmptyStateIcon, BackIcon, DownloadIcon, TrashIcon, CopyIcon

> Pour des icônes supplémentaires, utiliser `lucide-react`.

---

## Utilitaires

### cn() - Fusion de classes

```tsx
import { cn } from '@/utils/cn'

<div className={cn(
  'base-class',
  condition && 'conditional-class',
  className
)}>
```

### SweetAlert2 - Modales

```tsx
import { showReportModal, showReportSuccess } from '@/utils/reportModal'

const result = await showReportModal('Signaler l\'examen', 'exam')
if (result) {
  // result.reason, result.description
  showReportSuccess()
}
```

### LaTeX - Rendu mathématique

```tsx
import { renderLatex } from '@/utils/latex'

<div dangerouslySetInnerHTML={{ __html: renderLatex('$x^2 + y^2 = z^2$') }} />
```

Macros disponibles : `\R`, `\N`, `\Z`, `\Q`, `\C`, `\K` (ensembles mathématiques)

---

## Hooks

### useRouter - Navigation

```tsx
import { useRouter } from '@/hooks/useRouter'

const { currentRoute, navigate, isPage, getExamId } = useRouter()

navigate('exam', { examId: '123' })
if (isPage('login')) { /* ... */ }
```

**Routes** : `/`, `/upload`, `/admin/reports`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/exam/:examId`

### useInstance - Multi-instances

```tsx
import { useInstance } from '@/hooks/useInstance'

const { name, shortName, logoPath } = useInstance()
```

Variables d'environnement : `VITE_INSTANCE_NAME`, `VITE_INSTANCE_SHORT_NAME`, `VITE_LOGO_PATH`

### useCommentPositioning - Annotations PDF

```tsx
import { useCommentPositioning } from '@/hooks/useCommentPositioning'

const { pendingPosition, handlePageClick, confirmComment, cancelComment } = useCommentPositioning(examId, onCommentAdded)
```

---

## Responsive Design

### Breakpoints (3 uniquement)

| Préfixe | Largeur min | Usage |
|---------|-------------|-------|
| (base) | 0px | Mobile |
| `md:` | 768px | Tablette |
| `lg:` | 1024px | Desktop |

> Ne pas utiliser `sm:`, `xl:`, `2xl:`.

### Patterns courants

```tsx
// Grille responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// Padding adaptatif
<div className="p-4 md:p-6 lg:p-8">

// Direction flex
<div className="flex flex-col md:flex-row">

// Visibilité
<span className="hidden md:inline">Texte desktop</span>
```

---

## Patterns de Pages

### Structure type

```tsx
<div className="min-h-screen bg-gradient-to-br from-bg-secondary to-primary-light flex items-center justify-center p-4">
  <div className="w-full max-w-md">
    <div className="bg-white border border-border rounded-xl shadow-xl p-6 md:p-8">
      {/* Header avec icône */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-dark">Titre</h1>
        <p className="text-secondary mt-1">Description</p>
      </div>

      {/* Contenu */}
    </div>
  </div>
</div>
```

### Affichage d'erreurs

```tsx
{error && (
  <div className="bg-error-bg border border-error/20 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
    <div className="flex items-start gap-3">
      <ErrorIcon className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-error font-medium">{error}</p>
      </div>
      <button onClick={() => setError(null)}>
        <X className="w-4 h-4 text-error/60 hover:text-error" />
      </button>
    </div>
  </div>
)}
```

### État de chargement

```tsx
<div className="flex items-center justify-center gap-2">
  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  <span>Chargement...</span>
</div>
```

### État vide

```tsx
<div className="text-center py-12">
  <div className="w-16 h-16 bg-bg-tertiary rounded-2xl flex items-center justify-center mx-auto mb-4">
    <EmptyStateIcon className="w-8 h-8 text-secondary" />
  </div>
  <h3 className="text-lg font-medium text-secondary-dark">Aucun résultat</h3>
  <p className="text-secondary mt-1">Essayez de modifier vos filtres</p>
</div>
```

---

## State Management

### Auth Store (Zustand)

```tsx
import { useAuthStore } from '@/stores/authStore'

const { user, token, login, logout, isLoading, error } = useAuthStore()
```

Le store persiste `user` et `token` dans localStorage.

### Permissions

```tsx
import { PermissionUtils } from '@/utils/permissions'

PermissionUtils.isAdmin(user)           // boolean
PermissionUtils.canDelete(user, ownerId) // owner ou admin
PermissionUtils.canEdit(user, ownerId)   // owner uniquement
```

---

## Formulaires

### Pattern standard

```tsx
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)
  setIsLoading(true)

  try {
    // validation et soumission
  } catch (err) {
    setError(err.message)
  } finally {
    setIsLoading(false)
  }
}

<form onSubmit={handleSubmit} className="space-y-5">
  <Input label="Champ" required />
  <Button type="submit" disabled={isLoading}>
    {isLoading ? 'Envoi...' : 'Envoyer'}
  </Button>
</form>
```

---

## Checklist Qualité

Avant de valider un composant :

- [ ] Pas de valeurs en dur (px, couleurs hex)
- [ ] Mobile-first (`grid-cols-1 md:grid-cols-2`, pas l'inverse)
- [ ] Uniquement breakpoints `md:` et `lg:`
- [ ] Props TypeScript typées
- [ ] États de chargement et d'erreur gérés
- [ ] Focus visible pour navigation clavier
- [ ] Contraste suffisant (texte lisible)

---

## Dépendances Frontend

| Package | Usage |
|---------|-------|
| `tailwindcss` + `tailwind-merge` + `clsx` | Styles |
| `lucide-react` | Icônes |
| `sweetalert2` | Modales |
| `zustand` | State management |
| `axios` | Requêtes HTTP |
| `pdfjs-dist` | Rendu PDF |
| `katex` | Rendu LaTeX |
| `react-dropzone` | Upload fichiers |
