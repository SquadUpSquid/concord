use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // On Linux, WebKitGTK denies media permission requests by default.
            // Handle the permission-request signal to allow mic/camera access for voice chat.
            #[cfg(target_os = "linux")]
            {
                use webkit2gtk::{PermissionRequestExt, WebViewExt};

                let main_window = app
                    .get_webview_window("main")
                    .expect("Failed to get main webview window");

                main_window.with_webview(|webview| {
                    webview
                        .inner()
                        .connect_permission_request(|_webview, request| {
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
