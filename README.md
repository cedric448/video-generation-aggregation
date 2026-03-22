# AI 视频 / 图片生成聚合平台

一个集成多个 AI 视频和图片生成模型的 Web 应用，支持前端直传腾讯云 COS，提供统一的界面和 API 接口。

## 功能特性

- **多模型支持**: 视频生成 10 个模型、图片生成 7 个模型，覆盖 GEM (Gemini)、Qwen、Seedream、Kling、Vidu、Jimeng、Hunyuan 等
- **双 Tab 页**: 视频生成与图片生成独立页面，统一操作体验
- **前端直传**: 文件直接上传到腾讯云 COS，无需经过后端服务器，上传速度更快
- **STS 临时密钥**: 使用腾讯云 STS 服务生成临时密钥，保证上传安全性
- **任务实时轮询**: 每 5 秒查询一次生成进度，完成后自动展示结果
- **双栏响应式布局**: PC 端左右分栏展示，手机端自动折叠为单列
- **高级选项折叠**: 默认只展示常用配置，高级参数按需展开
- **安全认证**: Nginx Basic Auth 保护，防止未授权访问
- **Docker 部署**: 支持 Docker Compose 一键部署

## 存储说明

| 用途 | 地址 |
|------|------|
| Input（上传素材） | `https://videogen-1258272081.cos.ap-hongkong.myqcloud.com` |
| Output（生成结果） | 腾讯云 · 云点播 · cedricbwang 应用 |

---

## 支持的视频生成模型

| 模型 | 版本 | 默认版本 | 支持音频 | 支持首尾帧 | 备注 |
|------|------|---------|---------|----------|------|
| 海螺 (Hailuo) | 2.3-fast / 2.3 / 02 | 2.3-fast | — | — | 支持 768P/1080P |
| 可灵 (Kling) | 3.0-Omni / 3.0 / 2.6 / 2.5 / 2.1 / 2.0 / 1.6 / O1 | 3.0-Omni | ✓ | 2.6 / 2.1 | 2.6 首尾帧时仅无声 |
| 即梦 (Jimeng) | 3.0pro | 3.0pro | — | — | |
| Vidu | q3-pro / q2 / q2-pro / q2-turbo / q3-turbo | q3-pro | ✓ | q2-pro / q2-turbo / q3-turbo | q2 支持多图（≤7 张） |
| Google Veo (GV) | 3.1 / 3.1-fast | 3.1-fast | ✓ | ✓（单图时） | 多图时首尾帧不可用（≤3 张） |
| 混元 (Hunyuan) | 1.5 | 1.5 | — | — | |
| 明眸 (Mingmou) | 1.0 | 1.0 | — | — | |
| 豆包 (Seedance) | 1.5-pro / 1.0-pro / 1.0-pro-fast / 1.0-lite-i2v | 1.5-pro | 1.5-pro | — | 1.5-pro 最高 720P |
| OpenAI Sora (OS) | 2.0 | 2.0 | 始终开启 | — | 默认生成音频，无开关 |

### 视频生成 FileInfos 规则

- 支持首尾帧模式时，首帧最多 1 张，尾帧通过独立上传区传入（LastFrameUrl）
- Vidu q2 多图：最多 7 张
- GV 多图：最多 3 张；上传 2 张及以上时首尾帧自动禁用
- 图片格式：JPEG / PNG，≤10MB；视频 ≤100MB

---

## 支持的图片生成模型

| 模型 | 版本 | 默认版本 | 分辨率 | 最大参考图 | 支持宽高比 |
|------|------|---------|--------|-----------|----------|
| GEM (Gemini) | 2.5 (nano banana) | — | 1K / 2K / 4K | 3 张 | 10 种比例 |
| GEM (Gemini) | 3.0 (nano banana pro) | — | 1K / 2K / 4K | 3 张 | 10 种比例 |
| GEM (Gemini) | 3.1 (nano banana2) | 2.5 ✦ | — | 3 张 | 10 种比例 |
| Qwen (千问) | 0925 | 0925 ✦ | — | 1 张 | 不支持 |
| Seedream (豆包) | 5.0-lite / 4.5 | 5.0-lite ✦ | 2K / 4K | 1 张 | 7 种比例 |
| Kling (可灵) | 3.0-Omni / 3.0 / 2.1 | 3.0-Omni ✦ | 1K / 2K | 1 张 | 8 种比例 |
| Vidu | q3-pro / q3 / q3-turbo / q2 | q3-pro ✦ | 1080P / 2K / 4K | q2: 7 张；其余: 1 张 | 8 种比例 |
| Jimeng (即梦) | 4.0 | 4.0 ✦ | — | 1 张 | 7 种比例 |
| Hunyuan (混元) | 3.0 | 3.0 ✦ | 720P / 1080P / 2K / 4K | 1 张 | 8 种比例 |

### 图片生成 FileInfos 规则

- 参考图为可选项，不传则纯文生图
- GEM 全版本、Vidu q2 支持多张参考图（均支持 webp 格式）
- 图片格式：JPEG / PNG（部分模型支持 WEBP），≤10MB

