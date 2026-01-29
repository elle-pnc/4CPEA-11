# Styling Guide

This project uses a **hybrid styling approach** combining CSS Modules and Tailwind CSS.

## Approach Overview

### CSS Modules (Primary)
Component-specific styles are written in CSS Module files (`.module.css`). This provides:
- ✅ **Scoped styles** - No naming conflicts
- ✅ **Traditional CSS** - Familiar syntax and organization
- ✅ **Better maintainability** - Styles live with components
- ✅ **Type safety** - Can be enhanced with TypeScript

### Tailwind CSS (Utilities)
Tailwind is used for:
- Global base styles (`index.css`)
- Utility classes for quick styling
- Custom design tokens (shadows, colors, animations)

## File Structure

```
src/
├── pages/
│   ├── Dashboard.jsx
│   └── Dashboard.module.css           ← All dashboard page styles
├── components/
│   └── ui/
│       ├── Button.jsx
│       ├── Button.module.css          ← Reusable component styles
│       └── Card.module.css
└── index.css                          ← Global Tailwind styles
```

**Note:** Page-specific components (cards, sections) are consolidated within their page files with a single CSS module per page. This keeps related code together and makes maintenance easier.

## Usage Example

### Component with CSS Module

**TerminalCard.jsx:**
```jsx
import styles from './TerminalCard.module.css'
import cn from '../../utils/cn'

function TerminalCard({ terminal, active }) {
  return (
    <div className={cn(styles.terminalCard, active && styles.active)}>
      <span className={styles.terminalName}>{terminal.name}</span>
    </div>
  )
}
```

**TerminalCard.module.css:**
```css
.terminalCard {
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: white;
}

.terminalCard.active {
  background-color: rgb(240, 253, 244);
}
```

## Utility Functions

### `cn()` - Class Name Utility
A simple utility to combine class names (similar to `clsx`):

```jsx
import cn from '../../utils/cn'

// Combine multiple classes
<div className={cn(styles.card, isActive && styles.active, className)} />
```

## Best Practices

1. **Use CSS Modules for component-specific styles**
   - Layout, spacing, colors specific to a component
   - Complex styling logic

2. **Use Tailwind for utilities**
   - Quick utility classes when needed
   - Global styles and animations

3. **Keep styles close to components**
   - CSS module file next to component file
   - Easy to find and maintain

4. **Use semantic class names**
   - `.terminalCard` not `.card1`
   - `.passengerHeader` not `.header`

## Organization Strategy

### Page-Level Components
Page-specific components (cards, sections) are consolidated within their page files:
- ✅ `Dashboard.jsx` - Contains all dashboard cards and sections inline
- ✅ `Dashboard.module.css` - Contains all dashboard-specific styles

### Reusable Components
Only truly reusable components have separate files:
- ✅ `Button` - Used across multiple pages
- ✅ `Card` - Base container component
- ✅ `DashboardHeader` - Complex reusable component
- ✅ `Sidebar` - Complex reusable component

This approach:
- ✅ Keeps related code together
- ✅ Reduces file fragmentation
- ✅ Makes it easier to understand page structure
- ✅ Maintains professional organization