@echo off
REM Fix _locales symlink on Windows (no admin required)
REM Git stores symlinks as text files on Windows. This creates a junction instead.

cd /d "%~dp0"

if exist "_locales\en" (
    echo _locales is already a valid directory. No fix needed.
    exit /b 0
)

if exist "_locales" (
    echo Replacing git symlink placeholder with Windows junction...
    move "_locales" "_locales.git-placeholder" >nul
)

mklink /J "_locales" "shared\_locales"
if errorlevel 1 (
    echo ERROR: Failed to create junction. Try running as administrator.
    if exist "_locales.git-placeholder" move "_locales.git-placeholder" "_locales" >nul
    exit /b 1
)

echo Done. _locales junction created successfully.
if exist "_locales.git-placeholder" del "_locales.git-placeholder"

REM Tell git to ignore the local change
git update-index --assume-unchanged _locales 2>nul
