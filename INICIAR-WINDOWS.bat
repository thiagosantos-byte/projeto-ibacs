@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title AURA - Plataforma de Acessibilidade IBACS

echo.
echo ======================================================
echo   AURA - Plataforma de Acessibilidade IBACS
echo ======================================================
echo Pasta do projeto: %CD%
echo.

if not exist "package.json" (
  echo [ERRO] package.json nao foi encontrado nesta pasta.
  echo Extraia o ZIP inteiro e execute este BAT dentro da pasta AURA-IBACS.
  goto :erro
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  echo Instale a versao LTS do Node.js em https://nodejs.org/ e reinicie o Windows.
  goto :erro
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao foi encontrado. Reinstale o Node.js marcando a opcao de adicionar ao PATH.
  goto :erro
)

for /f "delims=" %%V in ('node -p "process.versions.node"') do set "NODE_VERSION=%%V"
echo Node.js: %NODE_VERSION%
call npm.cmd --version
if errorlevel 1 (
  echo [ERRO] O npm esta instalado, mas nao conseguiu iniciar.
  goto :erro
)

node -e "const [a,b]=process.versions.node.split('.').map(Number); if (!(a===20&&b>=19 || a===22&&b>=12 || a>22)) process.exit(1)"
if errorlevel 1 (
  echo.
  echo [ERRO] Versao de Node.js incompativel com o Vite deste projeto.
  echo Use Node.js 20.19 ou superior na linha 20, ou 22.12 ou superior.
  echo Baixe a versao LTS em https://nodejs.org/.
  goto :erro
)

if not exist ".env.local" if exist ".env.example" (
  copy ".env.example" ".env.local" >nul
  echo Arquivo .env.local criado a partir do modelo.
)

if not exist "node_modules\vite\bin\vite.js" (
  echo.
  echo [1/2] Instalando dependencias. Mantenha esta janela aberta...
  echo Isto exige internet e pode levar alguns minutos.
  call npm.cmd install --no-audit --no-fund --fetch-retries=2 --fetch-timeout=120000
  if errorlevel 1 (
    echo.
    echo [ERRO] A instalacao das dependencias falhou.
    echo Verifique sua internet e tente no PowerShell:
    echo npm.cmd cache verify
    echo npm.cmd install --no-audit --no-fund
    echo.
    echo O registro de erro do npm costuma ficar em:
    echo %%LOCALAPPDATA%%\npm-cache\_logs\
    goto :erro
  )
)

if not exist "node_modules\vite\bin\vite.js" (
  echo [ERRO] O Vite nao foi instalado corretamente.
  goto :erro
)

echo.
echo [2/2] Iniciando o AURA...
echo Quando aparecer Local: http://localhost:5173/ , abra esse endereco no navegador.
echo Para encerrar o servidor, pressione Ctrl+C.
echo.
call npm.cmd run dev -- --host 127.0.0.1
echo.
echo O servidor foi encerrado.
pause
exit /b 0

:erro
echo.
echo ------------------------------------------------------
echo Nao foi possivel iniciar o AURA. Leia a mensagem acima.
echo ------------------------------------------------------
pause
exit /b 1
