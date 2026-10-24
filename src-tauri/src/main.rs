// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // En contenedores Linux o entornos sin acceso directo a nodos DRI,
        // deshabilitar el renderizador DMA-BUF de WebKitGTK previene las advertencias
        // de amdgpu/drm "Failed to open DRM node /dev/dri/renderD128: Operation not permitted".
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            // SAFETY: Invocado al inicio de `main` en un entorno estrictamente mono-hilo
            // antes del spawn de cualquier runtime multihilo o proceso de Tauri.
            unsafe {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }

    caad_lib::run()
}
