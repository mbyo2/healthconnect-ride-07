# Internal Pages Design System

## Overview
This document provides guidelines for applying the Voiceflow-inspired modern design to all internal authenticated pages.

## Color Palette

### Primary Colors
- **Signal Blue**: `#397dff` (primary-500) - Primary actions, links, icons
- **Primary Variants**: primary-50 through primary-900
- **Usage**: Buttons, active states, important CTAs

### Background Colors
- **Canvas**: `bg-canvas` (#fafafa) - Main page background
- **Canvas Bone**: `bg-canvas-bone` (#f5f5f4) - Alternate sections
- **Card**: `bg-white` - Card backgrounds
- **Canvas Silk**: `#e5e5e5` - Borders

### Text Colors
- **Midnight**: `text-midnight` (#171717) - Primary headings
- **Graphite-500**: `text-graphite-500` (#57534e) - Body text, descriptions
- **Graphite-600**: `text-graphite-600` (#44403c) - Secondary text
- **Primary-500**: `text-primary-500` - Interactive elements, icons

### Accent Colors
- **Ember**: `accent-500` (#f55c15) - Alerts, special highlights
- **Success**: `success-500` (#22C55E) - Success states
- **Warning**: `warning-500` - Warning states

## Typography

### Fonts
```css
font-display: 'Fraunces' - Display headings
font-sans: 'Figtree' - Body text
```

### Heading Styles
```tsx
// Page Title (H1)
<h1 className="font-display text-4xl sm:text-5xl font-medium text-midnight tracking-tight">
  Dashboard Title
</h1>

// Section Title (H2)
<h2 className="font-display text-3xl sm:text-4xl font-medium text-midnight tracking-tight">
  Section Title
</h2>

// Subsection (H3)
<h3 className="font-medium text-lg text-midnight">
  Subsection
</h3>
```

### Body Text
```tsx
// Primary paragraph
<p className="text-base text-graphite-500 leading-relaxed tracking-wide">
  Main content text
</p>

// Secondary/helper text
<p className="text-sm text-graphite-500 leading-relaxed tracking-wide">
  Helper text
</p>
```

## Components

### Page Layout
```tsx
<div className="min-h-screen bg-canvas">
  <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-8">
    {/* Page content */}
  </div>
</div>
```

### Cards
```tsx
// Standard card
<div className="vf-card">
  {/* Card content */}
</div>

// Card with hover
<div className="vf-card hover:shadow-card-hover transition-all">
  {/* Card content */}
</div>
```

### Buttons
```tsx
// Primary button
<button className="vf-btn-primary">
  Primary Action
</button>

// Secondary button
<button className="vf-btn-secondary">
  Secondary Action
</button>

// Button with icon
<button className="vf-btn-primary gap-2">
  <Icon className="h-4 w-4" />
  Button Text
</button>
```

### Eyebrows (Section Labels)
```tsx
<div className="vf-eyebrow mb-4">
  <Icon className="h-3.5 w-3.5 text-accent-500" />
  Section Label
</div>
```

### Badges/Pills
```tsx
// Success badge
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-success-50 text-success-500 border border-success-100">
  <Icon className="h-3.5 w-3.5" />
  Badge Text
</span>

// Primary badge
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-primary-50 text-primary-500 border border-primary-100">
  Badge Text
</span>
```

### Stats/Metrics Cards
```tsx
<div className="vf-card space-y-3">
  <div className="p-2.5 rounded-2xl bg-primary-50 border border-primary-100 w-fit">
    <Icon className="h-5 w-5 text-primary-500" />
  </div>
  <div>
    <div className="text-3xl font-display font-medium text-midnight">
      {value}
    </div>
    <div className="text-sm text-graphite-500 mt-1">
      {label}
    </div>
  </div>
</div>
```

### Input Fields
```tsx
<Input 
  className="h-12 rounded-pill border-canvas-silk bg-white focus:border-primary-500 focus:ring-primary-500/20"
  placeholder="Enter text..."
/>
```

### Search Bars
```tsx
<div className="relative flex-1">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-graphite-400" />
  <Input
    type="search"
    placeholder="Search..."
    className="pl-10 h-12 rounded-pill border-canvas-silk"
  />
</div>
```

## Spacing

### Container Widths
- **max-w-content**: 75rem (1200px) - Standard content width
- **max-w-4xl**: For narrower content (forms, profiles)
- **max-w-7xl**: For wide dashboards

### Section Spacing
```tsx
// Section padding
className="vf-section" // py-section lg:py-section-lg

// Card gaps
gap-5 // Between cards in grid
gap-3 // Between elements inside cards

// Margin bottom for headers
mb-8 // After page titles
mb-6 // After section titles
```

## Page Templates

### Dashboard Page
```tsx
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="vf-eyebrow mb-4">
            <Icon className="h-3.5 w-3.5 text-accent-500" />
            Section Label
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-medium text-midnight tracking-tight mb-3">
            Dashboard Title
          </h1>
          <p className="text-base text-graphite-500 leading-relaxed tracking-wide max-w-2xl">
            Dashboard description text
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Stat cards */}
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Content */}
        </div>
      </div>
    </div>
  );
}
```

### List/Table Page
```tsx
export default function ListPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-medium text-midnight tracking-tight mb-2">
              List Title
            </h1>
            <p className="text-base text-graphite-500">
              List description
            </p>
          </div>
          <button className="vf-btn-primary">
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>

        {/* Search and Filters */}
        <div className="vf-card mb-6">
          {/* Search/filter components */}
        </div>

        {/* List Content */}
        <div className="vf-card">
          {/* Table or list items */}
        </div>
      </div>
    </div>
  );
}
```

### Detail Page
```tsx
export default function DetailPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="vf-card !p-8 mb-6">
          {/* Header content with avatar/image */}
        </div>

        {/* Details Cards */}
        <div className="grid gap-6">
          <div className="vf-card">
            <h2 className="font-medium text-lg text-midnight mb-4">
              Section Title
            </h2>
            {/* Section content */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Icons

### Icon Sizing
- **h-3.5 w-3.5**: Eyebrow icons
- **h-4 w-4**: Button icons, inline icons
- **h-5 w-5**: Card feature icons
- **h-6 w-6** or larger: Hero icons

### Icon Colors
- **text-primary-500**: Primary actions, active states
- **text-accent-500**: Special highlights, warnings
- **text-success-500**: Success states
- **text-graphite-500**: Default/neutral states

## Animations

### Entrance Animations
```tsx
// Hero rise (landing page style)
className="opacity-0 animate-hero-rise"
style={{ animationDelay: "0.15s" }}

// Fade in
className="animate-fadeIn"

// Hover states
className="transition-all hover:shadow-card-hover"
```

## Best Practices

### ✅ DO
- Use `vf-card` for all card components
- Use `font-display` for all headings
- Use `bg-canvas` for page backgrounds
- Use `text-graphite-500` for body text
- Use `rounded-pill` for buttons and badges
- Use consistent spacing (gap-5, gap-3)
- Add hover states to interactive elements

### ❌ DON'T
- Don't use `font-bold` or `font-black` (use `font-medium` instead)
- Don't use arbitrary colors (stick to the palette)
- Don't use `bg-gradient` (use solid colors)
- Don't use small border radius (use rounded-card, rounded-pill)
- Don't mix old and new styles in the same component

## Migration Checklist

When updating an internal page:

- [ ] Replace page background with `bg-canvas`
- [ ] Update container to `max-w-content`
- [ ] Change headings to `font-display` with `font-medium`
- [ ] Replace `Card` components with `vf-card`
- [ ] Update buttons to `vf-btn-primary` or `vf-btn-secondary`
- [ ] Add `vf-eyebrow` to section labels
- [ ] Update text colors to graphite scale
- [ ] Update icon colors to primary-500 or accent-500
- [ ] Use `rounded-pill` for buttons and badges
- [ ] Add proper spacing (gap-5 for grids, gap-3 internal)
- [ ] Test mobile responsiveness
- [ ] Verify color contrast (WCAG AA)

---

**Version**: 1.0  
**Last Updated**: 2026-09-04  
**Status**: Active
