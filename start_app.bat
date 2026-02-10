@echo off
title EXOT 2026 Launcher
echo ===================================================
echo   MEMBUKA APLIKASI EXOT 2026
echo ===================================================
echo.

:: 1. Coba Python
where python >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python ditemukan.
    echo Membuka browser...
    start "" "http://localhost:8000"
    echo Menjalankan server...
    python -m http.server 8000
    goto :EOF
)

:: 2. Coba Python Launcher (py)
where py >nul 2>&1
if not errorlevel 1 (
    echo [OK] Python Launcher ditemukan.
    echo Membuka browser...
    start "" "http://localhost:8000"
    echo Menjalankan server...
    py -m http.server 8000
    goto :EOF
)

:: 3. Coba Node.js (npx)
where npm >nul 2>&1
if not errorlevel 1 (
    echo [OK] Node.js ditemukan.
    echo Membuka browser...
    start "" "http://localhost:8080"
    echo Menjalankan server...
    call npx -y http-server . -p 8080 -c-1
    goto :EOF
)

echo.
echo [X] MAAF, TIDAK DITEMUKAN PYTHON ATAU NODE.JS
echo.
echo Silakan gunakan "Live Server" di VS Code:
echo 1. Klik kanan "index.html"
echo 2. Pilih "Open with Live Server"
echo.
pause
