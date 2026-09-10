#!/bin/bash
# 前端构建并部署到 nginx 目录
set -e

FRONTEND_DIR="/root/video-generation-aggregation/frontend"
DEPLOY_DIR="/var/www/video-gen"

echo ">>> 构建前端..."
cd "$FRONTEND_DIR"
npm run build

echo ">>> 同步到 nginx 目录..."
cp -r "$FRONTEND_DIR/build/." "$DEPLOY_DIR/"

echo ">>> 清理旧版 JS/CSS 文件..."
# 获取当前最新构建文件（按修改时间取最新，避免误删刚部署的新版本）
LATEST_JS_PATH=$(ls -t "$DEPLOY_DIR"/static/js/main.*.js 2>/dev/null | head -1)
LATEST_CSS_PATH=$(ls -t "$DEPLOY_DIR"/static/css/main.*.css 2>/dev/null | head -1)
LATEST_JS=$(basename "$LATEST_JS_PATH" 2>/dev/null | sed 's/^main\.\(.*\)\.js$/\1/')
LATEST_CSS=$(basename "$LATEST_CSS_PATH" 2>/dev/null | sed 's/^main\.\(.*\)\.css$/\1/')

if [ -n "$LATEST_JS" ]; then
  find "$DEPLOY_DIR/static/js/" -name "main.*.js" ! -name "main.${LATEST_JS}.js" -delete
  find "$DEPLOY_DIR/static/js/" -name "main.*.js.LICENSE.txt" ! -name "main.${LATEST_JS}.js.LICENSE.txt" -delete
  find "$DEPLOY_DIR/static/js/" -name "main.*.js.map" ! -name "main.${LATEST_JS}.js.map" -delete
else
  echo "警告：未找到构建产物，跳过旧文件清理"
fi

if [ -n "$LATEST_CSS" ]; then
  find "$DEPLOY_DIR/static/css/" -name "main.*.css" ! -name "main.${LATEST_CSS}.css" -delete
  find "$DEPLOY_DIR/static/css/" -name "main.*.css.map" ! -name "main.${LATEST_CSS}.css.map" -delete
fi

echo ">>> 部署完成！JS: main.${LATEST_JS}.js"
