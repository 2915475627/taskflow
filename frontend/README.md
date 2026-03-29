# TaskFlow Frontend

A modern workflow editor built with React 18, TypeScript, and Vite.

## Tech Stack

- **Framework**: React 18.x
- **Build Tool**: Vite 5.x
- **Language**: TypeScript 5.x
- **Routing**: React Router 6.x
- **State Management**: Zustand 4.x
- **Data Fetching**: TanStack Query (React Query) + Axios
- **UI Components**: Radix UI + Shadcn/ui
- **Workflow Canvas**: React Flow 11.x
- **Testing**: Vitest + React Testing Library + MSW
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing

```bash
npm run test        # Run tests
npm run test:ui     # Run tests with UI
npm run test:coverage  # Run with coverage
```

### Build

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn base components
│   │   └── workflow/      # Workflow editor components
│   ├── features/
│   │   └── editor/        # Editor feature module
│   ├── stores/            # Zustand stores
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   ├── types/             # TypeScript types
│   ├── pages/             # Page components
│   ├── routes/            # Route configuration
│   ├── mocks/              # MSW mocks
│   └── __tests__/         # Test files
```

## License

MIT
