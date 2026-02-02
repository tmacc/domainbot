# DomainBot - AI Coding Guidelines

## Project Overview

DomainBot is a self-modifying domain discovery agent with dynamic theming.

## Tech Stack

- **Frontend**: TanStack Start + TanStack Router (React 19)
- **Backend**: Convex (real-time database)
- **Auth**: Better Auth with Convex integration
- **Agent**: Convex Agent plugin + Vercel AI SDK
- **LLM**: Vercel AI Gateway (model-swappable)
- **Styling**: Tailwind CSS v4 + CSS Variables
- **Linting**: Ultracite (Biome-based)

## Code Style Rules

This project uses Ultracite with Biome. Follow these conventions:

### TypeScript

- Use double quotes for strings
- Always use semicolons
- Use 2-space indentation
- Prefer `const` over `let`
- Use explicit return types for functions
- Use `type` over `interface` when possible

### Imports

- Organize imports automatically (Biome handles this)
- Use named exports over default exports
- Import types with `type` keyword: `import type { Foo } from "./foo"`

### React

- Use function components with arrow functions
- Place hooks at the top of components
- Use `cn()` utility for conditional classNames
- Prefer composition over prop drilling

### Convex

- Queries are read-only, mutations modify data
- Use validators from `convex/values` for type safety
- Index tables for frequently queried fields
- Use `internalMutation` for seeding/admin operations

### File Naming

- Components: PascalCase (`ChatContainer.tsx`)
- Utilities: camelCase (`theme-context.tsx`)
- Convex functions: camelCase (`users.ts`, `themes.ts`)

### CSS/Tailwind

- Use CSS variables for theming: `var(--theme-color-primary)`
- Use Tailwind utilities mapped to CSS vars: `bg-primary`, `text-text`
- Apply themes via `data-theme` attribute on `<html>`

## Project Structure

```
domainbot/
├── convex/           # Backend (Convex functions)
│   ├── agent/        # Agent definition + tools
│   └── *.ts          # Queries, mutations
├── src/
│   ├── routes/       # TanStack file-based routes
│   ├── components/   # React components
│   ├── lib/          # Utilities, contexts
│   └── styles/       # CSS + theme definitions
```

## Running the Project

```bash
npm run dev          # Start dev server
npm run lint         # Check code with Biome
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code
```

## Key Files

- `convex/schema.ts` - Database schema
- `src/styles/app.css` - Theme system CSS
- `convex/agent/index.ts` - Agent definition
- `src/lib/theme-context.tsx` - Theme React context
