// Types and functions for the Sudoku game
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

// Types for the Sudoku game
pub type SudokuGrid = Vec<Vec<i32>>;

// Difficulty levels for the game
#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

// Struct for hint response
#[derive(Serialize)]
pub struct HintResponse {
    pub row: usize,
    pub col: usize,
    pub value: i32,
}

// Generate a new Sudoku puzzle based on difficulty
pub fn generate_puzzle(difficulty: Difficulty) -> Result<SudokuGrid, String> {
    // Create a solved puzzle first
    let solved_grid = generate_solved_grid()?;
    
    // Remove numbers based on difficulty
    let cells_to_keep = match difficulty {
        Difficulty::Easy => 51,   // Keep 51 cells (30 removed)
        Difficulty::Medium => 36, // Keep 36 cells (45 removed)
        Difficulty::Hard => 26,   // Keep 26 cells (55 removed)
    };
    
    // Create a puzzle by removing numbers
    let puzzle = remove_numbers_from_grid(&solved_grid, cells_to_keep)?;
    
    Ok(puzzle)
}

// Validate if a solution is correct
pub fn validate_solution(grid: SudokuGrid) -> Result<bool, String> {
    // Check if the grid is completely filled
    if !is_grid_complete(&grid) {
        return Ok(false);
    }
    
    // Check if the solution is valid
    Ok(is_valid_solution(&grid))
}

// Provide a hint for the current game state
pub fn get_hint(grid: SudokuGrid) -> Result<HintResponse, String> {
    // Find an empty cell
    let mut empty_cells = Vec::new();
    
    for row in 0..9 {
        for col in 0..9 {
            if grid[row][col] == 0 {
                empty_cells.push((row, col));
            }
        }
    }
    
    // If no empty cells, return an error
    if empty_cells.is_empty() {
        return Err("No empty cells found".to_string());
    }
    
    // Choose a random empty cell
    let mut rng = rand::thread_rng();
    let (row, col) = *empty_cells.choose(&mut rng).unwrap();
    
    // Find the correct value for this cell
    let mut puzzle_copy = grid.clone();
    if !solve_sudoku(&mut puzzle_copy) {
        return Err("Couldn't solve the puzzle".to_string());
    }
    
    // Get the value from the solved puzzle
    let value = puzzle_copy[row][col];
    
    Ok(HintResponse {
        row,
        col,
        value,
    })
}

// Provide a hint for a specific cell in the grid
pub fn get_hint_for_cell(grid: SudokuGrid, target_row: usize, target_col: usize) -> Result<HintResponse, String> {
    // Make a copy of the grid and solve it
    let mut puzzle_copy = grid.clone();
    if !solve_sudoku(&mut puzzle_copy) {
        return Err("Couldn't solve the puzzle".to_string());
    }
    
    // Get the correct value from the solved puzzle
    let value = puzzle_copy[target_row][target_col];
    
    Ok(HintResponse {
        row: target_row,
        col: target_col,
        value,
    })
}

// Check if the grid is complete (no empty cells)
pub fn is_grid_complete(grid: &SudokuGrid) -> bool {
    grid.iter().all(|row| row.iter().all(|&cell| cell != 0))
}

// Generate a fully solved Sudoku grid
pub fn generate_solved_grid() -> Result<SudokuGrid, String> {
    // Start with an empty grid
    let mut grid = vec![vec![0; 9]; 9];
    
    // Try to solve it with random values to generate a full solution
    if !solve_random_sudoku(&mut grid) {
        return Err("Failed to generate a solved grid".to_string());
    }
    
    Ok(grid)
}

// Solve Sudoku with randomized values for variety
pub fn solve_random_sudoku(grid: &mut SudokuGrid) -> bool {
    // Find an empty cell
    let mut empty_cell = None;
    
    for r in 0..9 {
        for c in 0..9 {
            if grid[r][c] == 0 {
                empty_cell = Some((r, c));
                break;
            }
        }
        if empty_cell.is_some() {
            break;
        }
    }
    
    // If no empty cell, the puzzle is solved
    let (row, col) = match empty_cell {
        Some(cell) => cell,
        None => return true,
    };
    
    // Create a shuffled list of numbers 1-9
    let mut numbers: Vec<i32> = (1..=9).collect();
    let mut rng = rand::thread_rng();
    numbers.shuffle(&mut rng);
    
    // Try each number in the empty cell
    for &num in &numbers {
        if is_valid_placement(grid, row, col, num) {
            // Place the number if valid
            grid[row][col] = num;
            
            // Recursively solve the rest of the puzzle
            if solve_random_sudoku(grid) {
                return true;
            }
            
            // If we reach here, the placement led to an invalid solution, so backtrack
            grid[row][col] = 0;
        }
    }
    
    // No valid number found, backtrack
    false
}

