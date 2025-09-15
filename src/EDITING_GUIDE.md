# PulsePathology Website - Manual Editing Guide

## 🏗️ File Structure Overview

Your website is built with **React + TypeScript** and **Tailwind CSS**. Here's how everything is organized:

```
/
├── App.tsx                    # Main app component - controls page layout
├── styles/globals.css         # Color themes, typography, and design tokens
├── components/                # All reusable components
│   ├── Header.tsx            # Navigation bar
│   ├── HeroSection.tsx       # Top banner section
│   ├── ServicesSection.tsx   # Services showcase
│   ├── HowItWorksSection.tsx # Process steps
│   ├── AboutSection.tsx      # About us content
│   ├── TestimonialsSection.tsx # Customer reviews
│   ├── Footer.tsx            # Bottom section
│   └── ui/                   # Pre-built UI components (buttons, forms, etc.)
└── guidelines/Guidelines.md   # Your custom styling rules
```

## 🎨 Making Design Changes

### 1. **Colors & Branding**
Edit `/styles/globals.css` to change colors:

```css
:root {
  --medical-green: #059669;    /* Primary green */
  --medical-teal: #0891b2;     /* Secondary teal */
  --medical-navy: #1a365d;     /* Dark navy */
  --medical-coral: #f97316;    /* Accent coral */
}
```

**Quick color changes:**
- Change `--medical-green` to update primary buttons and accents
- Change `--medical-navy` to update text and dark elements
- Change `--background` to update page background

### 2. **Typography**
In `/styles/globals.css`, modify:
```css
:root {
  --font-size: 14px;           /* Base font size */
}

h1 { font-size: var(--text-2xl); }  /* Large headings */
h2 { font-size: var(--text-xl); }   /* Medium headings */
p { font-size: var(--text-base); }  /* Body text */
```

### 3. **Component Styling**
Each component uses Tailwind classes. Common patterns:
- `bg-[var(--medical-green)]` = Green background
- `text-[var(--medical-navy)]` = Navy text
- `hover:bg-[var(--medical-teal)]` = Hover effects
- `md:text-lg` = Responsive sizing

## 📝 Content Changes

### 1. **Hero Section** (`/components/HeroSection.tsx`)
```tsx
// Change main headline
<h1 className="text-4xl md:text-6xl mb-6">
  Your New Headline Here
</h1>

// Change description
<p className="text-xl mb-8 max-w-2xl mx-auto">
  Your new description text here
</p>

// Change button text
<Button size="lg">
  Your Button Text
</Button>
```

### 2. **Services** (`/components/ServicesSection.tsx`)
Look for the `services` array:
```tsx
const services = [
  {
    title: "Your Service Name",
    description: "Your service description",
    icon: "🔬", // Change emoji or use Lucide icons
  },
  // Add more services...
];
```

### 3. **Navigation** (`/components/Header.tsx`)
Find the navigation items:
```tsx
const navItems = [
  { name: 'Home', href: '#home' },
  { name: 'Services', href: '#services' },
  { name: 'About', href: '#about' },
  // Add/remove items here
];
```

## 🧩 Adding New Sections

### 1. **Create New Component**
Create `/components/YourNewSection.tsx`:
```tsx
import React from 'react';

export function YourNewSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl mb-8 text-center">Your Section Title</h2>
        {/* Your content here */}
      </div>
    </section>
  );
}
```

### 2. **Add to Main App**
In `/App.tsx`, import and add your section:
```tsx
import { YourNewSection } from './components/YourNewSection';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-0">
        <HeroSection />
        <ServicesSection />
        <YourNewSection />  {/* Add here */}
        <AboutSection />
        {/* ... */}
      </main>
      <Footer />
    </div>
  );
}
```

## 🎯 Common Tasks

### **Change Company Name**
Search and replace "PulsePathology" across all files:
- `/components/Header.tsx` - Logo text
- `/components/Footer.tsx` - Footer branding
- `/components/HeroSection.tsx` - Headlines

### **Update Contact Information**
Edit `/components/Footer.tsx`:
```tsx
const contactInfo = {
  phone: "+1 (555) 123-4567",
  email: "info@pulsepathology.com",
  address: "123 Medical Center Dr, City, State 12345"
};
```

### **Add Social Media Links**
In `/components/Footer.tsx`, find the social links array:
```tsx
const socialLinks = [
  { name: 'Facebook', href: '#', icon: Facebook },
  { name: 'Twitter', href: '#', icon: Twitter },
  // Add more platforms
];
```

### **Modify Button Styles**
Use pre-built variants in `/components/ui/button.tsx`:
```tsx
<Button variant="default">Primary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Text Button</Button>
<Button size="sm">Small Button</Button>
<Button size="lg">Large Button</Button>
```

## 🔧 Technical Notes

### **Icons**
Using Lucide React icons:
```tsx
import { Heart, Phone, Mail } from 'lucide-react';

<Heart className="w-6 h-6 text-red-500" />
```

### **Responsive Design**
Tailwind breakpoints:
- `sm:` = 640px and up
- `md:` = 768px and up  
- `lg:` = 1024px and up
- `xl:` = 1280px and up

### **Custom Guidelines**
Add your own rules in `/guidelines/Guidelines.md` to ensure consistency:
```markdown
# Brand Guidelines
- Always use --medical-green for primary CTAs
- Maintain 8px spacing grid (space-2, space-4, space-8)
- Use rounded-lg for all cards and buttons
```

## 🚀 Quick Start Checklist

1. **Update branding**: Change colors in `globals.css`
2. **Update content**: Edit text in component files
3. **Add your logo**: Replace pulse icon in `Header.tsx`
4. **Update contact info**: Modify `Footer.tsx`
5. **Test responsiveness**: Check on mobile/tablet views
6. **Add your content**: Create new sections as needed

## 💡 Pro Tips

- **Use CSS variables**: `var(--medical-green)` instead of hex codes
- **Follow Tailwind patterns**: `hover:`, `focus:`, `active:` states
- **Keep components small**: Break large sections into smaller components
- **Use semantic HTML**: `<section>`, `<article>`, `<nav>` for accessibility
- **Test on mobile first**: Most users are on mobile devices

## 🆘 Need Help?

If you get stuck:
1. Check the console for errors (F12 → Console)
2. Verify import statements are correct
3. Make sure file names match exactly (case-sensitive)
4. Use the AI assistant for complex changes

Happy editing! 🎉