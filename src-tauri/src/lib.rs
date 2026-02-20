use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
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
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
