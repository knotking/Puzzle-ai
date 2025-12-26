# 🧩 PuzzleMe: The Generative AI Puzzle Engine

**PuzzleMe** is a world-class interactive puzzle platform that merges generative art with logical deduction. Powered by the cutting-edge **Gemini 2.5 Flash Image** model, it transforms ethereal descriptions into high-fidelity visual challenges that users must reconstruct in a race against the clock.

---

## 🌟 Vision & Experience

PuzzleMe isn't just a game; it's a creative sandbox. The core experience centers around the "Synthesis-to-Solvability" loop:
1. **Synthesis**: The AI interprets a text prompt, creating a unique 1:1 square composition.
2. **Deconstruction**: The engine algorithmically slices and shuffles the image based on user-selected complexity.
3. **Reconstruction**: The user restores order, utilizing spatial reasoning and visual memory.

---

## ✨ Core Features

### 🤖 Generative AI Core
- **Text-to-Puzzle**: Leverage `gemini-2.5-flash-image` to generate detailed, vibrant images from any prompt.
- **Dynamic Style Morphing**: Mid-game, users can trigger "Visual Shifts." The engine sends the current puzzle state back to Gemini with a style modifier (e.g., Cyberpunk, Oil Painting), restyling the tiles in real-time while maintaining the current scramble state.
- **Zero-Latency Logic**: All puzzle state management is handled locally, ensuring that the AI only handles the heavy lifting of visual creativity.

### 🎮 High-End Gameplay Mechanics
- **Complexity Scaling**: 
  - **Easy (3x3)**: 9 pieces, perfect for quick mental warm-ups.
  - **Normal (4x4)**: 16 pieces, the gold standard for puzzle enthusiasts.
  - **Hard (5x5)**: 25 pieces, a true test of visual pattern matching.
- **Tactile Feedback**:
  - **Spring-Loaded Transitions**: Tiles move using `cubic-bezier` timing functions for a "snappy" physical feel.
  - **The Move Pulse**: The move counter features a custom `animate-counter-pop` keyframe animation that triggers on every swap, providing rhythmic visual confirmation.
  - **Swap Highlights**: Recently swapped tiles flash with a cyan glow to help users track their last action.

### 🏛️ The Puzzle Vault
- **Persistence**: High scores, prompts, and custom images are stored via `localStorage`.
- **The Replay Engine**: Any puzzle from your history can be re-scrambled and replayed. Try to beat your previous Move Count and Time records on the same image.
- **Masterpiece Gallery**: Your vault displays stats like Best Time and total Moves for every vision you've conquered.

### 🎨 Aesthetic & UI
- **Dark Mode Excellence**: A deep `slate-900` palette with `indigo` and `cyan` accents for reduced eye strain and a premium feel.
- **Glassmorphism**: Backdrop blurs and semi-transparent layers create depth within the sidebar and vault cards.
- **Responsive Layout**: Seamless transition from desktop wide-screen views to vertical mobile stacks.

---

## 🛠️ Technical Architecture

### Tech Stack
- **Framework**: [React 19](https://react.dev/) (utilizing latest Hooks and Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first responsive design.
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) SDK.
- **Audio Engine**: Custom synthesized oscillators via the **Web Audio API** (no heavy MP3 assets required).

### AI Service Implementation
The `GeminiService` class encapsulates all model interactions:
- **`generatePuzzleImage`**: Handles the initial creation.
- **`editPuzzleImage`**: Uses image-to-image prompting to apply styles mid-game. It handles base64 string cleaning and MIME-type management for seamless model consumption.

### Audio Synthesis
Instead of loading external files, PuzzleMe generates its own sound effects:
- **Click**: A high-frequency sine wave with exponential decay.
- **Swap**: A triangle wave sweep representing movement.
- **Win**: A four-note C-Major arpeggio triggered in sequence using `AudioContext` scheduling.

---

## 🚦 Getting Started

1. **Environment**: Ensure `process.env.API_KEY` is configured with a valid Google Gemini API Key.
2. **Browser Support**: Requires a modern browser with support for `importmap` and `AudioContext`.
3. **Usage**:
   - Describe a scene (e.g., "A neon-lit futuristic library with floating books").
   - Select your "Complexity" (Emerald, Indigo, or Rose themes).
   - Click **Assemble Puzzle**.
   - Swap tiles by clicking them sequentially.

---

## 📝 Performance Optimizations

- **Key-Triggered Animations**: The move counter uses a `key` prop tied to the move count to force React to re-mount the element, re-triggering the CSS animation perfectly every time.
- **Memoized Shuffling**: The Fisher-Yates shuffle algorithm ensures every puzzle is solvable and uniquely scrambled.
- **Resource Management**: Gemini instances are managed as singleton services to prevent redundant API client initializations.

---
*Developed by Senior Frontend Engineering standards with a focus on UI/UX and AI integration.*