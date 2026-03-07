# AI 视频生成聚合平台

一个集成多个 AI 视频生成模型的 Web 应用,支持前端直传腾讯云 COS,提供统一的界面和 API 接口。

## 功能特性

- ✅ **多模型支持**: 集成海螺(Hailuo)、可灵(Kling)、即梦(Jimeng)、豆包(Seedance)、Google Video 等多个 AI 视频生成模型
- ✅ **前端直传**: 文件直接上传到腾讯云 COS,无需经过后端服务器,提升上传速度
- ✅ **STS 临时密钥**: 使用腾讯云 STS 服务生成临时密钥,保证安全性
- ✅ **任务管理**: 实时查询视频生成任务状态,支持进度显示
- ✅ **安全认证**: Nginx 基本认证保护,防止未授权访问
- ✅ **Docker 部署**: 支持 Docker 和 Docker Compose 一键部署

## 技术栈

### 前端
- React 18
- Ant Design 5
- Axios
- COS JavaScript SDK v5

### 后端
- Node.js 18
- Express
- 腾讯云 SDK (COS + VOD)
- Multer

### 基础设施
- Nginx (反向代理 + 认证)
- Docker & Docker Compose
- 腾讯云 COS (对象存储)
- 腾讯云 VOD (视频处理)

## 项目结构

```
video-gen/
├── backend/                 # 后端服务
│   ├── services/           # 业务逻辑
│   │   ├── cosService.js   # COS 文件上传
│   │   ├── stsService.js   # STS 临时密钥
│   │   └── vodService.js   # VOD 视频生成
│   ├── scripts/            # 工具脚本
│   │   └── setup-cos-cors.js  # COS CORS 配置
│   ├── server.js           # Express 服务器
│   ├── .env.example        # 环境变量示例
│   └── Dockerfile          # 后端 Docker 镜像
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   └── services/       # API 服务
│   ├── public/             # 静态资源
│   ├── .env.example        # 环境变量示例
│   ├── nginx.conf          # 前端 Nginx 配置
│   └── Dockerfile          # 前端 Docker 镜像
├── nginx/                  # Nginx 配置文件
│   ├── video-gen.conf      # 主配置文件
│   └── README.md           # Nginx 配置说明
├── archive/                # 归档文件
│   ├── docs/               # 历史文档
│   └── test-files/         # 测试文件
├── docker-compose.yml      # Docker Compose 配置
├── .dockerignore          # Docker 忽略文件
└── README.md              # 项目说明文档

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- 腾讯云账号(需要 COS 和 VOD 服务)
- (可选) Docker 和 Docker Compose

### 1. 克隆项目

```bash
git clone https://github.com/cedric448/video-generation-aggregation.git
cd video-generation-aggregation
```

### 2. 配置环境变量

#### 后端配置

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件,填入您的腾讯云密钥:

```env
# 腾讯云密钥
TENCENTCLOUD_SECRET_ID=your_secret_id
TENCENTCLOUD_SECRET_KEY=your_secret_key

# COS 配置
COS_BUCKET=your-bucket-name
COS_REGION=ap-hongkong
COS_INPUT_PATH=video-gen/input
COS_OUTPUT_PATH=video-gen/output

# VOD 配置
VOD_SUB_APP_ID=your_sub_app_id

# 服务器配置
PORT=9998
NODE_ENV=production
```

#### 前端配置

```bash
cd frontend
cp .env.example .env
```

编辑 `.env` 文件:

```env
# 前端端口
PORT=9999

# 后端 API 地址
REACT_APP_API_BASE_URL=http://your-domain.com:9998/api

# 轮询间隔(毫秒)
REACT_APP_POLLING_INTERVAL=5000
```

### 3. 配置 COS CORS

```bash
cd backend
node scripts/setup-cos-cors.js
```

### 4. 部署方式

#### 方式 A: Docker Compose (推荐)

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 方式 B: 手动部署

**启动后端:**

```bash
cd backend
npm install
npm start
```

**启动前端:**

```bash
cd frontend
npm install
npm start  # 开发模式
# 或
npm run build  # 生产构建
```

### 5. 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx/video-gen.conf /etc/nginx/conf.d/

# 创建认证文件
sudo htpasswd -c /etc/nginx/.htpasswd yeyefox000
# 输入密码: asdf12345

# 测试并重载配置
sudo nginx -t
sudo nginx -s reload
```

## 使用指南

### 访问应用

访问 `http://your-domain:9999`

- **用户名**: yeyefox000
- **密码**: asdf12345

### 生成视频流程

1. **选择模型**: 从下拉菜单选择 AI 模型和版本
2. **上传文件**: 点击上传按钮,选择参考图片或视频
3. **输入 Prompt**: 描述您想要生成的视频内容
4. **选择分辨率**: 720P 或 1080P
5. **提交任务**: 点击"生成视频"按钮
6. **等待完成**: 系统会实时显示任务进度
7. **下载视频**: 生成完成后可以在线播放或下载

