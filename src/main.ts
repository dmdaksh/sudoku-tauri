// Import the invoke function from Tauri API and styles
import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

// Types
type SudokuGrid = number[][];
type Difficulty = "easy" | "medium" | "hard";

// Extend Window interface to include resizeTimer property
declare global {
  interface Window {
    resizeTimer: number | null;
  }
}

// DOM Elements
let board: HTMLElement;
let statusMessage: HTMLElement;
let timerElement: HTMLElement;
let difficultyIndicator: HTMLElement;
let numberPad: HTMLElement;
let dialogOverlay: HTMLElement | null = null;

// Game state
let currentPuzzle: SudokuGrid = [];
let selectedCell: HTMLElement | null = null;
let timerInterval: number | null = null;
let startTime: number = 0;
let gameActive: boolean = false;

// Constants
const EMPTY_CELL = 0;

// Check if we're on mobile
function isMobileDevice(): boolean {
  return window.innerWidth < 768 || window.matchMedia("(max-width: 768px)").matches;
}

// Adjust UI based on device size
function adjustUIForDevice(): void {
  const isMobile = isMobileDevice();
  document.documentElement.classList.toggle('mobile', isMobile);
  
  const gameCanvas = document.getElementById("game-canvas");
  const sudokuContainer = document.getElementById("sudoku-container");
  
  if (gameCanvas) {
    gameCanvas.style.width = "100%";
    gameCanvas.style.maxWidth = "800px";
    gameCanvas.style.margin = "0 auto";
  }

  if (sudokuContainer) {
    sudokuContainer.style.width = "100%";
    sudokuContainer.style.maxWidth = isMobile ? "95%" : "800px";
    sudokuContainer.style.margin = "0 auto";
  }
  
  // Resize number pad for small screens
  if (numberPad) {
    const buttonSize = isMobile ? "40px" : "50px";
    const fontSize = isMobile ? "0.9rem" : "1.1rem";
    
    document.querySelectorAll(".number-button").forEach((button) => {
      (button as HTMLElement).style.height = buttonSize;
      (button as HTMLElement).style.fontSize = fontSize;
    });
  }
  
  // Ensure board is correctly sized relative to window
  resizeSudokuBoard();
}

