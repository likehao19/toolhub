; Tauri NSIS English Language File
; Custom messages for the installer

!ifndef TAURI_INCLUDED_CUSTOM_LANGUAGE_FILE_ENGLISH
!define TAURI_INCLUDED_CUSTOM_LANGUAGE_FILE_ENGLISH

; Custom installer messages
LangString webview2AbortError ${LANG_ENGLISH} "Failed to install WebView2! The application cannot continue."
LangString webview2DownloadError ${LANG_ENGLISH} "Error: Downloading WebView2 Failed - $0"
LangString webview2DownloadSuccess ${LANG_ENGLISH} "WebView2 bootstrapper downloaded successfully"
LangString webview2Downloading ${LANG_ENGLISH} "Downloading WebView2 bootstrapper..."
LangString webview2InstallError ${LANG_ENGLISH} "Error: Installing WebView2 failed with exit code $1"
LangString webview2InstallSuccess ${LANG_ENGLISH} "WebView2 installed successfully"
LangString webview2Installing ${LANG_ENGLISH} "Installing WebView2..."
LangString deletingAppData ${LANG_ENGLISH} "Deleting application data..."
LangString runningApp ${LANG_ENGLISH} "The application is currently running. Please close it before continuing..."
LangString tryToCloseApp ${LANG_ENGLISH} "Attempting to close the application..."
LangString failedToCloseApp ${LANG_ENGLISH} "Failed to close the application. Please close it manually before continuing..."

!endif
