use crate::input;
use crate::settings;
use crate::settings::{ActivationMode, OverlayPosition};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter, Manager};

/// Monotonic counter incremented each time the overlay is shown.
/// The hide thread checks this to avoid hiding a freshly-shown overlay.
static OVERLAY_SHOW_GENERATION: AtomicU64 = AtomicU64::new(0);

#[cfg(not(target_os = "macos"))]
use log::debug;

#[cfg(not(target_os = "macos"))]
use tauri::WebviewWindowBuilder;

#[cfg(target_os = "macos")]
use tauri::WebviewUrl;

#[cfg(target_os = "macos")]
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelBuilder, PanelLevel, StyleMask,
};

#[cfg(target_os = "macos")]
use objc2_app_kit::NSScreen;

#[cfg(target_os = "linux")]
use gtk_layer_shell::{Edge, KeyboardMode, Layer, LayerShell};
#[cfg(target_os = "linux")]
use std::env;

#[cfg(target_os = "macos")]
tauri_panel! {
    panel!(RecordingOverlayPanel {
        config: {
            can_become_key_window: false,
            is_floating_panel: true
        }
    })
}

const OVERLAY_WIDTH: f64 = 320.0;
const OVERLAY_HEIGHT: f64 = 120.0;

#[cfg(target_os = "macos")]
const OVERLAY_TOP_OFFSET: f64 = 46.0;
#[cfg(any(target_os = "windows", target_os = "linux"))]
const OVERLAY_TOP_OFFSET: f64 = 4.0;

#[cfg(target_os = "macos")]
const OVERLAY_DOCK_GAP: f64 = 10.0;

#[cfg(any(target_os = "windows", target_os = "linux"))]
const OVERLAY_BOTTOM_OFFSET: f64 = 40.0;

#[cfg(target_os = "linux")]
fn update_gtk_layer_shell_anchors(overlay_window: &tauri::webview::WebviewWindow) {
    let window_clone = overlay_window.clone();
    let _ = overlay_window.run_on_main_thread(move || {
        // Try to get the GTK window from the Tauri webview
        if let Ok(gtk_window) = window_clone.gtk_window() {
            let settings = settings::get_settings(window_clone.app_handle());
            match settings.overlay_position {
                OverlayPosition::Top => {
                    gtk_window.set_anchor(Edge::Top, true);
                    gtk_window.set_anchor(Edge::Bottom, false);
                }
                OverlayPosition::Bottom | OverlayPosition::None => {
                    gtk_window.set_anchor(Edge::Bottom, true);
                    gtk_window.set_anchor(Edge::Top, false);
                }
            }
        }
    });
}

/// Initializes GTK layer shell for Linux overlay window
/// Returns true if layer shell was successfully initialized, false otherwise
#[cfg(target_os = "linux")]
fn init_gtk_layer_shell(overlay_window: &tauri::webview::WebviewWindow) -> bool {
    // On KDE Wayland, layer-shell init has shown protocol instability.
    // Fall back to regular always-on-top overlay behavior (as in v0.7.1).
    let is_wayland = env::var("WAYLAND_DISPLAY").is_ok()
        || env::var("XDG_SESSION_TYPE")
            .map(|v| v.eq_ignore_ascii_case("wayland"))
            .unwrap_or(false);
    let is_kde = env::var("XDG_CURRENT_DESKTOP")
        .map(|v| v.to_uppercase().contains("KDE"))
        .unwrap_or(false)
        || env::var("KDE_SESSION_VERSION").is_ok();
    if is_wayland && is_kde {
        debug!("Skipping GTK layer shell init on KDE Wayland");
        return false;
    }

    if !gtk_layer_shell::is_supported() {
        return false;
    }

    // Try to get the GTK window from the Tauri webview
    if let Ok(gtk_window) = overlay_window.gtk_window() {
        // Initialize layer shell
        gtk_window.init_layer_shell();
        gtk_window.set_layer(Layer::Overlay);
        gtk_window.set_keyboard_mode(KeyboardMode::None);
        gtk_window.set_exclusive_zone(0);

        update_gtk_layer_shell_anchors(overlay_window);

        return true;
    }
    false
}