// Function to resize the sudoku board based on available space
function resizeSudokuBoard(): void {
  if (!board) return;
  
  // Get the container dimensions to determine proper scaling
  const containerWidth = board.parentElement?.clientWidth || window.innerWidth;
  const containerHeight = window.innerHeight;
  
  // Get the document's body
  const body = document.body;
  const html = document.documentElement;
  
  // Prevent scrollbars by ensuring content fits within viewport
  // Calculate available height
  const availableHeight = Math.min(containerHeight, window.innerHeight);
  const availableWidth = containerWidth;
  
  // Determine cell size based on the most restrictive dimension (width or height)
  const minDimension = Math.min(availableWidth, availableHeight);
  
  // Adjust cell size based on available space
  if (minDimension < 500) {
    document.documentElement.style.setProperty('--cell-size', '30px');
  } else if (minDimension < 600) {
    document.documentElement.style.setProperty('--cell-size', '35px');
  } else if (minDimension < 800) {
    document.documentElement.style.setProperty('--cell-size', '40px');
  } else {
    // Reset to default from CSS
    document.documentElement.style.removeProperty('--cell-size');
  }
  
  // Ensure no scrollbars appear by setting overflow properties
  body.style.overflow = 'hidden';
  html.style.overflow = 'hidden';
  
  // Additional layout adjustments for both horizontal and vertical constraints
  const container = document.querySelector('.container');
  if (container) {
    if (minDimension < 700) {
      container.classList.add('compact-layout');
    } else {
      container.classList.remove('compact-layout');
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // Initialize DOM elements
  board = document.getElementById("sudoku-board") as HTMLElement;
  statusMessage = document.getElementById("status-message") as HTMLElement;
  timerElement = document.getElementById("timer") as HTMLElement;
  difficultyIndicator = document.getElementById("difficulty-indicator") as HTMLElement;
  numberPad = document.getElementById("number-pad") as HTMLElement;

  // Add clickable class to difficulty indicator
  difficultyIndicator.classList.add("clickable");

  // Initialize game controls
  difficultyIndicator.addEventListener("click", showDifficultyDialog);
  document.getElementById("validate")?.addEventListener("click", validateGame);
  document.getElementById("hint")?.addEventListener("click", provideHint);
  document.getElementById("clear")?.addEventListener("click", clearBoard);

  // Create the board and number pad
  createBoard();
  createNumberPad();

  // Adjust UI for device size
  adjustUIForDevice();

  // Initialize resizeTimer
  window.resizeTimer = null;

  // Handle window resize
  window.addEventListener("resize", () => {
    adjustUIForDevice();
    // Add debouncing to avoid excessive recalculations
    if (window.resizeTimer !== null) {
      clearTimeout(window.resizeTimer);
    }
    window.resizeTimer = setTimeout(() => {
      resizeSudokuBoard();
    }, 250);
  });

  // Start a new game with default difficulty
  startNewGame("easy");
});

/**
 * Creates the number pad for mobile/touch interaction.
 */
function createNumberPad(): void {
  numberPad.innerHTML = "";
  
  // First row: numbers 1-5
  for (let i = 1; i <= 5; i++) {
    const button = document.createElement("div");
    button.classList.add("number-button");
    button.textContent = i.toString();
    button.dataset.number = i.toString();
    button.addEventListener("click", () => {
      if (selectedCell && !selectedCell.classList.contains("preset")) {
        selectedCell.textContent = i.toString();
        highlightRelatedCells(selectedCell);
        validateCellInput(parseInt(selectedCell.dataset.row || "0"), parseInt(selectedCell.dataset.col || "0"), i);
      }
    });
    numberPad.appendChild(button);
  }
  
  // Second row: numbers 6-9 and erase
  for (let i = 6; i <= 9; i++) {
    const button = document.createElement("div");
    button.classList.add("number-button");
    button.textContent = i.toString();
    button.dataset.number = i.toString();
    button.addEventListener("click", () => {
      if (selectedCell && !selectedCell.classList.contains("preset")) {
        selectedCell.textContent = i.toString();
        highlightRelatedCells(selectedCell);
        validateCellInput(parseInt(selectedCell.dataset.row || "0"), parseInt(selectedCell.dataset.col || "0"), i);
      }
    });
    numberPad.appendChild(button);
  }
  
  // Add erase button at the end of second row
  const eraseButton = document.createElement("div");
  eraseButton.classList.add("number-button");
  eraseButton.textContent = "Erase";
  eraseButton.addEventListener("click", () => {
    if (selectedCell && !selectedCell.classList.contains("preset")) {
      selectedCell.textContent = "";
      clearHighlights();
      if (selectedCell) highlightRelatedCells(selectedCell);
    }
  });
  numberPad.appendChild(eraseButton);
}

/**
 * Displays the difficulty selection dialog.
 */
function showDifficultyDialog(): void {
  resetTimer();
  if (dialogOverlay && document.body.contains(dialogOverlay)) {
    document.body.removeChild(dialogOverlay);
    dialogOverlay = null;
  }
  dialogOverlay = document.createElement("div");
  dialogOverlay.classList.add("dialog-overlay");
  const dialog = document.createElement("div");
  dialog.classList.add("difficulty-dialog");
  
  const title = document.createElement("h2");
  title.classList.add("dialog-title");
  title.textContent = "Choose Difficulty Level";
  dialog.appendChild(title);
  
  const options = document.createElement("div");
  options.classList.add("difficulty-options");
  
  const difficulties: { value: Difficulty; label: string; description: string }[] = [
    { value: "easy", label: "Easy", description: "51 cells filled (for beginners)" },
    { value: "medium", label: "Medium", description: "36 cells filled (standard)" },
    { value: "hard", label: "Hard", description: "26 cells filled (challenging)" },
  ];
  
  difficulties.forEach(diff => {
    const option = document.createElement("div");
    option.classList.add("difficulty-option");
    
    const optionLabel = document.createElement("div");
    optionLabel.textContent = diff.label;
    optionLabel.style.fontWeight = "bold";
    
    const optionDescription = document.createElement("div");
    optionDescription.classList.add("difficulty-description");
    optionDescription.textContent = diff.description;
    
    option.appendChild(optionLabel);
    option.appendChild(optionDescription);
    
    option.addEventListener("click", () => {
      if (dialogOverlay && document.body.contains(dialogOverlay)) {
        document.body.removeChild(dialogOverlay);
        dialogOverlay = null;
      }
      startNewGame(diff.value);
    });
    
    options.appendChild(option);
  });

  // Add cancel button
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.style.marginTop = "1rem";
  cancelButton.addEventListener("click", () => {
    if (dialogOverlay && document.body.contains(dialogOverlay)) {
      document.body.removeChild(dialogOverlay);
      dialogOverlay = null;
    }
  });
  
  dialog.appendChild(options);
  dialog.appendChild(cancelButton);
  dialogOverlay.appendChild(dialog);
  
  // Close dialog when clicking outside
  dialogOverlay.addEventListener("click", (e) => {
    if (e.target === dialogOverlay && dialogOverlay && document.body.contains(dialogOverlay)) {
      document.body.removeChild(dialogOverlay);
      dialogOverlay = null;
    }
  });
  
  document.body.appendChild(dialogOverlay);
}

/**
 * Creates the 9x9 board structure.
 */
function createBoard(): void {
  board.innerHTML = "";
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row.toString();
      cell.dataset.col = col.toString();
      cell.tabIndex = 0; // Make focusable
      cell.style.setProperty("--n", (row * 9 + col).toString());
      cell.addEventListener("click", () => {
        clearSelection();
        selectedCell = cell;
        cell.classList.add("highlighted");
        highlightRelatedCells(cell);
        if (!cell.classList.contains("preset")) {
          cell.setAttribute("contenteditable", "true");
          cell.focus();
        }
      });
      cell.addEventListener("keydown", (e) => handleCellKeyDown(e, cell, row, col));
      cell.addEventListener("paste", (e) => e.preventDefault());
      board.appendChild(cell);
    }
  }
}

