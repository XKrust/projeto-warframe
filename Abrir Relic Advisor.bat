@echo off
title Relic Advisor
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
echo.
echo Relic Advisor rodando. Deixe esta janela aberta enquanto usa o app.
echo Pra fechar o app, feche esta janela.
echo.
start "" cmd /c "timeout /t 4 >nul && start http://localhost:5173"
npm run dev