/// Forces a window to be topmost using Win32 API (Windows only)
/// This is more reliable than Tauri's set_always_on_top which can be overridden
#[cfg(target_os = "windows")]
fn force_overlay_topmost(overlay_window: &tauri::webview::WebviewWindow) {
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
    };

    // Clone because run_on_main_thread takes 'static
    let overlay_clone = overlay_window.clone();

    // Make sure the Win32 call happens on the UI thread
    let _ = overlay_clone.clone().run_on_main_thread(move || {
        if let Ok(hwnd) = overlay_clone.hwnd() {
            unsafe {
                // Force Z-order: make this window topmost without changing size/pos or stealing focus
                let _ = SetWindowPos(
                    hwnd,
                    Some(HWND_TOPMOST),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
                );
            }
        }
    });
}

/// Monitor bounds in logical (point) coordinates.
struct LogicalBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

/// Convert a monitor's physical-pixel bounds to logical (point) coordinates.
/// On macOS, enigo returns logical coordinates while Tauri monitor bounds are
/// physical pixels, so this conversion is needed for correct comparisons.
fn logical_bounds(monitor: &tauri::Monitor) -> LogicalBounds {
    let scale = monitor.scale_factor();
    LogicalBounds {
        x: monitor.position().x as f64 / scale,
        y: monitor.position().y as f64 / scale,
        width: monitor.size().width as f64 / scale,
        height: monitor.size().height as f64 / scale,
    }
}

/// Returns the bottom Dock inset (in logical points) for the NSScreen whose
/// frame best matches the given Tauri monitor bounds. Returns 0 when the Dock
/// is hidden or not on the bottom edge.
#[cfg(target_os = "macos")]
fn get_dock_bottom_inset(b: &LogicalBounds) -> f64 {
    // Find the NSScreen that matches this Tauri monitor by comparing frames.
    // SAFETY: NSScreen.screens/frame/visibleFrame are read-only queries that are
    // safe to call from any thread. MainThreadMarker is only required by the
    // objc2 binding's conservative safety model.
    let mtm = unsafe { objc2::MainThreadMarker::new_unchecked() };
    let screens = NSScreen::screens(mtm);

    let matched = screens.into_iter().find(|screen| {
        let frame = screen.frame();
        // NSScreen uses Cocoa coordinates (bottom-left origin) and logical points.
        // Match by width/height since origins differ between coordinate systems.
        (frame.size.width - b.width).abs() < 2.0 && (frame.size.height - b.height).abs() < 2.0
    });

    if let Some(screen) = matched {
        // In Cocoa coords, visibleFrame.origin.y > frame.origin.y when Dock is at bottom.
        let inset = screen.visibleFrame().origin.y - screen.frame().origin.y;
        if inset > 1.0 { inset } else { 0.0 }
    } else {
        0.0
    }
}

fn get_monitor_with_cursor(app_handle: &AppHandle) -> Option<tauri::Monitor> {
    if let Some(mouse_location) = input::get_cursor_position(app_handle) {
        if let Ok(monitors) = app_handle.available_monitors() {
            for monitor in monitors {
                let b = logical_bounds(&monitor);
                let (mx, my) = (mouse_location.0 as f64, mouse_location.1 as f64);

                if mx >= b.x && mx < b.x + b.width && my >= b.y && my < b.y + b.height {
                    return Some(monitor);
                }
            }
        }
    }

    app_handle.primary_monitor().ok().flatten()
}

fn calculate_overlay_position(app_handle: &AppHandle) -> Option<(f64, f64)> {
    if let Some(monitor) = get_monitor_with_cursor(app_handle) {
        let b = logical_bounds(&monitor);
        let settings = settings::get_settings(app_handle);

        let x = b.x + (b.width - OVERLAY_WIDTH) / 2.0;
        let y = match settings.overlay_position {
            OverlayPosition::Top => b.y + OVERLAY_TOP_OFFSET,
            OverlayPosition::Bottom | OverlayPosition::None => {
                #[cfg(target_os = "macos")]
                let bottom_offset = get_dock_bottom_inset(&b) + OVERLAY_DOCK_GAP;
                #[cfg(not(target_os = "macos"))]
                let bottom_offset = OVERLAY_BOTTOM_OFFSET;

                b.y + b.height - OVERLAY_HEIGHT - bottom_offset
            }
        };

        return Some((x, y));
    }
    None
}

