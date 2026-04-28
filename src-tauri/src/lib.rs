use tauri::{AppHandle, Emitter};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};

/// Start a one-shot local HTTP server so Google can redirect back with the auth code.
/// Returns the port number. When the redirect arrives, emits "oauth://code" to all windows.
#[tauri::command]
async fn start_oauth_server(app: AppHandle) -> Result<u16, String> {
    // Bind to any free port on loopback
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    tokio::spawn(async move {
        // Accept exactly one connection (the OAuth redirect)
        if let Ok((mut stream, _)) = listener.accept().await {
            let mut buf = vec![0u8; 4096];
            let n = stream.read(&mut buf).await.unwrap_or(0);
            let request = String::from_utf8_lossy(&buf[..n]);

            // The first line is: GET /?code=xxx&state=yyy HTTP/1.1
            // Pull the code= value out of the query string
            let code = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1)) // the path+query
                .and_then(|path| path.split_once('?').map(|(_, q)| q)) // just the query
                .and_then(|query| {
                    query.split('&').find_map(|pair| {
                        let (k, v) = pair.split_once('=')?;
                        if k == "code" { Some(v.to_string()) } else { None }
                    })
                })
                .unwrap_or_default();

            // Tell the browser it can close
            let body = "<html><body><h2>Signed in! You can close this tab.</h2></body></html>";
            let _ = stream
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\n\r\n{}",
                        body.len(),
                        body
                    )
                    .as_bytes(),
                )
                .await;

            // Send the code back to the Svelte app
            let _ = app.emit("oauth://code", code);
        }
    });

    Ok(port)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![start_oauth_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