// Remove numbers from a solved grid to create a puzzle
pub fn remove_numbers_from_grid(grid: &SudokuGrid, cells_to_keep: usize) -> Result<SudokuGrid, String> {
    let mut rng = rand::thread_rng();
    let mut result = grid.clone();
    let mut positions: Vec<(usize, usize)> = Vec::new();
    
    // Create a list of all positions
    for row in 0..9 {
        for col in 0..9 {
            positions.push((row, col));
        }
    }
    
    // Shuffle the positions
    positions.shuffle(&mut rng);
    
    // Calculate how many to remove
    let to_remove = 81 - cells_to_keep;
    
    // Remove numbers while ensuring puzzle has a unique solution
    let mut removed = 0;
    for (row, col) in positions {
        // Skip if we've removed enough
        if removed >= to_remove {
            break;
        }
        
        // Store original value
        let original_val = result[row][col];
        // Remove the number (set to 0)
        result[row][col] = 0;
        
        // Check if the puzzle still has a unique solution
        if !has_unique_solution(&result) {
            // If not, restore the value
            result[row][col] = original_val;
        } else {
            removed += 1;
        }
    }
    
    Ok(result)
}

// Check if a grid has a unique solution
pub fn has_unique_solution(grid: &SudokuGrid) -> bool {
    // Check if the puzzle is solvable
    let mut solution1 = grid.clone();
    if !solve_sudoku(&mut solution1) {
        return false;
    }
    
    // Count solutions (should be exactly 1)
    let mut count = 0;
    count_solutions(grid, &mut count, 2);
    
    count == 1
}

// Count up to max_count solutions of the grid
pub fn count_solutions(grid: &SudokuGrid, count: &mut i32, max_count: i32) -> bool {
    if *count >= max_count {
        return true; // Stop when we reach the max count
    }
    
    // Find an empty cell
    let mut empty_cell = None;
    for r in 0..9 {
        for c in 0..9 {
            if grid[r][c] == 0 {
                empty_cell = Some((r, c));
                break;
            }
        }
        if empty_cell.is_some() {
            break;
        }
    }
    
    // If no empty cell, we found a solution
    match empty_cell {
        None => {
            *count += 1;
            return false; // Continue searching for more solutions
        }
        Some((row, col)) => {
            let mut grid_copy = grid.clone();
            
            // Try each number 1-9
            for num in 1..=9 {
                if is_valid_placement(&grid_copy, row, col, num) {
                    grid_copy[row][col] = num;
                    
                    // Recursively count solutions
                    if count_solutions(&grid_copy, count, max_count) {
                        return true; // Stop if we've reached max_count
                    }
                    
                    grid_copy[row][col] = 0;
                }
            }
        }
    }
    
    false
}

// Solve a Sudoku puzzle using backtracking
pub fn solve_sudoku(grid: &mut SudokuGrid) -> bool {
    // Find an empty cell
    let mut empty_cell = None;
    
    for r in 0..9 {
        for c in 0..9 {
            if grid[r][c] == 0 {
                empty_cell = Some((r, c));
                break;
            }
        }
        if empty_cell.is_some() {
            break;
        }
    }
    
    // If no empty cell, the puzzle is solved
    let (row, col) = match empty_cell {
        Some(cell) => cell,
        None => return true,
    };
    
    // Try each number 1-9 in the empty cell
    for num in 1..=9 {
        if is_valid_placement(grid, row, col, num) {
            // Place the number if valid
            grid[row][col] = num;
            
            // Recursively solve the rest of the puzzle
            if solve_sudoku(grid) {
                return true;
            }
            
            // If we reach here, the placement led to an invalid solution, so backtrack
            grid[row][col] = 0;
        }
    }
    
    // No valid number found, backtrack
    false
}

// Check if a number can be placed at a position without breaking Sudoku rules
pub fn is_valid_placement(grid: &SudokuGrid, row: usize, col: usize, num: i32) -> bool {
    // Check row
    for c in 0..9 {
        if grid[row][c] == num {
            return false;
        }
    }
    
    // Check column
    for r in 0..9 {
        if grid[r][col] == num {
            return false;
        }
    }
    
    // Check 3x3 box
    let box_start_row = 3 * (row / 3);
    let box_start_col = 3 * (col / 3);
    
    for r in 0..3 {
        for c in 0..3 {
            if grid[box_start_row + r][box_start_col + c] == num {
                return false;
            }
        }
    }
    
    true
}

// Check if a filled grid is a valid solution
pub fn is_valid_solution(grid: &SudokuGrid) -> bool {
    // Check each row
    for row in 0..9 {
        let mut seen = HashSet::new();
        for col in 0..9 {
            let num = grid[row][col];
            if num < 1 || num > 9 || !seen.insert(num) {
                return false;
            }
        }
    }
    
    // Check each column
    for col in 0..9 {
        let mut seen = HashSet::new();
        for row in 0..9 {
            let num = grid[row][col];
            if !seen.insert(num) {
                return false;
            }
        }
    }
    
    // Check each 3x3 box
    for box_row in 0..3 {
        for box_col in 0..3 {
            let mut seen = HashSet::new();
            
            for row in 0..3 {
                for col in 0..3 {
                    let num = grid[box_row * 3 + row][box_col * 3 + col];
                    if !seen.insert(num) {
                        return false;
                    }
                }
            }
        }
    }
    
    true
}
