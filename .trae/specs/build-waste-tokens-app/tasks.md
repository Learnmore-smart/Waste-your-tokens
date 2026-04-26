# Tasks

- [x] Task 1: Scaffold Next.js 14+ App Router project with TypeScript and Tailwind CSS
  - [x] SubTask 1.1: Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in project root
  - [x] SubTask 1.2: Install additional dependencies: `framer-motion` for animations
  - [x] SubTask 1.3: Verify the dev server starts successfully

- [x] Task 2: Build the API proxy route for LLM requests
  - [x] SubTask 2.1: Create `src/app/api/burn/route.ts` — POST handler that accepts `{ apiKey, baseUrl, model }` from the request body, sends a deliberately wasteful prompt to the OpenAI-compatible chat completions endpoint, and returns token usage data
  - [x] SubTask 2.2: Define the wasteful prompt (e.g., "Write a 2000-word essay about nothing, then summarize it into a single word, then expand that word into another 2000-word essay")
  - [x] SubTask 2.3: Handle error responses gracefully and return structured error JSON

- [x] Task 3: Build the core UI components
  - [x] SubTask 3.1: Create `src/components/BurnButton.tsx` — the massive centered "Burn Tokens" button with fire glow/pulse animation states (idle, burning, error)
  - [x] SubTask 3.2: Create `src/components/FireEffect.tsx` — particle/ember animation that plays on button press using Framer Motion
  - [x] SubTask 3.3: Create `src/components/MetricsDashboard.tsx` — displays Total Tokens Wasted, Total API Calls, Estimated Cost with animated number tick-up
  - [x] SubTask 3.4: Create `src/components/GuiltTracker.tsx` — displays Carbon Footprint (g CO₂), Equivalent Miles Driven, Trees Needed to Offset
  - [x] SubTask 3.5: Create `src/components/SettingsSidebar.tsx` — slide-out sidebar with API Key input, Model selector, Base URL input, saved to localStorage

- [x] Task 4: Build the main page layout
  - [x] SubTask 4.1: Create `src/app/page.tsx` — compose all components into the main layout: dark background, BurnButton centered, MetricsDashboard below, GuiltTracker below that, SettingsSidebar accessible via gear icon
  - [x] SubTask 4.2: Create `src/app/layout.tsx` — root layout with dark theme, custom fonts, metadata
  - [x] SubTask 4.3: Create `src/app/globals.css` — dark fiery theme CSS variables, background effects, global styles

- [x] Task 5: Implement state management and data flow
  - [x] SubTask 5.1: Create `src/hooks/useTokenBurner.ts` — custom hook that manages: calling the /api/burn endpoint, tracking cumulative token counts, calculating environmental metrics, persisting state to localStorage
  - [x] SubTask 5.2: Create `src/hooks/useSettings.ts` — custom hook for managing API key, model, and base URL in localStorage
  - [x] SubTask 5.3: Create `src/lib/conversions.ts` — conversion factors for environmental impact (tokens → CO₂ grams → miles → trees)

- [x] Task 6: Polish animations and visual effects
  - [x] SubTask 6.1: Add Framer Motion entrance animations for metrics cards (staggered reveal)
  - [x] SubTask 6.2: Add number counting-up animation for metrics using `framer-motion`'s `useSpring` or custom counter
  - [x] SubTask 6.3: Add subtle background ember/heat haze effect using CSS animations
  - [x] SubTask 6.4: Ensure all animations respect `prefers-reduced-motion`

- [ ] Task 7: Verify and test
  - [ ] SubTask 7.1: Run `npm run build 2>&1` and fix any errors
  - [ ] SubTask 7.2: Run `npm run lint` and fix any warnings
  - [ ] SubTask 7.3: Manually verify the app works end-to-end in the browser

# Task Dependencies
- [Task 2] depends on [Task 1] (needs the Next.js project scaffolded)
- [Task 3] depends on [Task 1] (needs the Next.js project scaffolded)
- [Task 4] depends on [Task 3] (needs components to compose)
- [Task 5] depends on [Task 1] (needs the Next.js project scaffolded)
- [Task 6] depends on [Task 3, Task 4] (needs components and layout to animate)
- [Task 7] depends on [Task 4, Task 5, Task 6] (needs everything integrated)

# Parallelizable Work
- Task 2, Task 3, and Task 5 can be done in parallel after Task 1 is complete
- Task 6 can partially overlap with Task 4 (entrance animations can be built alongside layout)
