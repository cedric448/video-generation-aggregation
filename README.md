# AI 视频 / 图片生成聚合平台

一个集成多个 AI 视频和图片生成模型的 Web 应用，支持前端直传腾讯云 COS，提供统一的界面和 API 接口。

## 功能特性

- **多模型支持**: 视频生成 12 个模型、图片生成 11 个模型、音频生成 3 个模型，覆盖 Hailuo、Kling、Vidu、GV、Wan、H2、Pixverse、Jimeng、Seedance、Hunyuan、GEM、OG、MJ、SI、Qwen、Mingmou、MiniMaxMusic、GL 等
- **三 Tab 页**: 视频生成、图片生成与音频生成独立页面，统一操作体验
- **前端直传**: 文件直接上传到腾讯云 COS，无需经过后端服务器，上传速度更快
- **STS 临时密钥**: 使用腾讯云 STS 服务生成临时密钥，保证上传安全性
- **任务实时轮询**: 每 5 秒查询一次生成进度，完成后自动展示结果
- **双栏响应式布局**: PC 端左右分栏展示，手机端自动折叠为单列
- **高级选项折叠**: 默认只展示常用配置，高级参数（ExtInfo、固定主体 ID 等）按需展开
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
| 海螺 (Hailuo) | H3-Max / H3 / H3_regen / 2.3-fast / 2.3 / 02 | H3-Max | ✓ | H3-Max / H3 | H3：多模态参考生（图≤9、视频≤3、音频≤3）；H3-Max：不支持参考生；H3_regen：视频再生成（2K/4K） |
| 可灵 (Kling) | 3.0-Omni / 3.0 / 3.0-turbo / 2.6 / 2.5 / 2.1 / 2.0 / 1.6 / O1 | 3.0-Omni | ✓ | 3.0-Omni / 3.0 / 2.6 / 2.1 | 3.0-Omni 参考图≤8、支持视频参考；2.6 首尾帧时仅无声；3.0/3.0-Omni 支持 4K（需开通） |
| 即梦 (Jimeng) | 3.0pro | 3.0pro | — | — | |
| Vidu | q3-pro / q3 / q3-turbo / q3-mix / q3-drama / q3-ad / q2 / q2-pro / q2-turbo / avatar-q2-pro / avatar-q2-turbo / lip-sync | q3-pro | ✓ | q3-pro / q3-turbo / q2-pro / q2-turbo | q3-drama 参考图 1-14 张；q3-ad 参考图 1-7 张；avatar-* 为数字人（图+音频）；lip-sync 为对口型（视频+音频） |
| Google Veo (GV) | omni / 3.1 / 3.1-fast / 3.1-lite | omni | ✓ | ✓（多素材时禁用） | omni 参考图/视频总配额 7，视频≤3 秒；支持 PreviousTaskId 有状态视频编辑 |
| 混元 (Hunyuan) | 3d_2.0 / 1.5 | 3d_2.0 | ✓（3d） | — | 3d_2.0 为 3D 世界模型（SceneType=3d_scene，200 元/次） |
| 明眸 (Mingmou) | 1.0 | 1.0 | — | — | |
| 豆包 (Seedance) | 1.5-pro / 1.0-pro / 1.0-pro-fast / 1.0-lite-i2v | 1.5-pro | 1.5-pro | — | 1.5-pro 最高 720P |
| OpenAI Sora (OS) | 2.0 | 2.0 | 始终开启 | — | 默认生成音频，无开关 |
| Pixverse (爱诗) | C1 / V6.0 / V5.6 / lip_sync | C1 | C1 / V6.0 | — | C1/V6.0 参考图≤7、音画同出、1-15 秒；lip_sync 为对口型（视频+音频） |
| 快乐马 (H2) | 1.1 / 1.0 | 1.1 | ✓ | — | 支持多图参考（1-9 张）；1.1 支持 9 种宽高比；时长 3-15 秒 |
| 万相 (Wan) | 3.0 / 3.0-prime | 3.0 | ✓ | ✓ | 全能参考：图≤10、视频≤5 段（总≤15 秒）、音频≤5 段（总≤15 秒）；最长 30 秒；480P-4K |

### 视频生成 FileInfos 规则