### 支持的模型

| 模型 | 版本 | 特点 |
|------|------|------|
| 海螺 (Hailuo) | 2.3-fast | 快速生成,适合简单场景 |
| 可灵 (Kling) | 3.0, 3.0-Omni | 高质量,支持多种风格 |
| 即梦 (Jimeng) | 3.0pro | 专业级效果 |
| 豆包 (Seedance) | 1.5-pro | 创意风格 |
| Google (GV) | 3.1-fast | Google 视频生成模型 |

## API 文档

### 获取 STS 临时密钥

```http
GET /api/sts/credentials
```

**响应:**

```json
{
  "success": true,
  "data": {
    "credentials": {
      "tmpSecretId": "...",
      "tmpSecretKey": "...",
      "sessionToken": "..."
    },
    "expiredTime": 1234567890,
    "bucket": "your-bucket",
    "region": "ap-hongkong",
    "inputPath": "video-gen/input"
  }
}
```

### 创建视频生成任务

```http
POST /api/video/create
Content-Type: application/json
```

**请求体:**

```json
{
  "ModelName": "Hailuo",
  "ModelVersion": "2.3-fast",
  "FileInfos": [
    {
      "Type": "Url",
      "Url": "https://xxx.cos.xxx.myqcloud.com/xxx.jpg",
      "Category": "Image"
    }
  ],
  "Prompt": "视频描述",
  "EnhancePrompt": "Enabled",
  "OutputConfig": {
    "StorageMode": "Permanent",
    "Resolution": "720P",
    "PersonGeneration": "AllowAdult",
    "InputComplianceCheck": "Disabled",
    "OutputComplianceCheck": "Disabled"
  },
  "InputRegion": "Mainland"
}
```

### 查询任务状态

```http
GET /api/video/status/:taskId
```

## 常见问题

### 1. 上传失败: CORS blocked

**原因**: COS 存储桶未配置 CORS 规则

**解决**: 运行 `node backend/scripts/setup-cos-cors.js`

### 2. 视频生成失败: 人物审核

**原因**: 图片包含人脸被安全审核拦截

**解决**: 使用不包含人物的图片,如风景、物品等

### 3. 无法访问前端

**原因**: Nginx 配置错误或端口被占用

**解决**: 
- 检查 Nginx 配置: `sudo nginx -t`
- 检查端口占用: `netstat -tlnp | grep 9999`

### 4. 后端 API 连接失败

**原因**: 后端服务未启动或环境变量配置错误

**解决**:
- 检查后端服务: `ps aux | grep "node server.js"`
- 验证 .env 配置
- 查看后端日志: `tail -f backend/backend.log`

## 安全建议

1. **定期更新密码**: 使用 `htpasswd` 更新 Nginx 认证密码
2. **保护环境变量**: 确保 `.env` 文件不被提交到 Git
3. **使用 HTTPS**: 生产环境建议配置 SSL 证书
4. **限制 CORS**: 只允许特定域名访问 COS
5. **定期更新密钥**: 定期轮换腾讯云 API 密钥

## 开发指南

### 本地开发

```bash
# 后端开发
cd backend
npm run dev

# 前端开发
cd frontend
npm start
```

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 Airbnb JavaScript 风格指南
- 提交前运行测试

### 目录说明

- `backend/services/` - 业务逻辑层
- `frontend/src/components/` - React 组件
- `frontend/src/services/` - API 调用封装

## 性能优化

- 前端资源 Gzip 压缩
- COS 直传避免后端瓶颈
- Nginx 反向代理缓存
- 生产环境构建优化

## 监控与日志

### Nginx 日志

- 访问日志: `/var/log/nginx/video-gen-access.log`
- 错误日志: `/var/log/nginx/video-gen-error.log`

### 应用日志

- 后端日志: `backend/backend.log`
- 前端日志: `frontend/frontend.log`

## 更新日志

### v1.0.0 (2026-03-07)

- ✅ 支持多个 AI 视频生成模型
- ✅ 前端直传 COS 功能
- ✅ STS 临时密钥认证
- ✅ Nginx 基本认证
- ✅ Docker 部署支持
- ✅ 完整的任务状态管理

## 贡献

欢迎提交 Issue 和 Pull Request!

## 许可证

MIT License

## 联系方式

- GitHub: [@cedric448](https://github.com/cedric448)
- 项目地址: [video-generation-aggregation](https://github.com/cedric448/video-generation-aggregation)

## 致谢

- [腾讯云](https://cloud.tencent.com/) - 提供 COS 和 VOD 服务
- [Ant Design](https://ant.design/) - UI 组件库
- [React](https://react.dev/) - 前端框架
