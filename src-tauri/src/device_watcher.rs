use tauri::{AppHandle, Emitter};

/// Start watching for audio device changes and emit "audio-devices-changed"
/// on the app event bus whenever the set of input devices changes.
///
/// macOS: zero-overhead push via `AudioObjectAddPropertyListener`.
/// Windows/Linux: lightweight polling thread (checks every 2 s).
#[cfg(target_os = "macos")]
pub fn start(app: &AppHandle) {
    use coreaudio_sys::{
        kAudioHardwarePropertyDevices, kAudioObjectPropertyScopeGlobal, kAudioObjectSystemObject,
        AudioObjectAddPropertyListener, AudioObjectPropertyAddress,
    };
    use std::ffi::c_void;

    unsafe extern "C" fn on_devices_changed(
        _object_id: coreaudio_sys::AudioObjectID,
        _num_addresses: u32,
        _addresses: *const coreaudio_sys::AudioObjectPropertyAddress,
        client_data: *mut c_void,
    ) -> coreaudio_sys::OSStatus {
        let app = &*(client_data as *const AppHandle);
        let _ = app.emit("audio-devices-changed", ());
        0
    }

    // Leak the AppHandle box — the listener lives for the entire app lifetime.
    let client_data = Box::into_raw(Box::new(app.clone())) as *mut c_void;

    let address = AudioObjectPropertyAddress {
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        // kAudioObjectPropertyElementMain / kAudioObjectPropertyElementMaster = 0
        mElement: 0,
    };

    unsafe {
        AudioObjectAddPropertyListener(
            kAudioObjectSystemObject,
            &address,
            Some(on_devices_changed),
            client_data,
        );
    }
}

#[cfg(not(target_os = "macos"))]
pub fn start(app: &AppHandle) {
    use crate::audio_toolkit::audio::list_input_devices;
    use std::collections::HashSet;

    let app = app.clone();
    std::thread::spawn(move || {
        let mut prev: HashSet<String> = list_input_devices()
            .unwrap_or_default()
            .into_iter()
            .map(|info| info.name)
            .collect();

        loop {
            std::thread::sleep(std::time::Duration::from_secs(2));

            let current: HashSet<String> = list_input_devices()
                .unwrap_or_default()
                .into_iter()
                .map(|info| info.name)
                .collect();

            if current != prev {
                prev = current;
                let _ = app.emit("audio-devices-changed", ());
            }
        }
    });
}