- 首帧：`Usage=FirstFrame`；尾帧：`Usage=LastFrame`（直接放入 FileInfos，推荐方式）
- 参考帧模式（多图/视频/音频）时，每个素材传 `Usage=Reference`
- 支持首尾帧的模式下，首帧与尾帧各 1 张；上传多张参考图时自动切换为参考生模式
- Vidu q2 多图：最多 7 张；Vidu q3-drama：最多 14 张；Wan 多图：最多 10 张；H3 多图：最多 9 张；H2 多图：最多 9 张
- Kling/Vidu 固定主体可通过「高级选项 → 固定主体 ID」传入（`SubjectInfos`）
- 模型特殊参数（智能分镜、音色、有状态编辑、视频再生成等）通过「高级选项 → 扩展参数 ExtInfo」传入
- 图片格式：JPEG / PNG / WEBP，≤10MB；视频 ≤100MB；音频 ≤15MB

---

## 支持的图片生成模型

| 模型 | 版本 | 默认版本 | 分辨率 | 最大参考图 | 支持宽高比 |
|------|------|---------|--------|-----------|----------|
| GEM (Gemini) | 2.5 (nano banana) / 3.0 (nano banana pro) / 3.1 (nano banana2) / 3.1-lite | 3.1-lite ✦ | 1K / 2K / 4K | 3 张 | 10 种比例 |
| Qwen (千问) | 0925 | 0925 ✦ | — | 1 张 | 不支持 |
| Seedream (豆包) | 5.0-lite / 4.5 | 5.0-lite ✦ | — | 1 张 | 不支持 |
| SI (豆包) | 5.0-pro / 5.0-lite / 4.5 / layer-5.0-pro | 5.0-pro ✦ | 1K / 2K / 4K（5.0-pro） | 1 张 | 不支持 |
| Kling (可灵) | 3.0-Omni / 3.0 / 2.1 / O1 / scene | 3.0-Omni ✦ | 1K / 2K | 1 张 | 8 种比例 |
| Vidu | q2 | q2 ✦ | 1080P / 2K / 4K | 7 张 | 8 种比例 |
| Jimeng (即梦) | 4.0 | 4.0 ✦ | — | 1 张 | 7 种比例 |
| Hunyuan (混元) | 3.0 / 3d_2.0 / 3.5-preview | 3.0 ✦ | 720P-4K（3.0） | 1 张 | 8 种比例（3.0） |
| MJ (Midjourney) | v8.2 / v8.1 / niji_7 / v7 | v8.2 ✦ | 参数由 Prompt 指定 | 1 张 | 参数由 Prompt 指定（--ar） |
| GPT-Image (OG) | image2.5_sunburst_* / image2.5_flare_* / image2_low / image2_medium / image2_high | image2.5_flare_medium ✦ | 1K / 2K / 4K | 16 张 | 9 种比例 |
| Mingmou (明眸) | 1.0 | 1.0 ✦ | — | 1 张 | 不支持 |

### 图片生成能力说明

- Kling / OG 支持一次生成多张（`OutputImageCount`：Kling 1-9，OG 1-8）；OG 支持 `OutputFormat`（png/jpeg）
- Kling `scene` 版本为扩图（SceneType=image_expand），扩图比例通过 ExtInfo 传入
- Hunyuan `3d_2.0` 为 360 全景图（SceneType=3d_panorama，5 元/次）
- OG 支持图片编辑蒙版（第一张参考图 `ReferenceType=mask`）、自定义 size / auto / 透明背景（ExtInfo）
- 参考图为可选项，不传则纯文生图
- GEM 全版本、Vidu q2、OG 支持多张参考图（均支持 webp 格式）

---

## 支持的音频生成模型

