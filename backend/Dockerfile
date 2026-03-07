FROM node:18-alpine

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建临时目录
RUN mkdir -p temp

# 暴露端口
EXPOSE 9998

# 启动应用
CMD ["node", "server.js"]
