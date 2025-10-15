# SonnaLab - Le laboratoire d'idées qui transforme le digital

[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Latest-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

> **Site web officiel de SonnaLab** - Laboratoire d'innovation digitale spécialisé dans le développement web, applications mobiles et solutions technologiques sur-mesure.

🌐 **Site web**: [https://sonnalab.com](https://sonnalab.com)  
📦 **Repository**: [https://github.com/SonnaLab/website.git](https://github.com/SonnaLab/website.git)

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Technologies](#-technologies)
- [Structure du projet](#-structure-du-projet)
- [Installation](#-installation)
- [Scripts disponibles](#-scripts-disponibles)
- [Guide d'édition](#-guide-dédition)
- [Déploiement](#-déploiement)
- [Contact](#-contact)

---

## 🎯 À propos

SonnaLab est un laboratoire d'innovation digitale qui transforme les idées en solutions technologiques concrètes. Nous accompagnons les entreprises dans leur transformation digitale avec :

- **Développement sur mesure** : Sites web, applications mobiles, e-commerce
- **Conseil technologique** : Positionnement CTO externe, architecture technique
- **Recherche & Innovation** : IA, Blockchain, Cloud Computing, IoT
- **Applications phares** : Lescopr, Lebocheur, Lecolt

---

## ✨ Fonctionnalités

### Interface utilisateur
- ✅ Design moderne et responsive (mobile-first)
- ✅ Navigation fluide avec header fixe glassmorphism
- ✅ Animations et transitions élégantes
- ✅ Mode clair adaptatif selon les sections

### Sections principales
- 🏠 **Hero Section** : Présentation avec recherche de projet
- 🛠️ **Services** : 6 catégories de services (Web, Mobile, E-commerce, Design, Stratégie, Sur-mesure)
- 📊 **Processus** : 4 étapes de collaboration
- 🏢 **À propos** : Mission, expertise et chiffres clés
- 🔬 **R&D** : 5 axes de recherche (IA, Blockchain, Cloud, Cybersécurité, Quantum)
- 🏆 **Succès** : Métriques de performance (4.9/5, 100+ projets, 98% satisfaction)
- 💬 **Témoignages** : Retours clients authentiques
- 📞 **Footer** : Contact, newsletter, liens rapides

### Performance & SEO
- ⚡ Optimisation Vite pour builds ultra-rapides
- 🎨 Tailwind CSS v4 avec variables CSS natives
- 🔍 SEO optimisé (Open Graph, Twitter Cards, JSON-LD)
- 📱 PWA ready avec manifeste
- 🖼️ Images optimisées avec fallback

---

## 🛠️ Technologies

### Frontend Core
- **React 18** - Library UI moderne
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS v4** - Framework CSS utility-first

### UI/UX
- **shadcn/ui** - Composants accessibles
- **Radix UI** - Primitives headless
- **Lucide React** - Icônes modernes
- **Sonner** - Toast notifications

### Formulaires & Data
- **React Hook Form** - Gestion de formulaires
- **Recharts** - Graphiques & visualisations

### Fonts & Assets
- **Google Fonts (Raleway)** - Typographie personnalisée
- **Unsplash** - Images sous licence libre

---

## 📁 Structure du projet

```
SonnaLab/
├── public/                    # Assets statiques
│   ├── favicon/              # Favicons multi-formats
│   └── site.webmanifest      # Manifeste PWA
│
├── src/
│   ├── assets/               # Images et logos
│   │   ├── favicon/
│   │   └── logo/
│   │
│   ├── components/           # Composants React
│   │   ├── Header.tsx        # Navigation avec glassmorphism
│   │   ├── HeroSection.tsx   # Section héro
│   │   ├── ServicesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ResearchSection.tsx
│   │   ├── SuccessSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── Footer.tsx
│   │   ├── figma/           # Composants Figma
│   │   └── ui/              # Composants UI (shadcn)
│   │
│   ├── styles/
│   │   └── globals.css      # Variables CSS & thème
│   │
│   ├── guidelines/
│   │   └── Guidelines.md    # Guidelines de design
│   │
│   ├── types/
│   │   └── images.d.ts      # Types TypeScript
│   │
│   ├── App.tsx              # Composant principal
│   ├── main.tsx             # Point d'entrée
│   ├── index.css            # Styles Tailwind
│   ├── EDITING_GUIDE.md     # Guide d'édition
│   └── Attributions.md      # Crédits
│
├── index.html               # Template HTML avec SEO
├── vite.config.ts           # Configuration Vite
├── tsconfig.json            # Configuration TypeScript
├── tailwind.config.ts       # Configuration Tailwind
└── package.json             # Dépendances
```

---

## 🚀 Installation

### Prérequis
- Node.js >= 18.x
- npm >= 9.x ou yarn >= 1.22

### Installation des dépendances

```bash
# Cloner le repository
git clone https://github.com/SonnaLab/website.git
cd website

# Installer les dépendances
npm install
# ou
yarn install
```

---

## 📜 Scripts disponibles

```bash
# Démarrer le serveur de développement (http://localhost:3000)
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Linter le code
npm run lint
```

---

## ✏️ Guide d'édition

### Modifier les couleurs

Éditer [`src/styles/globals.css`](src/styles/globals.css) :

```css
:root {
  --font-size: 14px;
  --background: #fafbfb;
  --foreground: #2d3748;
  --primary: #000000;
  --primary-foreground: #ffffff;
  /* ... */
}
```

### Ajouter une nouvelle section

1. Créer le composant dans [`src/components/`](src/components/)
2. Importer dans [`src/App.tsx`](src/App.tsx)
3. Ajouter au routage si nécessaire

```tsx
import { YourSection } from './components/YourSection';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-0">
        <HeroSection />
        {/* Votre nouvelle section */}
        <YourSection />
        <Footer />
      </main>
    </div>
  );
}
```

### Modifier le contenu

Les principaux fichiers à éditer :
- **Textes Hero** : [`src/components/HeroSection.tsx`](src/components/HeroSection.tsx)
- **Services** : [`src/components/ServicesSection.tsx`](src/components/ServicesSection.tsx)
- **Navigation** : [`src/components/Header.tsx`](src/components/Header.tsx)
- **Footer** : [`src/components/Footer.tsx`](src/components/Footer.tsx)

📚 **Guide complet** : [`src/EDITING_GUIDE.md`](src/EDITING_GUIDE.md)

---

## 🌐 Déploiement

### Build de production

```bash
npm run build
```

Le dossier `build/` contiendra les fichiers optimisés.

### Déploiement recommandé

- **Vercel** : Déploiement automatique depuis GitHub
- **Netlify** : Configuration zero-config
- **GitHub Pages** : Via GitHub Actions
- **VPS** : Nginx + reverse proxy

### Variables d'environnement

Créer un fichier `.env` :

```env
VITE_API_URL=https://api.sonnalab.com
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

---

## 📞 Contact

- **Website** : [https://sonnalab.com](https://sonnalab.com)
- **Email** : hello@sonnalab.fr
- **Localisation** : Station F, Paris, France
- **GitHub** : [https://github.com/SonnaLab](https://github.com/SonnaLab)

---

## 📄 Licence

© 2024 SonnaLab. Tous droits réservés.

### Crédits

- UI Components: [shadcn/ui](https://ui.shadcn.com/) (MIT License)
- Images: [Unsplash](https://unsplash.com) (Unsplash License)
- Icons: [Lucide](https://lucide.dev/) (ISC License)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 🏆 Roadmap

- [ ] Mode sombre complet
- [ ] Blog tech intégré
- [ ] Formulaire de contact avec Netlify Forms
- [ ] Animations GSAP avancées
- [ ] CMS Headless (Strapi/Sanity)
- [ ] Tests E2E avec Playwright
- [ ] Internationalisation (i18n)

---

**Made with ❤️ by SonnaLab Team**