/**
 * Handles keyboard events for cell editing.
 */
function handleCellKeyDown(e: KeyboardEvent, cell: HTMLElement, row: number, col: number): void {
  if (cell.classList.contains("preset")) return;
  if (e.key >= "1" && e.key <= "9") {
    cell.textContent = e.key;
    e.preventDefault();
    validateCellInput(row, col, parseInt(e.key));
    highlightRelatedCells(cell);
    const nextCell = findNextEditableCell(row, col);
    if (nextCell) {
      clearSelection();
      selectedCell = nextCell;
      nextCell.classList.add("highlighted");
      highlightRelatedCells(nextCell);
      nextCell.focus();
    }
  } else if (e.key === "Backspace" || e.key === "Delete") {
    cell.textContent = "";
    e.preventDefault();
    clearHighlights();
    cell.classList.add("highlighted");
    highlightRelatedCells(cell);
  } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    handleArrowNavigation(e, row, col);
    e.preventDefault();
  } else {
    e.preventDefault();
  }
}

/**
 * Validates input in a cell.
 */
function validateCellInput(row: number, col: number, value: number): void {
  if (!gameActive) return;
  const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
  if (!cell || cell.classList.contains("preset")) return;
  cell.classList.remove("error", "success", "validation-animation");
  const isValid = isValidMove(row, col, value);
  if (isValid) {
    cell.classList.add("success", "validation-animation");
    
    // Check if board is complete after this move
    const currentState = getBoardState();
    if (isGridComplete(currentState)) {
      validateGame();
    }
  } else {
    cell.classList.add("error", "validation-animation");
  }
  setTimeout(() => cell.classList.remove("validation-animation"), 500);
}

