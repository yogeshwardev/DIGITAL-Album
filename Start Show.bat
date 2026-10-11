@echo off
chcp 65001 >nul
title Wedding Website
cd /d "%~dp0"
python "tools\server.py"
if errorlevel 1 (
  echo.
  echo Python was not found. You can still double-click index.html to watch on this computer.
  pause
)
