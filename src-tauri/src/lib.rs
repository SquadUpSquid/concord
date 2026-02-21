use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckResult {
    available: bool,
    current_version: String,
    latest_version: Option<String>,
}

#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        Ok(UpdateCheckResult {
            available: true,
            current_version,
            latest_version: Some(update.version.to_string()),
        })
    } else {
        Ok(UpdateCheckResult {
            available: false,
            current_version,
            latest_version: None,
        })
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    match update {
        Some(update) => {
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
            app.restart();
        }
        None => Err("No update is currently available.".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![check_for_updates, install_update])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let updater = match app_handle.updater() {
                    Ok(updater) => updater,
                    Err(err) => {
                        eprintln!("updater init failed: {err}");
                        return;
                    }
                };

                if let Err(err) = updater.check().await {
                    eprintln!("startup update check failed: {err}");
                }
            });

            #[cfg(target_os = "linux")]
            {
                use webkit2gtk::{PermissionRequestExt, SettingsExt, WebViewExt};

                let main_window = app
                    .get_webview_window("main")
                    .expect("Failed to get main webview window");

                main_window.with_webview(|webview| {
                    let wv = webview.inner();

                    if let Some(settings) = wv.settings() {
                        settings.set_enable_media_stream(true);
                        settings.set_enable_media_capabilities(true);
                        settings.set_enable_mediasource(true);
                        settings.set_enable_webaudio(true);
                        settings.set_enable_webrtc(true);
                        settings.set_media_playback_requires_user_gesture(false);
                        settings.set_media_playback_allows_inline(true);
                    }

                    wv.connect_permission_request(|_webview, request| {
                        request.allow();
                        true
                    });
                })?;
            }

            Ok(())
        });

    if let Err(err) = app.run(tauri::generate_context!()) {
        eprintln!("Concord failed to start: {err}");
        eprintln!();
        eprintln!("Troubleshooting:");
        eprintln!("1) Start with `npm run tauri dev` from the repo root (not plain `cargo run`).");
        eprintln!("2) Ensure the frontend dev server is reachable at http://localhost:5173.");
        eprintln!("3) If you're on Linux/WSL, ensure a GUI session is available before launching.");

        #[cfg(target_os = "linux")]
        {
            if std::env::var_os("WSL_DISTRO_NAME").is_some() {
                eprintln!("4) WSL detected. If GUI apps fail, run `wsl --shutdown`, reopen WSL, then retry.");
            }
        }

        std::process::exit(1);
    }
}
