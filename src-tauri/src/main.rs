// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// The #[command] attribute needs to be in the same crate as the invoke_handler
// so we implement the command handlers here
use tauri::command;

// Import the core functionality from our library
use sudoku_tauri_lib::{
    SudokuGrid, 
    Difficulty, 
    HintResponse,
    generate_puzzle as lib_generate_puzzle,
    validate_solution as lib_validate_solution,
    get_hint as lib_get_hint,
    get_hint_for_cell as lib_get_hint_for_cell
};

// Command wrapper for Tauri API
#[command]
fn generate_puzzle(difficulty: Difficulty) -> Result<SudokuGrid, String> {
    lib_generate_puzzle(difficulty)
}

// Command wrapper for Tauri API
#[command]
fn validate_solution(grid: SudokuGrid) -> Result<bool, String> {
    lib_validate_solution(grid)
}

// Command wrapper for Tauri API
#[command]
fn get_hint(grid: SudokuGrid) -> Result<HintResponse, String> {
    lib_get_hint(grid)
}

// Command wrapper for Tauri API for getting a hint for a specific cell
#[command]
fn get_hint_for_cell(grid: SudokuGrid, target_row: usize, target_col: usize) -> Result<HintResponse, String> {
    lib_get_hint_for_cell(grid, target_row, target_col)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            generate_puzzle,
            validate_solution,
            get_hint,
            get_hint_for_cell
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
