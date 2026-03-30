@echo off
REM Fix _locales symlink on Windows (no admin required)
REM Git stores symlinks as text files on Windows. This creates junctions instead.
REM Run from the extensions/ directory or it will cd there automatically.

cd /d "%~dp0"

echo === Blueprint Extra MCP: Windows Setup ===
echo.

REM --- Fix extensions/_locales ---
echo [1/3] Checking extensions/_locales...
if exist "_locales\en" (
    echo   Already a valid directory. Skipping.
) else (
    if exist "_locales" (
        echo   Replacing git symlink placeholder with Windows junction...
        move "_locales" "_locales.git-placeholder" >nul
    )
    mklink /J "_locales" "shared\_locales"
    if errorlevel 1 (
        echo   ERROR: Failed to create junction.
        if exist "_locales.git-placeholder" move "_locales.git-placeholder" "_locales" >nul
        exit /b 1
    )
    if exist "_locales.git-placeholder" del "_locales.git-placeholder"
    echo   Junction created: _locales -^> shared\_locales
)

REM --- Fix extensions/chrome/_locales ---
echo [2/3] Checking extensions/chrome/_locales...
if exist "chrome\_locales\en" (
    echo   Already a valid directory. Skipping.
) else (
    if exist "chrome\_locales" (
        echo   Replacing git symlink placeholder with Windows junction...
        move "chrome\_locales" "chrome\_locales.git-placeholder" >nul
    )
    mklink /J "chrome\_locales" "shared\_locales"
    if errorlevel 1 (
        echo   ERROR: Failed to create chrome junction.
        if exist "chrome\_locales.git-placeholder" move "chrome\_locales.git-placeholder" "chrome\_locales" >nul
        exit /b 1
    )
    if exist "chrome\_locales.git-placeholder" del "chrome\_locales.git-placeholder"
    echo   Junction created: chrome/_locales -^> shared\_locales
)

REM --- Clean up any leftover placeholder/backup files ---
echo [3/4] Cleaning up placeholder files...
if exist "_locales.git-placeholder" del "_locales.git-placeholder"
if exist "_locales.bak" del "_locales.bak"
if exist "locales-git-placeholder.bak" del "locales-git-placeholder.bak"
if exist "chrome\_locales.git-placeholder" del "chrome\_locales.git-placeholder"
if exist "chrome\_locales.bak" del "chrome\_locales.bak"
echo   Done.

REM --- Tell git to ignore the local junction changes ---
echo [4/4] Configuring git to ignore junction changes...
git update-index --assume-unchanged _locales 2>nul
git update-index --assume-unchanged chrome/_locales 2>nul
echo   Done.

echo.
echo === Setup complete. Extension should load in Chrome now. ===