| 场景 | 模型 | 版本 | 说明 |
|------|------|------|------|
| 文生音效 / 视频生音效 | Kling | — | 文生音效时长 3-10 秒；视频生音效时长跟随输入视频（3-20 秒，MP4/MOV ≤100MB） |
| 文生音乐 | MiniMaxMusic | 3.0 / 2.6 / 2.5 / 2.0 | 歌词通过 AdditionalParameters.lyrics 传入 |
| 文生音乐 | GL (Google Lyria) | 3.0-pro / 3.0-clip | 风格 + 歌词拼接为 Prompt；纯音乐追加 instrumental, no vocals. |

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
│   │   ├── vodService.js        # VOD 视频/图片/音频生成任务
│   │   └── taskBuilder.js       # AIGC 任务参数构建（含单测）
│   ├── test/
│   │   └── taskBuilder.test.js  # 后端任务参数单测（node --test）
│   ├── scripts/
│   │   └── setup-cos-cors.js    # COS CORS 配置脚本
│   ├── server.js                # Express 服务器入口
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── videoModels.js   # 视频模型能力配置 + 参数构建（含单测）
│   │   │   ├── imageModels.js   # 图片模型能力配置 + 参数构建（含单测）
│   │   │   ├── audioModels.js   # 音频模型能力配置 + 参数构建（含单测）
│   │   │   └── __tests__/       # 前端模型能力单测
│   │   ├── components/
│   │   │   ├── VideoGenForm.js  # 视频生成表单（双栏布局）
│   │   │   ├── ImageGenForm.js  # 图片生成表单（双栏布局）
│   │   │   ├── AudioGenForm.js  # 音频生成表单（双栏布局）
│   │   │   └── VideoGenForm.css
│   │   ├── services/
│   │   │   ├── api.js           # 后端 API 封装
│   │   │   └── cosService.js    # 前端直传 COS
│   │   └── App.js               # Tabs 三 Tab 入口
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

### POST /api/audio/create — 创建音频生成任务

```json
{
  "ModelName": "MiniMaxMusic",
  "ModelVersion": "3.0",
  "SceneType": "music",
  "Prompt": "一首欢乐的歌",
  "AdditionalParameters": "{\"lyrics\": \"大海啊，全是水\"}",
  "OutputConfig": {
    "StorageMode": "Permanent",
    "OutputAudioFormat": "mp3"
  }
}
```

文生音效 / 视频生音效使用 `ModelName=Kling`、`SceneType=sfx`；视频生音效通过 `VideoInfos` 传入参考视频。

### GET /api/audio/status/:taskId — 查询音频任务状态

返回任务当前状态及输出音频 URL。

## 使用流程

### 视频生成
1. 切换到「视频生成」Tab
2. 选择模型及版本
3. 上传首帧/参考素材（可选；支持首尾帧的版本可额外上传尾帧，支持参考生的模型可上传多图/视频/音频）
4. 填写 Prompt 描述
5. 配置分辨率、时长、宽高比、音频等输出参数
6. 如需模型特殊参数（智能分镜、音色、有状态编辑等），在「高级选项 → 扩展参数 ExtInfo」中填写
7. 点击「生成视频」，等待完成后在线播放或下载

### 图片生成
1. 切换到「图片生成」Tab
2. 选择模型及版本
3. 上传参考图（可选，支持多图的模型可上传多张；OG 可开启蒙版模式）
4. 填写 Prompt 描述
5. 配置宽高比、分辨率、生成张数、输出格式等输出参数
6. 点击「生成图片」，等待完成后查看或下载

### 音频生成
1. 切换到「音频生成」Tab
2. 选择生成类型：文生音效 / 视频生音效 / 文生音乐
3. 选择模型（Kling / MiniMaxMusic / GL），视频生音效需上传参考视频
4. 填写音效描述 / 歌曲描述（GL 为风格描述），生音乐可选填歌词
5. 配置时长（文生音效）、输出格式、存储模式
6. 点击「生成音频」，等待完成后试听或下载

## 测试

```bash
# 后端：任务参数构建单测（node --test）
cd backend && npm test

# 前端：模型能力配置与参数构建单测（Jest）
cd frontend && CI=true npx react-scripts test --watchAll=false

# 前端生产构建（同时执行 ESLint 检查）
cd frontend && npm run build
```

## 常见问题

**上传失败 CORS blocked**
运行 `node backend/scripts/setup-cos-cors.js` 配置 COS CORS 规则。

**生成失败（人物审核）**
图片含有人脸被安全策略拦截，尝试使用风景、物品等不含人物的图片，或在高级选项中调整合规检查设置。

**ModelVersion invalid 错误**
确保所选版本与模型匹配，页面下拉列表中的版本均为该模型支持的合法版本。

**Seedance 1.5-pro 不支持 1080P**
该版本最高支持 720P，选择此版本时分辨率选项会自动限制为 720P。

**Pixverse V5.6 的 1080P 不支持 10 秒**
请将时长调整为 5 秒 / 8 秒，或降低分辨率。