/// Creates the recording overlay window and keeps it hidden by default
#[cfg(not(target_os = "macos"))]
pub fn create_recording_overlay(app_handle: &AppHandle) {
    let position = calculate_overlay_position(app_handle);

    // On Linux (Wayland), monitor detection often fails, but we don't need exact coordinates
    // for Layer Shell as we use anchors. On other platforms, we require a position.
    #[cfg(not(target_os = "linux"))]
    if position.is_none() {
        debug!("Failed to determine overlay position, not creating overlay window");
        return;
    }

    let mut builder = WebviewWindowBuilder::new(
        app_handle,
        "recording_overlay",
        tauri::WebviewUrl::App("src/overlay/index.html".into()),
    )
    .title("Recording")
    .resizable(false)
    .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
    .shadow(false)
    .maximizable(false)
    .minimizable(false)
    .closable(false)
    .accept_first_mouse(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .transparent(true)
    .focused(false)
    .visible(false);

    if let Some((x, y)) = position {
        builder = builder.position(x, y);
    }

    match builder.build() {
        Ok(window) => {
            #[cfg(target_os = "linux")]
            {
                // Try to initialize GTK layer shell, ignore errors if compositor doesn't support it
                if init_gtk_layer_shell(&window) {
                    debug!("GTK layer shell initialized for overlay window");
                } else {
                    debug!("GTK layer shell not available, falling back to regular window");
                }
            }

            debug!("Recording overlay window created successfully (hidden)");
        }
        Err(e) => {
            debug!("Failed to create recording overlay window: {}", e);
        }
    }
}

/// Creates the recording overlay panel and keeps it hidden by default (macOS)
#[cfg(target_os = "macos")]
pub fn create_recording_overlay(app_handle: &AppHandle) {
    if let Some((x, y)) = calculate_overlay_position(app_handle) {
        // PanelBuilder creates a Tauri window then converts it to NSPanel.
        // The window remains registered, so get_webview_window() still works.
        match PanelBuilder::<_, RecordingOverlayPanel>::new(app_handle, "recording_overlay")
            .url(WebviewUrl::App("src/overlay/index.html".into()))
            .title("Recording")
            .position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
            .level(PanelLevel::Status)
            .size(tauri::Size::Logical(tauri::LogicalSize {
                width: OVERLAY_WIDTH,
                height: OVERLAY_HEIGHT,
            }))
            .has_shadow(false)
            .transparent(true)
            .corner_radius(0.0)
            // Build the backing window hidden so panel creation does not need
            // to temporarily flip the app activation policy and flash the dock icon.
            .with_window(|w| {
                w.decorations(false)
                    .transparent(true)
                    .visible(false)
                    .focused(false)
            })
            .collection_behavior(
                CollectionBehavior::new()
                    .can_join_all_spaces()
                    .full_screen_auxiliary(),
            )
            .build()
        {
            Ok(panel) => {
                // Prevent showing the overlay from activating Handless, which
                // would cause macOS to leave a fullscreen space.
                panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());
                let _ = panel.hide();
            }
            Err(e) => {
                log::error!("Failed to create recording overlay panel: {}", e);
            }
        }
    }
}

#[derive(Clone, serde::Serialize)]
struct OverlayPayload<'a> {
    state: &'a str,
    position: &'a str,
    activation_mode: &'a str,
}