/**
 * Checks if placing a value at [row, col] is valid.
 */
function isValidMove(row: number, col: number, value: number): boolean {
  // Check row
  for (let i = 0; i < 9; i++) {
    if (i !== col) {
      const cellInRow = document.querySelector(`[data-row="${row}"][data-col="${i}"]`);
      if (cellInRow && cellInRow.textContent === value.toString()) return false;
    }
  }
  // Check column
  for (let i = 0; i < 9; i++) {
    if (i !== row) {
      const cellInCol = document.querySelector(`[data-row="${i}"][data-col="${col}"]`);
      if (cellInCol && cellInCol.textContent === value.toString()) return false;
    }
  }
  // Check 3x3 box
  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;
  for (let i = boxStartRow; i < boxStartRow + 3; i++) {
    for (let j = boxStartCol; j < boxStartCol + 3; j++) {
      if (i !== row || j !== col) {
        const cellInBox = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
        if (cellInBox && cellInBox.textContent === value.toString()) return false;
      }
    }
  }
  return true;
}

/**
 * Clears all cell selections and related highlighting.
 */
function clearSelection(): void {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("highlighted", "same-value", "related");
  });
  selectedCell = null;
}
function clearHighlights(): void {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("highlighted", "same-value", "related");
  });
}

/**
 * Highlights related cells (row, column, box) and those sharing the same value.
 */
function highlightRelatedCells(cell: HTMLElement): void {
  if (!cell) return;
  const row = parseInt(cell.dataset.row || "0");
  const col = parseInt(cell.dataset.col || "0");
  const value = cell.textContent;
  // Row
  for (let i = 0; i < 9; i++) {
    const cellInRow = document.querySelector(`[data-row="${row}"][data-col="${i}"]`) as HTMLElement;
    if (cellInRow && cellInRow !== cell) {
      cellInRow.classList.add("related");
      if (value && cellInRow.textContent === value) cellInRow.classList.add("same-value");
    }
  }
  // Column
  for (let i = 0; i < 9; i++) {
    const cellInCol = document.querySelector(`[data-row="${i}"][data-col="${col}"]`) as HTMLElement;
    if (cellInCol && cellInCol !== cell) {
      cellInCol.classList.add("related");
      if (value && cellInCol.textContent === value) cellInCol.classList.add("same-value");
    }
  }
  // Box
  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;
  for (let i = boxStartRow; i < boxStartRow + 3; i++) {
    for (let j = boxStartCol; j < boxStartCol + 3; j++) {
      const cellInBox = document.querySelector(`[data-row="${i}"][data-col="${j}"]`) as HTMLElement;
      if (cellInBox && cellInBox !== cell) {
        cellInBox.classList.add("related");
        if (value && cellInBox.textContent === value) cellInBox.classList.add("same-value");
      }
    }
  }
}

/**
 * Finds the next editable cell, skipping preset ones.
 */
function findNextEditableCell(row: number, col: number): HTMLElement | null {
  let nextRow = row;
  let nextCol = col + 1;
  if (nextCol > 8) {
    nextCol = 0;
    nextRow++;
    if (nextRow > 8) return null;
  }
  const nextCell = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`) as HTMLElement;
  if (nextCell && nextCell.classList.contains("preset")) {
    // Skip preset cells; try next one
    return findNextEditableCell(nextRow, nextCol);
  }
  return nextCell;
}

/**
 * Handles arrow key navigation.
 */
function handleArrowNavigation(e: KeyboardEvent, row: number, col: number): void {
  let nextRow = row;
  let nextCol = col;
  switch (e.key) {
    case "ArrowUp":
      nextRow = Math.max(0, row - 1);
      break;
    case "ArrowDown":
      nextRow = Math.min(8, row + 1);
      break;
    case "ArrowLeft":
      nextCol = Math.max(0, col - 1);
      break;
    case "ArrowRight":
      nextCol = Math.min(8, col + 1);
      break;
  }
  const nextCell = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`) as HTMLElement;
  if (nextCell) {
    clearSelection();
    selectedCell = nextCell;
    nextCell.classList.add("highlighted");
    highlightRelatedCells(nextCell);
    nextCell.focus();
  }
}

