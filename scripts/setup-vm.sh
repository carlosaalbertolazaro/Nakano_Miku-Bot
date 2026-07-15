#!/usr/bin/env bash
# Instala todo lo que Miku necesita en una VM Ubuntu limpia (Oracle Cloud
# Always Free, o cualquier VPS Ubuntu/Debian). Ver DEPLOY_ORACLE.md para el
# resto de los pasos (clonar el repo, configurar .env, arrancar con pm2).
set -e

echo "== Actualizando paquetes =="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "== Instalando git, ffmpeg y curl =="
sudo apt-get install -y git ffmpeg curl

echo "== Instalando Node.js 20 (NodeSource) =="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "== Instalando pm2 =="
sudo npm install -g pm2

echo ""
echo "✅ Listo. Versiones instaladas:"
node --version
npm --version
ffmpeg -version | head -1
git --version
pm2 --version

echo ""
echo "Próximo paso: clonar el repo (ver DEPLOY_ORACLE.md, sección 4)."
