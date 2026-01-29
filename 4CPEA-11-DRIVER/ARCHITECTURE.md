# Project Architecture

This document outlines the professional structure and architecture of the Driver Web App.

## 📁 Folder Structure

```
src/
├── components/          # Reusable React components
│   ├── ui/             # Base UI components (Card, Button, etc.)
│   ├── dashboard/      # Dashboard-specific reusable components
│   ├── Logo.jsx        # Application logo
│   └── ChooseDestinationSymbol.jsx
│
├── pages/              # Page-level components
│   ├── Login.jsx
│   ├── TwoStepVerification.jsx
│   ├── Dashboard.jsx          # Page with inline components
│   └── Dashboard.module.css    # Page-specific styles
│
├── hooks/              # Custom React hooks
│   └── useSidebar.js
│
├── constants/          # Application constants
│   └── index.js
│
├── config/             # Configuration files
│   └── index.js
│
├── services/           # API service layer
│   └── api.js
│
├── utils/              # Utility functions
│   ├── index.js
│   └── cn.js           # Class name utility
│
├── App.jsx             # Main app component with routing
├── main.jsx            # Application entry point
└── index.css           # Global styles
```

## 🏗️ Architecture Principles

### 1. **Component Composition**
- Large components are broken down into smaller, reusable components
- Each component has a single responsibility
- Components are organized by feature/domain

### 2. **Separation of Concerns**
- **UI Components**: Pure presentational components in `components/ui/`
- **Feature Components**: Domain-specific components in `components/dashboard/`
- **Business Logic**: Separated into hooks, services, and utils
- **Data**: Constants and configuration in dedicated folders

### 3. **Reusability**
- Base UI components (Card, Button) can be used across the app
- Custom hooks encapsulate reusable logic
- Utility functions are shared across components

### 4. **Maintainability**
- Clear folder structure makes it easy to find files
- Consistent naming conventions
- Constants centralized for easy updates
- Service layer ready for API integration

## 📦 Component Organization

### UI Components (`components/ui/`)
Base components that can be used throughout the application:
- `Card.jsx` - Container component with consistent styling
- `Button.jsx` - Reusable button with variants

### Feature Components (`components/dashboard/`)
Dashboard-specific reusable components:
- `DashboardHeader.jsx` - Dashboard header with app name and menu
- `Sidebar.jsx` - Navigation sidebar

**Note:** Page-specific components (cards, sections) are consolidated within their respective page files with CSS Modules for better organization and maintainability.

## 🔧 Custom Hooks

### `useSidebar`
Manages sidebar open/close state with helper methods:
```javascript
const { isOpen, toggle, open, close } = useSidebar(true)
```

## 📊 Data Management

### Constants (`constants/index.js`)
- Application constants (APP_NAME, ROUTES, etc.)
- Sample data (to be replaced with API calls)
- Configuration values

### Services (`services/api.js`)
- API service layer ready for backend integration
- Organized by domain (auth, dashboard)
- Error handling and request configuration

## 🎨 Styling Approach

We use a **hybrid approach** combining the best of both worlds:

### CSS Modules (Component Styles)
- **Component-specific styles** in `.module.css` files
- Scoped CSS that prevents style conflicts
- Traditional CSS separation of concerns
- Each component has its own CSS module file

### Tailwind CSS (Utilities)
- **Global utilities** in `index.css` for base styles
- **Utility classes** for quick styling where appropriate
- Custom design tokens in `tailwind.config.js`
- Used for global styles, animations, and utilities

### Benefits
- ✅ **Separation of concerns**: Component styles in CSS files
- ✅ **Scoped styles**: CSS Modules prevent naming conflicts
- ✅ **Maintainability**: Easy to find and update component styles
- ✅ **Performance**: CSS Modules are optimized by Vite
- ✅ **Flexibility**: Can use Tailwind utilities when needed

## 🚀 Best Practices Implemented

1. ✅ **Component Extraction**: Large components broken into smaller pieces
2. ✅ **Custom Hooks**: Reusable logic extracted to hooks
3. ✅ **Constants Management**: Centralized configuration
4. ✅ **Service Layer**: Ready for API integration
5. ✅ **Type Safety**: Clear prop interfaces (can be enhanced with TypeScript)
6. ✅ **Code Organization**: Logical folder structure
7. ✅ **Reusability**: Shared components and utilities
8. ✅ **Maintainability**: Easy to find and update code

## 🔄 Future Enhancements

- Add TypeScript for type safety
- Implement state management (Context API or Redux)
- Add error boundaries
- Implement loading states
- Add form validation library
- Add unit tests
- Add E2E tests
- Implement API integration
- Add environment-specific configurations