---

## 技术栈

### 前端
- React 18
- Ant Design 5
- Axios
- COS JavaScript SDK v5

### 后端
- Node.js 18
- Express
- 腾讯云 SDK（COS + VOD + STS）
- Multer

### 基础设施
- Nginx（反向代理 + Basic Auth）
- Docker & Docker Compose
- 腾讯云 COS（对象存储）
- 腾讯云 VOD（视频/图片处理）

## 项目结构

```
video-generation-aggregation/
├── backend/
│   ├── services/
│   │   ├── cosService.js        # COS 文件上传
│   │   ├── stsService.js        # STS 临时密钥
│   │   └── vodService.js        # VOD 视频/图片生成任务
│   ├── scripts/
│   │   └── setup-cos-cors.js    # COS CORS 配置脚本
│   ├── server.js                # Express 服务器入口
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoGenForm.js  # 视频生成表单（双栏布局）
│   │   │   ├── ImageGenForm.js  # 图片生成表单（双栏布局）
│   │   │   └── VideoGenForm.css
│   │   ├── services/
│   │   │   ├── api.js           # 后端 API 封装
│   │   │   └── cosService.js    # 前端直传 COS
│   │   └── App.js               # Tabs 双 Tab 入口
│   ├── nginx.conf
│   ├── .env.example
│   └── Dockerfile
├── nginx/
│   ├── video-gen.conf           # Nginx 主配置
│   └── 00-default-deny.conf     # 禁止 80 端口直接访问
├── docker-compose.yml
└── README.md
```

## 快速开始

### 环境要求

- Node.js 18+
- 腾讯云账号（需开通 COS 和 VOD 服务）
- （可选）Docker & Docker Compose

### 1. 克隆项目

```bash
git clone https://github.com/cedric448/video-generation-aggregation.git
cd video-generation-aggregation
```

### 2. 配置环境变量

**后端（`backend/.env`）：**

```bash
cd backend && cp .env.example .env
```

```env
TENCENTCLOUD_SECRET_ID=your_secret_id
TENCENTCLOUD_SECRET_KEY=your_secret_key

COS_BUCKET=videogen-1258272081
COS_REGION=ap-hongkong
COS_INPUT_PATH=video-gen/input
COS_OUTPUT_PATH=video-gen/output

VOD_SUB_APP_ID=your_sub_app_id

PORT=9998
NODE_ENV=production
```

**前端（`frontend/.env`）：**

```bash
cd frontend && cp .env.example .env
```

```env
REACT_APP_API_BASE_URL=http://your-domain:9998/api
REACT_APP_POLLING_INTERVAL=5000
```

### 3. 配置 COS CORS

```bash
node backend/scripts/setup-cos-cors.js
```

### 4. 部署

#### Docker Compose（推荐）

```bash
docker compose up -d
docker compose logs -f
```

#### 手动部署

```bash
# 后端
cd backend && npm install && npm start

# 前端（生产构建）
cd frontend && npm install && npm run build
# 将 build/ 目录部署到 Nginx 静态目录
cp -r frontend/build/* /var/www/video-gen/
```

### 5. 配置 Nginx

```bash
sudo cp nginx/video-gen.conf /etc/nginx/conf.d/
sudo cp nginx/00-default-deny.conf /etc/nginx/conf.d/

# 创建认证文件
sudo htpasswd -c /etc/nginx/.htpasswd <username>

# 重载
sudo nginx -t && sudo nginx -s reload
```

### 6. 访问

```
http://your-domain:9999
```

## API 文档

### GET /api/sts/credentials — 获取 STS 临时密钥

```json
{
  "success": true,
  "data": {
    "credentials": { "tmpSecretId": "...", "tmpSecretKey": "...", "sessionToken": "..." },
    "expiredTime": 1234567890,
    "bucket": "videogen-1258272081",
    "region": "ap-hongkong",
    "inputPath": "video-gen/input"
  }
}
```

### POST /api/video/create — 创建视频生成任务

```json
{
  "ModelName": "Kling",
  "ModelVersion": "3.0-Omni",
  "FileInfos": [
    { "Type": "Url", "Url": "https://xxx.cos.xxx.myqcloud.com/xxx.jpg", "Category": "Image" }
  ],
  "Prompt": "视频描述",
  "EnhancePrompt": "Enabled",
  "OutputConfig": {
    "StorageMode": "Permanent",
    "Resolution": "720P",
    "PersonGeneration": "AllowAdult",
    "InputComplianceCheck": "Disabled",
    "OutputComplianceCheck": "Disabled",
    "Duration": 5,
    "AudioGeneration": "Enabled"
  },
  "InputRegion": "Mainland"
}
```

### GET /api/video/status/:taskId — 查询视频任务状态

返回任务当前状态（`WAITING` / `PROCESSING` / `FINISH` / `FAIL`）及输出视频 URL。

### POST /api/image/create — 创建图片生成任务