**Wan 不支持纯尾帧生成**
万相仅支持首帧、首尾帧生成，请先上传首帧图片（纯尾帧场景可改用 H3-Max）。

**Kling 2.6 有声生成失败**
2.6 版本使用首尾帧时只支持无声模式，请将音频设置为「关闭」。

**模型特殊参数如何传递**
智能分镜（multi_shot）、音色（voice_list）、有状态视频编辑（PreviousTaskId）、视频再生成（RegenSourceTaskId）、扩图比例、自定义 size 等均通过「高级选项 → 扩展参数 ExtInfo」按官方 JSON 格式传入。

**图片生成接口参数错误**
图片生成的 `FileInfos` 不需要传 `Category` / `Usage` 字段（视频生成才需要）。

## 更新日志

### v1.5.0 (2026-09-10)

- **升级腾讯云 SDK 至 4.1.310**: 支持 `CreateAigcAudioTask` 与全部新模型字段
- **新增音频生成 Tab**: 文生音效 / 视频生音效（Kling sfx）、文生音乐（MiniMaxMusic 2.0-3.0、GL 3.0-clip / 3.0-pro）
- **视频模型更新**:
  - Hailuo 新增 H3 / H3-Max / H3_regen：H3 支持多模态参考生（图≤9、视频≤3、音频≤3），H3-Max 支持首尾帧与纯尾帧生视频，H3_regen 支持视频再生成（2K/4K）
  - Wan（万相）3.0 / 3.0-prime：全能参考生（图≤10、视频≤5、音频≤5），最长 30 秒，480P-4K
  - GV 新增 omni（参考图/视频总配额 7，支持 PreviousTaskId 有状态视频编辑）与 3.1-lite
  - Kling 新增 3.0-turbo；O1 支持 3-10 秒自由时长
  - Vidu 新增 q3 / q3-drama / q3-ad，以及数字人（avatar-q2-pro / avatar-q2-turbo）与对口型（lip-sync）
  - Pixverse 新增 lip_sync 对口型；H2 新增 1.1（9 种宽高比）
  - Hunyuan 新增 3d_2.0 3D 世界模型（SceneType=3d_scene）
- **图片模型更新**:
  - OG 新增 image2.5 Sunburst / Flare 共 10 个版本；参考图上限提升至 16 张，支持 OutputImageCount（1-8）、OutputFormat、蒙版模式
  - GEM 新增 3.1-lite；Kling 新增 O1 与 scene（扩图）；Hunyuan 新增 3d_2.0 全景图 / 3.5-preview
  - 新增 MJ（v8.2 / v8.1 / niji_7 / v7，参数由 Prompt 指定）与 SI（5.0-pro / 5.0-lite / 4.5 / layer-5.0-pro）
- **能力增强**: 视频支持参考视频/音频上传与分类校验；尾帧改为 `FileInfos.Usage=LastFrame`（文档推荐方式）；高级选项新增固定主体 ID（SubjectInfos）与扩展参数 ExtInfo 透传；后端透传 OutputImageCount / OutputFormat / SceneType / ExtInfo 等新参数
- **测试**: 新增前端 59 项配置与参数构建单测、后端 5 项任务参数单测

### v1.4.0 (2026-05-04)

- **新增视频模型 H2（快乐马）1.0**: 支持文生、首帧生、参考生（最多 9 张图）；时长 3-15 秒自由输入；分辨率 720P/1080P/2K/4K；宽高比 16:9/9:16/1:1/3:4/4:3；支持音频
- **新增视频模型 Pixverse（爱诗）**: 版本 V5.6（写实通用）/ V6.0（电影级）/ C1（影视特效垂直）；支持首帧生成、音频
- **新增 Vidu q3-mix**: 画面质感强，支持智能切镜，动态效果好；暂不支持主体库
- **Kling 4K 支持**: 3.0 / 3.0-Omni 版本新增 4K 分辨率选项（需联系腾讯云开通）
- **新增图片模型 GPT-Image2（OG）**: 版本 image2_low / image2_medium / image2_high；分辨率 1K/2K/4K；宽高比 9 种；最多 3 张参考图；支持 WEBP 格式
- **FileInfos.N 新增 Usage 字段**: 首帧传 `Usage: "FirstFrame"`，参考帧传 `Usage: "Reference"`（兼容旧版 SDK）

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
