use tauri::ClipboardManager;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn copy_snippet_to_clipboard(app_handle: tauri::AppHandle, text: String) -> Result<(), String> {
    app_handle
        .clipboard()
        .write_text(text)
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, copy_snippet_to_clipboard])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
