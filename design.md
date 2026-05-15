# Practice Selector — Mobile App Design

## Design Philosophy

This app follows **Apple Human Interface Guidelines** for a native iOS feel. The design is **minimal, calm, and focused** — no distractions, no animations, just clear choices and immediate results.

**Target orientation:** Portrait (9:16), one-handed usage.

## Screen List

1. **Survey Screen** — User selects current state (energy, tension, focus, time)
2. **Recommendation Screen** — Shows selected practice with action buttons

## Screen 1: Survey Screen

### Primary Content
- **Title:** "Как вы себя чувствуете?" (centered, large text)
- **4 question blocks**, each with:
  - Question label (e.g., "Энергия")
  - Selection buttons (horizontal or vertical depending on option count)

### Questions & Options
1. **Энергия** (Energy)
   - low, normal, high
2. **Напряжение** (Tension)
   - calm, tense
3. **Фокус** (Focus)
   - scattered, stuck, normal
4. **Доступное время** (Available Time)
   - 5 минут, 10 минут, 20 минут

### Functionality
- User taps option buttons to select values
- Selected state is visually distinct (filled background, different text color)
- "Продолжить" button at bottom is **disabled** until all 4 questions are answered
- When all answered, button becomes active and user can proceed

### Layout
- Vertical scroll (in case of small screens)
- Each question block has clear visual separation
- Button options are large enough for easy tapping
- Bottom button is fixed/sticky for easy access

## Screen 2: Recommendation Screen

### Primary Content
- **Practice title** (large, centered, e.g., "Медитация 5–10 минут")
- **Category** (small, muted text below title, e.g., "восстановление")

### Functionality
- **"Начать" button** — Primary action (no additional logic, just visual feedback)
- **"Другое" button** — Secondary action, re-runs selection with same state, shows different practice

### Layout
- Centered content
- Large practice title dominates the screen
- Two buttons stacked vertically at bottom
- Minimal visual noise

## Key User Flows

### Flow 1: Complete Survey → Get Recommendation
1. User opens app → Survey Screen
2. User selects all 4 options
3. "Продолжить" button activates
4. User taps "Продолжить"
5. App runs scoring logic
6. Recommendation Screen shows selected practice

### Flow 2: Get Another Practice
1. User is on Recommendation Screen
2. User taps "Другое"
3. App re-runs scoring with same state
4. New practice appears (random from top-3)

### Flow 3: Start Practice
1. User is on Recommendation Screen
2. User taps "Начать"
3. Visual feedback (button press state)
4. No further action (user proceeds with practice offline)

## Color Choices

**Brand:** Calm, focused, minimal.

- **Primary color:** Soft blue (#4A90E2) — trust, calm, focus
- **Background:** White (#FFFFFF) for light mode, dark gray (#1A1A1A) for dark mode
- **Surface:** Light gray (#F5F5F5) for light mode, darker gray (#2A2A2A) for dark mode
- **Text:** Dark gray (#333333) for light mode, light gray (#E0E0E0) for dark mode
- **Muted text:** Medium gray (#888888)
- **Border:** Light gray (#E0E0E0) for light mode, medium gray (#444444) for dark mode

## Typography

- **Title:** Large, bold (32-36pt)
- **Question labels:** Medium, semibold (18-20pt)
- **Option buttons:** Regular (16-18pt)
- **Category text:** Small, muted (14pt)

## Interaction Design

- **Button press feedback:** Opacity change (0.7) — no animations
- **Disabled state:** Reduced opacity (0.4), no interaction
- **Active selection:** Filled background with primary color, white text

## No Backend, No Auth

- All data stored locally in app memory
- No user accounts
- No cloud sync
- practices.json bundled with app
- Scoring logic runs entirely on device
