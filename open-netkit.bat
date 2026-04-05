@echo off
REM Ouvre Network Engineer Toolkit dans le navigateur par defaut (Windows).
cd /d "%~dp0"
if not exist "index.html" (
  echo Fichier index.html introuvable.
  pause
  exit /b 1
)
start "" "%cd%\index.html"
