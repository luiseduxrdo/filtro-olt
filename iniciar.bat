@echo off
chcp 65001 >nul 2>&1
title Filtro OLT

echo.
echo  ============================================
echo    Filtro OLT - ISP Field Tool
echo  ============================================
echo.

echo  [1/4] Verificando diretorio...

if not exist "%~dp0index.html" (
    echo.
    echo  ERRO: index.html nao encontrado.
    echo  Execute este .bat dentro da pasta filtro-olt.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0olt-proxy\proxy.js" (
    echo.
    echo  ERRO: olt-proxy\proxy.js nao encontrado.
    echo  Execute este .bat dentro da pasta filtro-olt.
    echo.
    pause
    exit /b 1
)

echo         OK - Arquivos encontrados.
echo.

echo  [2/4] Verificando Node.js...

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERRO: Node.js nao esta instalado ou nao esta no PATH.
    echo  Baixe em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo         OK - Node.js %NODE_VER%
echo.

echo  [3/4] Verificando dependencias...

if not exist "%~dp0olt-proxy\node_modules\express" (
    echo         Instalando dependencias...
    cd /d "%~dp0olt-proxy"
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERRO: Falha ao instalar dependencias.
        echo.
        pause
        exit /b 1
    )
    echo         OK - Dependencias instaladas.
) else (
    echo         OK - Dependencias ja instaladas.
)
echo.

echo  [4/4] Iniciando servidor...

netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo  AVISO: Porta 8080 ja esta em uso.
    echo  Tentando abrir o painel mesmo assim...
    echo.
    timeout /t 2 >nul
    start http://localhost:8080
    pause
    exit /b 0
)

echo         Iniciando proxy na porta 8080...
echo.
echo  ============================================
echo    Servidor rodando em http://localhost:8080
echo    Pressione Ctrl+C para encerrar
echo  ============================================
echo.

start http://localhost:8080

cd /d "%~dp0olt-proxy"
node proxy.js
