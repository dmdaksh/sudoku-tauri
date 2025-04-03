# Sudoku Tauri

A cross-platform Sudoku game built with Tauri, TypeScript, and Rust. Play the classic number puzzle game on desktop with a clean, modern interface.

![Sudoku Tauri Screenshot](src-tauri/icons/icon.png)

## Features

- Three difficulty levels: Easy, Medium, and Hard
- Timer to track your solving speed
- Hint feature for when you get stuck
- Validation to check your solution
- Keyboard navigation support
- Mobile-friendly UI with number pad
- Real-time error detection
- Responsive design for all screen sizes

## Demo

Check out the demo video of the application below:

[![Sudoku Tauri Demo](https://img.youtube.com/vi/VsY1-bjNgH4/0.jpg)](https://youtu.be/VsY1-bjNgH4)

## About Tauri

[Tauri](https://tauri.app/) is a framework for building lightweight, secure desktop applications with web technologies. Tauri apps combine a Rust backend with a web-based frontend, resulting in smaller, faster, and more secure applications compared to traditional Electron apps.

Key benefits of Tauri:
- **Small bundle size**: Tauri apps are significantly smaller than Electron apps
- **Security-focused**: Rust backend provides memory safety and security
- **Cross-platform**: Build for Windows, macOS, and Linux from a single codebase
- **Native performance**: Rust backend allows for better performance than JavaScript-only solutions

## Technical Implementation

The application consists of:

### Frontend (TypeScript/HTML/CSS)
- User interface with interactive Sudoku board
- Game logic for selecting cells and inputting numbers
- Real-time validation feedback
- Responsive design for all screen sizes

### Backend (Rust)
- Puzzle generation algorithm that ensures unique solutions
- Solver implementation using backtracking
- Validation logic for checking solutions
- Hint system to help players when stuck

## Getting Started

### Prerequisites

- Node.js (v18+)
- Rust (1.70.0+)
- pnpm (or npm/yarn)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/sudoku-tauri.git
cd sudoku-tauri
```

2. Install dependencies
```bash
pnpm install
```

3. Run the development server
```bash
pnpm tauri dev
```

### Building for Production

To create a production build:
```bash
pnpm tauri build
```

This will create optimized binaries for your current platform in the `src-tauri/target/release` directory.

## How to Play

1. Start a new game by selecting your desired difficulty (Easy, Medium, Hard)
2. Click on a cell to select it
3. Enter a number from 1-9 (using keyboard or number pad)
4. Use arrow keys for navigation
5. If you need help, click the "Hint" button
6. Validate your solution when complete
7. Challenge yourself to improve your solving time!

## Project Structure

- `src/` - Frontend TypeScript code
- `src-tauri/` - Rust backend code
  - `src/lib.rs` - Core game logic and algorithms
  - `src/main.rs` - Tauri application entry point
- `index.html` - Main HTML entry point

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) for the application framework
- [Vite](https://vitejs.dev/) for frontend tooling
- [TypeScript](https://www.typescriptlang.org/) for type-safe JavaScript
- [Rust](https://www.rust-lang.org/) for the backend implementation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
