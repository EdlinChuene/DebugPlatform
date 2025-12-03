#!/bin/bash
# deploy.sh
# WebUI 构建与部署脚本
#
# 用法:
#   ./scripts/deploy.sh       # 构建并部署到 DebugHub/Public
#
# Created by Sun on 2025/12/02.
# Copyright © 2025 Sun. All rights reserved.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBUI_DIR="$(dirname "$SCRIPT_DIR")"
DEBUGHUB_PUBLIC="$WEBUI_DIR/../DebugHub/Public"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🔨 Building WebUI...${NC}"
cd "$WEBUI_DIR"

# 检查依赖
if [[ ! -d "node_modules" ]]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# 构建
npm run build

echo -e "${BLUE}🧹 Cleaning DebugHub/Public...${NC}"
rm -rf "$DEBUGHUB_PUBLIC"/*

echo -e "${BLUE}📦 Copying build output to DebugHub/Public...${NC}"
cp -r dist/* "$DEBUGHUB_PUBLIC/"

echo ""
echo -e "${GREEN}✅ Deploy complete!${NC}"
echo "   Output: $DEBUGHUB_PUBLIC"
echo ""