```json
{
  "ModelName": "GEM",
  "ModelVersion": "2.5",
  "FileInfos": [
    { "Type": "Url", "Url": "https://xxx.cos.xxx.myqcloud.com/xxx.png" }
  ],
  "Prompt": "图片描述",
  "EnhancePrompt": "Enabled",
  "OutputConfig": {
    "StorageMode": "Permanent",
    "Resolution": "1K",
    "AspectRatio": "16:9",
    "PersonGeneration": "AllowAdult",
    "InputComplianceCheck": "Disabled",
    "OutputComplianceCheck": "Disabled"
  },
  "InputRegion": "Mainland"
}
```

> 注意：图片生成接口的 `FileInfos` 不支持 `Category` 字段。

### GET /api/image/status/:taskId — 查询图片任务状态

返回任务当前状态及输出图片 URL。

## 使用流程

### 视频生成
1. 切换到「视频生成」Tab
2. 选择模型及版本
3. 上传首帧图片/视频（支持首尾帧模式的版本可额外上传尾帧）
4. 填写 Prompt 描述
5. 配置分辨率、时长、音频等输出参数
6. 点击「生成视频」，等待完成后在线播放或下载

### 图片生成
1. 切换到「图片生成」Tab
2. 选择模型及版本
3. 上传参考图（可选，支持多图的模型可上传多张）
4. 填写 Prompt 描述
5. 配置宽高比、分辨率等输出参数
6. 点击「生成图片」，等待完成后查看或下载

## 常见问题

**上传失败 CORS blocked**
运行 `node backend/scripts/setup-cos-cors.js` 配置 COS CORS 规则。

**生成失败（人物审核）**
图片含有人脸被安全策略拦截，尝试使用风景、物品等不含人物的图片，或在高级选项中调整合规检查设置。

**ModelVersion invalid 错误**
确保所选版本与模型匹配，页面下拉列表中的版本均为该模型支持的合法版本。

**Seedance 1.5-pro 不支持 1080P**
该版本最高支持 720P，选择此版本时分辨率选项会自动限制为 720P。

**Kling 2.6 有声生成失败**
2.6 版本使用首尾帧时只支持无声模式，请将音频设置为「关闭」。

**图片生成接口参数错误**
图片生成的 `FileInfos` 不需要传 `Category` 字段（视频生成才需要）。

## 更新日志

### v1.3.0 (2026-03-08)

- **新增图片生成 Tab**: 支持 GEM / Qwen / Seedream / Kling / Vidu / Jimeng / Hunyuan 7 个图片生成模型
- **图片分辨率**: 部分模型支持 1K / 2K / 4K / 1080P / 720P 等选项
- **图片宽高比**: 各模型独立配置，GEM 支持 10 种比例，Qwen 不支持
- **多图参考**: GEM 3.x / Vidu q2 支持最多 3 / 7 张参考图，支持 webp 格式
- **OS 模型**: label 更新为「OpenAI Sora (OS)」，默认始终生成音频，去掉音频开关
- **视频 FileInfos**: 图片格式限制为 JPEG/PNG（≤10MB），视频 ≤100MB；动态 maxFiles
- **尾帧上传**: 支持首尾帧的模型新增独立尾帧上传区（LastFrameUrl）

### v1.2.0 (2026-03-07)

- **UI 重构**: 双栏响应式布局，PC 端左右分栏，手机端自动单列
- **高级选项**: 默认折叠，减少页面噪音
- **Kling**: 新增版本 3.0-Omni（默认）、3.0、2.6；支持有声/无声；2.6 首尾帧仅无声
- **Vidu**: 新增 q3-pro（默认）；q2 支持多图（最多 7 张）
- **新增 Seedance（豆包）**: 版本 1.5-pro / 1.0-pro / 1.0-pro-fast / 1.0-lite-i2v；1.5-pro 支持有声/无声，最高 720P
- **GV**: 多图输入时自动禁用首尾帧
- **存储说明**: 页面顶部新增 Input/Output 存储位置说明
- **Bug 修复**: 修复 Hailuo 初始 ModelVersion 传值错误（`Hailuo` → `2.3-fast`）
- **Bug 修复**: 修正豆包模型入参名称（`Seeddance` → `Seedance`）

### v1.0.0 (2026-02-15)

- 多模型 AI 视频生成（Hailuo / Kling / Jimeng / Vidu / GV / Hunyuan / Mingmou / OS）
- 前端直传 COS + STS 临时密钥
- 任务状态实时轮询
- Nginx Basic Auth 安全认证
- Docker Compose 一键部署

## 安全建议

- `.env` 文件已加入 `.gitignore`，请勿手动提交密钥
- 定期轮换腾讯云 API 密钥
- 生产环境建议配置 HTTPS
- 定期更新 Nginx 认证密码

## 许可证

MIT License

## 联系方式

- GitHub: [@cedric448](https://github.com/cedric448)
- 项目地址: [video-generation-aggregation](https://github.com/cedric448/video-generation-aggregation)
