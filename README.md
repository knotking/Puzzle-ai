# 🧩 PuzzleMe AI

PuzzleMe AI is a high-end, interactive puzzle experience where your imagination sets the stage. Using Google's Gemini API, the app transforms text prompts into detailed visual puzzles. Reassemble the scrambled pieces against the clock and build your own "Puzzle Vault" of solved masterpieces.

## ✨ Features

- **AI Puzzle Generation**: Powered by `gemini-2.5-flash-image`, generating 1:1 square puzzles from any creative description.
- **AI Image Editing**: Not happy with the result? Use the "AI Edit" tools to transform your current puzzle image with style presets (Noir, Cyberpunk, Oil Painting) or custom text instructions.
- **Custom Image Support**: Upload your own local images to create personalized challenges.
- **Adaptive Difficulty**: Choose between 3x3 (Easy), 4x4 (Normal), and 5x5 (Hard) grid layouts.
- **Tactile UI/UX**:
  - Smooth, spring-based animations for tile swapping.
  - Visual feedback flashes on successful moves.
  - Synthesized sound effects (Web Audio API) for clicks, swaps, and victory.
- **Puzzle Vault**: Automatically saves your solved puzzles to local storage so you can replay your favorites or track your best times.
- **Real-time Performance**: Tracks moves and time with a sleek, dark-mode aesthetic.

## 🚀 Technology Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI Engine**: Google GenAI SDK (`@google/genai`)
- **Model**: `gemini-2.5-flash-image`
- **Audio**: Web Audio API (custom `AudioService` for synthesized oscillators)
- **Persistence**: Browser `localStorage`

## 🎮 How to Play

1.  **Create**: Enter a prompt (e.g., *"A steampunk owl made of clockwork gears"*) or upload your own image.
2.  **Generate**: Click **Create AI Puzzle**. Gemini will dream up a unique square image.
3.  **Solve**: The image is sliced and scrambled. Click two tiles to swap their positions.
4.  **Reference**: Use the **Hint** card in the sidebar to see the target image.
5.  **Refine**: While playing, use the **Edit with AI** panel to change the image's style on the fly.
6.  **Win**: Align all pieces to their correct positions to stop the timer and save the puzzle to your **Vault**.

## 🛠️ Setup & Requirements

- An **API Key** for the Google Gemini API is required. The app expects this to be available via `process.env.API_KEY`.
- The app utilizes modern browser features like `importmap` and `AudioContext`, requiring a recent version of Chrome, Firefox, or Safari.

---
*Created with ❤️ for puzzle lovers and AI enthusiasts.*