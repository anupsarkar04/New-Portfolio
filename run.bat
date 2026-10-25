@echo off
title CodeWithAnup - Portfolio Server
echo ======================================================
echo   Starting CodeWithAnup Portfolio Server...
echo ======================================================
cd /d "%~dp0"
echo Opening browser at http://localhost:5000 ...
start http://localhost:5000
node server.js
pause
