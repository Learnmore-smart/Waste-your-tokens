# Waste Your Tokens — Spec

## Why
There is no simpler, more satisfying way to burn LLM API tokens. This app turns token wastage into a visceral, guilt-inducing, visually delightful experience — one giant button at a time.

## What Changes
- Scaffold a Next.js 14+ App Router project with TypeScript and Tailwind CSS
- Build a single-page app with a massive "Burn Tokens" button as the hero element
- Implement real-time token-wastage metrics dashboard (total tokens, requests, cost)
- Build an Environmental Guilt Tracker (carbon grams, equivalent miles driven, trees to offset)
- Create a settings slide-out sidebar for API key input and model selection
- Add satisfying fire/burn animations and number-ticking effects on button press
- Create a Next.js API route that proxies LLM requests (OpenAI-compatible) and tracks token usage

## Impact
- Affected specs: N/A (greenfield project)
- Affected code: Entire new project under `d:\Noah\文档\Coding\Waste-your-tokens`

## ADDED Requirements

### Requirement: Burn Tokens Button
The system SHALL provide a massive, centered "Burn Tokens" button as the primary UI element. When pressed, it SHALL trigger an LLM API call and display satisfying visual feedback (fire animation, number tick-up).

#### Scenario: User clicks Burn Tokens
- **WHEN** user clicks the "Burn Tokens" button
- **THEN** the system sends a request to the configured LLM API with a deliberately wasteful prompt
- **AND** displays a fire/burn animation on the button
- **AND** the token counter ticks up in real-time

#### Scenario: No API key configured
- **WHEN** user clicks "Burn Tokens" without an API key
- **THEN** the system shows a prompt to open settings and configure the API key

### Requirement: Live Metrics Dashboard
The system SHALL display real-time metrics that update after each API call.

#### Scenario: Metrics display
- **WHEN** the app is running
- **THEN** the dashboard displays: Total Tokens Wasted, Total API Calls, Estimated Cost ($)
- **AND** each metric animates (ticks up) when new data arrives

### Requirement: Environmental Guilt Tracker
The system SHALL calculate and display estimated environmental impact in an engaging format.

#### Scenario: Guilt metrics display
- **WHEN** tokens have been wasted
- **THEN** the system displays: Carbon Footprint (grams CO₂), Equivalent Miles Driven, Trees Needed to Offset
- **AND** uses approximate conversion factors (e.g., ~0.0002g CO₂ per token for GPT-4 class models)

### Requirement: Settings Sidebar
The system SHALL provide a slide-out sidebar for configuration, keeping the main screen clutter-free.

#### Scenario: Open settings
- **WHEN** user clicks the settings gear icon
- **THEN** a sidebar slides in from the right with: API Key input (password field), Model selector dropdown, Base URL input (for custom endpoints)

#### Scenario: Save settings
- **WHEN** user enters and saves settings
- **THEN** the API key and model selection are stored in localStorage
- **AND** the sidebar closes with a smooth animation

### Requirement: LLM API Proxy Route
The system SHALL provide a Next.js API route that proxies requests to the configured LLM API.

#### Scenario: Proxy request
- **WHEN** the frontend sends a burn request
- **THEN** the API route forwards the request to the configured LLM endpoint using the stored API key
- **AND** returns the token usage data (prompt_tokens, completion_tokens, total_tokens) to the frontend

#### Scenario: API error
- **WHEN** the LLM API returns an error
- **THEN** the frontend displays an error toast/notification
- **AND** the button returns to its idle state

### Requirement: Satisfying Animations
The system SHALL provide visually satisfying feedback animations.

#### Scenario: Button press animation
- **WHEN** the "Burn Tokens" button is pressed
- **THEN** a fire/ember particle effect emanates from the button
- **AND** the button pulses/glows during the API call
- **AND** the metrics numbers animate with a counting-up effect

### Requirement: Aesthetic Direction
The app SHALL follow a dark, fiery, industrial-brutalist aesthetic with:
- Dark background with subtle ember/heat haze effects
- Fiery accent colors (orange, amber, red gradient)
- Bold, impactful typography for the button and metrics
- Smooth CSS/Framer Motion animations throughout
- Responsive layout that works on desktop and mobile

## MODIFIED Requirements
N/A (greenfield)

## REMOVED Requirements
N/A (greenfield)