/**
 * Starts a new game with a given difficulty.
 */
async function startNewGame(difficulty: Difficulty): Promise<void> {
  try {
    statusMessage.textContent = "";
    difficultyIndicator.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    resetTimer();
    startTimer();
    gameActive = true;

    // Reset the board UI
    document.querySelectorAll(".cell").forEach(cell => {
      cell.classList.remove("error", "success", "highlighted", "same-value", "related", "validation-animation");
    });

    const puzzle = await invoke<SudokuGrid>("generate_puzzle", { difficulty });
    currentPuzzle = puzzle;
    fillBoard(currentPuzzle);
    clearSelection();
  } catch (error) {
    console.error("Failed to start new game:", error);
    statusMessage.textContent = "Failed to generate puzzle. Please try again.";
    statusMessage.className = "status-error";
  }
}

/**
 * Fills the board with the puzzle; preset numbers become non-editable.
 */
function fillBoard(puzzle: SudokuGrid): void {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.textContent = "";
    cell.classList.remove("preset", "error", "success", "highlighted", "same-value", "related");
    (cell as HTMLElement).setAttribute("contenteditable", "true");
    const row = parseInt((cell as HTMLElement).dataset.row || "0");
    const col = parseInt((cell as HTMLElement).dataset.col || "0");
    if (puzzle[row][col] !== EMPTY_CELL) {
      cell.textContent = puzzle[row][col].toString();
      cell.classList.add("preset");
      (cell as HTMLElement).removeAttribute("contenteditable");
    }
  });
}

/**
 * Validates the current board state.
 */
async function validateGame(): Promise<void> {
  const currentState = getBoardState();
  if (!isGridComplete(currentState)) {
    statusMessage.textContent = "Puzzle is not complete yet.";
    statusMessage.className = "status-info";
    return;
  }
  try {
    const isValid = await invoke<boolean>("validate_solution", { grid: currentState });
    if (isValid) {
      stopTimer();
      const time = formatTime(Math.floor((Date.now() - startTime) / 1000));
      statusMessage.textContent = `Congratulations! Solved in ${time}.`;
      statusMessage.className = "status-success";
      document.querySelectorAll(".cell").forEach(cell => {
        cell.classList.add("success", "validation-animation");
        setTimeout(() => cell.classList.remove("validation-animation"), 1000);
      });
    } else {
      statusMessage.textContent = "There are mistakes in your solution.";
      statusMessage.className = "status-error";
      highlightErrors(currentState);
    }
  } catch (error) {
    console.error("Validation error:", error);
    statusMessage.textContent = "Error validating puzzle.";
    statusMessage.className = "status-error";
  }
}

/**
 * Highlights error cells.
 */
function highlightErrors(grid: SudokuGrid): void {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = grid[row][col];
      if (value !== EMPTY_CELL) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
        if (cell.classList.contains("preset")) continue;
        cell.classList.remove("error", "success");
        if (!isValidMove(row, col, value)) {
          cell.classList.add("error", "validation-animation");
          setTimeout(() => cell.classList.remove("validation-animation"), 500);
        }
      }
    }
  }
}

/**
 * Retrieves the current board state.
 */
