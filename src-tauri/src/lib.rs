use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use std::sync::mpsc;

use tauri::{path::BaseDirectory, AppHandle, Manager, Wry};
use tauri_plugin_dialog::DialogExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn copy_snippet_to_clipboard(text: String) -> Result<(), String> {
    set_clipboard(&text)
}

#[tauri::command]
fn read_snippet_store(
    app: AppHandle,
    path: String,
    scope: Option<String>,
) -> Result<String, String> {
    let resolved = resolve_store_path(&app, Path::new(&path), scope)?;
    fs::read_to_string(&resolved)
        .map_err(|error| format!("failed to read {}: {error}", resolved.display()))
}

#[tauri::command]
fn write_snippet_store(
    app: AppHandle,
    path: String,
    scope: Option<String>,
    contents: String,
) -> Result<(), String> {
    let resolved = resolve_store_path(&app, Path::new(&path), scope)?;
    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create {}: {error}", parent.display()))?;
    }
    fs::write(&resolved, contents)
        .map_err(|error| format!("failed to write {}: {error}", resolved.display()))
}

#[tauri::command]
fn snippet_store_exists(
    app: AppHandle,
    path: String,
    scope: Option<String>,
) -> Result<bool, String> {
    let resolved = resolve_store_path(&app, Path::new(&path), scope)?;
    Ok(resolved.exists())
}

#[tauri::command]
fn ensure_snippet_store_dir(
    app: AppHandle,
    path: String,
    scope: Option<String>,
) -> Result<(), String> {
    let resolved = resolve_store_path(&app, Path::new(&path), scope)?;
    fs::create_dir_all(&resolved)
        .map_err(|error| format!("failed to create {}: {error}", resolved.display()))
}

#[tauri::command]
fn select_data_directory(app: AppHandle<Wry>, default_path: Option<String>) -> Result<Option<String>, String> {
    let (sender, receiver) = mpsc::channel();
    app.dialog()
        .file()
        .set_directory(default_path.unwrap_or_default())
        .pick_folder(move |folder| {
            let _ = sender.send(folder.map(|picked| picked.to_string_lossy().to_string()));
        });
    receiver
        .recv()
        .map_err(|error| format!("failed to open dialog: {error}"))
}

#[cfg(target_os = "macos")]
fn set_clipboard(text: &str) -> Result<(), String> {
    run_command_with_input("pbcopy", &[], text)
}

#[cfg(target_os = "windows")]
fn set_clipboard(text: &str) -> Result<(), String> {
    run_command_with_input("cmd", &["/C", "clip"], text)
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn set_clipboard(text: &str) -> Result<(), String> {
    const CANDIDATES: &[(&str, &[&str])] = &[
        ("wl-copy", &[]),
        ("xclip", &["-selection", "clipboard"]),
        ("xsel", &["--clipboard", "--input"]),
    ];

    let mut last_error: Option<String> = None;

    for (command, args) in CANDIDATES {
        match run_command_with_input(command, args, text) {
            Ok(()) => return Ok(()),
            Err(error) => last_error = Some(error),
        }
    }

    Err(last_error.unwrap_or_else(|| "no clipboard command available".to_string()))
}

fn run_command_with_input(command: &str, args: &[&str], text: &str) -> Result<(), String> {
    let mut child = Command::new(command)
        .args(args)
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|error| format!("failed to spawn {command}: {error}"))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|error| format!("failed to write to {command}: {error}"))?;
    } else {
        return Err(format!("{command} stdin unavailable"));
    }

    let status = child
        .wait()
        .map_err(|error| format!("{command} wait failed: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{command} exited with status {status}"))
    }
}

fn resolve_store_path(
    app: &AppHandle,
    path: &Path,
    scope: Option<String>,
) -> Result<PathBuf, String> {
    if path.is_absolute() {
        return Ok(path.to_path_buf());
    }
    let base_directory = scope_to_base_directory(scope);
    app.path()
        .resolve(path, base_directory)
        .map_err(|error| format!("failed to resolve path: {error}"))
}

fn scope_to_base_directory(scope: Option<String>) -> BaseDirectory {
    match scope.as_deref() {
        Some("appConfig") => BaseDirectory::AppConfig,
        Some("appData") => BaseDirectory::AppData,
        Some("appLocalData") => BaseDirectory::AppLocalData,
        Some("appCache") => BaseDirectory::AppCache,
        Some("appLog") => BaseDirectory::AppLog,
        Some("config") => BaseDirectory::Config,
        Some("data") => BaseDirectory::Data,
        Some("document") => BaseDirectory::Document,
        Some("download") => BaseDirectory::Download,
        Some("desktop") => BaseDirectory::Desktop,
        Some("home") => BaseDirectory::Home,
        Some("public") => BaseDirectory::Public,
        Some("resource") => BaseDirectory::Resource,
        Some("temp") => BaseDirectory::Temp,
        _ => BaseDirectory::AppData,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            copy_snippet_to_clipboard,
            read_snippet_store,
            write_snippet_store,
            snippet_store_exists,
            ensure_snippet_store_dir,
            select_data_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
