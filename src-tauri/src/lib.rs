use std::io::Write;
use std::process::{Command, Stdio};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn copy_snippet_to_clipboard(text: String) -> Result<(), String> {
    set_clipboard(&text)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, copy_snippet_to_clipboard])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