function getBoardState(): SudokuGrid {
  const grid: SudokuGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
  document.querySelectorAll(".cell").forEach((cell) => {
    const row = parseInt((cell as HTMLElement).dataset.row!);
    const col = parseInt((cell as HTMLElement).dataset.col!);
    const value = (cell as HTMLElement).textContent?.trim() || "";
    grid[row][col] = value ? parseInt(value) : 0;
  });
  return grid;
}

/**
 * Checks if the grid is completely filled.
 */
function isGridComplete(grid: SudokuGrid): boolean {
  return !grid.some(row => row.some(cell => cell === EMPTY_CELL));
}

/**
 * Clears non-preset cells on the board.
 */
function clearBoard(): void {
  if (!gameActive) return;
  document.querySelectorAll(".cell:not(.preset)").forEach(cell => {
    cell.textContent = "";
    cell.classList.remove("error", "success", "highlighted", "same-value", "related");
  });
  statusMessage.textContent = "Board cleared. Good luck!";
  statusMessage.className = "status-info";
  resetTimer();
  startTimer();
}

/**
 * Provides a hint by revealing the correct value for the currently selected cell.
 * If the cell contains a wrong answer, it will be overridden with the correct answer.
 */
async function provideHint(): Promise<void> {
  if (!gameActive) return;
  
  // Check if a cell is selected
  if (!selectedCell) {
    statusMessage.textContent = "Please select a cell to get a hint.";
    statusMessage.className = "status-info";
    return;
  }
  
  const selectedRow = parseInt(selectedCell.dataset.row || "0");
  const selectedCol = parseInt(selectedCell.dataset.col || "0");
  
  // If selected cell is preset, can't provide a hint for it
  if (selectedCell.classList.contains("preset")) {
    statusMessage.textContent = "This is a preset number. Try another cell.";
    statusMessage.className = "status-info";
    return;
  }
  
  try {
    // Get the current state of the board
    const currentState = getBoardState();
    const currentValue = currentState[selectedRow][selectedCol];
    
    // Get a hint specifically for the selected cell
    const hint = await invoke<{ row: number; col: number; value: number }>(
      "get_hint_for_cell", 
      { 
        grid: currentState, 
        targetRow: selectedRow, 
        targetCol: selectedCol 
      }
    );
    
    // If the current value is correct, inform the user
    if (currentValue !== 0 && currentValue === hint.value) {
      statusMessage.textContent = "Good job! Your answer is correct.";
      statusMessage.className = "status-success";
      return;
    }
    
    // Override the cell with the correct answer (whether it was empty or wrong)
    selectedCell.textContent = hint.value.toString();
    selectedCell.classList.add("success", "validation-animation");
    setTimeout(() => {
      if (selectedCell) {
        selectedCell.classList.remove("validation-animation");
      }
    }, 1000);
    
    // Display appropriate message based on whether cell was empty or had wrong answer
    if (currentValue === 0) {
      statusMessage.textContent = `Hint provided: ${hint.value} is the correct number.`;
    } else {
      statusMessage.textContent = `The correct number is ${hint.value}, not ${currentValue}.`;
    }
    statusMessage.className = "status-info";
    
    // Highlight related cells based on the new value
    highlightRelatedCells(selectedCell);
    
    // Check if board is complete after this hint
    const updatedState = getBoardState();
    if (isGridComplete(updatedState)) {
      validateGame();
    }
  } catch (error) {
    console.error("Hint error:", error);
    statusMessage.textContent = "Sorry, couldn't provide a hint right now.";
    statusMessage.className = "status-error";
  }
}

/**
 * Starts the game timer.
 */
function startTimer(): void {
  if (timerInterval !== null) clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerElement.textContent = formatTime(elapsed);
  }, 1000) as unknown as number;
}

/**
 * Stops the game timer.
 */
function stopTimer(): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Resets the timer display.
 */
function resetTimer(): void {
  stopTimer();
  timerElement.textContent = "00:00";
}

/**
 * Formats seconds into mm:ss.
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}