fn show_overlay_state(app_handle: &AppHandle, state: &str) {
    // Check if overlay should be shown based on position setting
    let settings = settings::get_settings(app_handle);
    if settings.overlay_position == OverlayPosition::None {
        return;
    }

    update_overlay_position(app_handle);

    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        // Bump generation so any pending hide thread becomes a no-op
        OVERLAY_SHOW_GENERATION.fetch_add(1, Ordering::SeqCst);
        let _ = overlay_window.show();

        // In toggle mode during recording, the overlay shows clickable
        // cancel/confirm buttons, so it must accept cursor events.
        // Otherwise, make it fully click-through (see #122).
        let needs_interaction =
            state == "recording" && settings.activation_mode == ActivationMode::Toggle;
        let _ = overlay_window.set_ignore_cursor_events(!needs_interaction);

        // On macOS, also use the NSPanel's order_front_regardless to ensure
        // the overlay appears on fullscreen spaces. Must run on the main
        // thread because it calls AppKit APIs directly via objc2.
        #[cfg(target_os = "macos")]
        {
            let app = app_handle.clone();
            let _ = overlay_window.run_on_main_thread(move || {
                if let Ok(panel) = app.get_webview_panel("recording_overlay") {
                    panel.order_front_regardless();
                }
            });
        }

        // On Windows, aggressively re-assert "topmost" in the native Z-order after showing
        #[cfg(target_os = "windows")]
        force_overlay_topmost(&overlay_window);

        let position_str = match settings.overlay_position {
            OverlayPosition::Top => "top",
            _ => "bottom",
        };
        let activation_mode_str = match settings.activation_mode {
            ActivationMode::Toggle => "toggle",
            ActivationMode::Hold | ActivationMode::HoldOrToggle => "hold",
        };
        let _ = overlay_window.emit(
            "show-overlay",
            OverlayPayload {
                state,
                position: position_str,
                activation_mode: activation_mode_str,
            },
        );
    }
}

/// Shows the recording overlay window with fade-in animation
pub fn show_recording_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "recording");
}

/// Shows the transcribing overlay window
pub fn show_transcribing_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "transcribing");
}

/// Shows the processing overlay window
pub fn show_processing_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "processing");
}

/// Updates the overlay window position based on current settings
pub fn update_overlay_position(app_handle: &AppHandle) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        #[cfg(target_os = "linux")]
        {
            update_gtk_layer_shell_anchors(&overlay_window);
        }

        if let Some((x, y)) = calculate_overlay_position(app_handle) {
            let _ = overlay_window
                .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
        }
    }
}

/// Hides the recording overlay window with fade-out animation
pub fn hide_recording_overlay(app_handle: &AppHandle) {
    // Always hide the overlay regardless of settings - if setting was changed while recording,
    // we still want to hide it properly
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        // Emit event to trigger fade-out animation
        let _ = overlay_window.emit("hide-overlay", ());
        // Hide the window after a short delay to allow animation to complete.
        // Capture the current generation so we skip the hide if a new show
        // was requested while we were sleeping (prevents Bug #2 race).
        let gen = OVERLAY_SHOW_GENERATION.load(Ordering::SeqCst);
        let window_clone = overlay_window.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(300));
            if OVERLAY_SHOW_GENERATION.load(Ordering::SeqCst) == gen {
                let _ = window_clone.hide();
            }
        });
    }
}

pub fn emit_levels(app_handle: &AppHandle, levels: &Vec<f32>) {
    // emit levels to main app
    let _ = app_handle.emit("mic-level", levels);

    // also emit to the recording overlay if it's open
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit("mic-level", levels);
    }
}

/// Notify the overlay that the effective activation mode has changed
/// (e.g. hold_or_toggle transitioned into toggle after a quick press).
pub fn update_overlay_activation_mode(app_handle: &AppHandle, mode: ActivationMode) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        // Toggle mode needs clickable buttons; others are click-through
        let needs_interaction = mode == ActivationMode::Toggle;
        let _ = overlay_window.set_ignore_cursor_events(!needs_interaction);
        let mode_str = match mode {
            ActivationMode::Toggle => "toggle",
            ActivationMode::Hold | ActivationMode::HoldOrToggle => "hold",
        };
        let _ = overlay_window.emit("update-activation-mode", mode_str);
    }
}

pub fn emit_streaming_text(app_handle: &AppHandle, text: &str) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit("streaming-text", text);
    }
}
