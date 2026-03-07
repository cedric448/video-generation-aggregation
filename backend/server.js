require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const cosService = require('./services/cosService');
const vodService = require('./services/vodService');
const stsService = require('./services/stsService');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 配置 - 允许域名和本地访问
const corsOptions = {
  origin: [
    'http://localhost:9999',
    'http://127.0.0.1:9999',
    'http://cbc.cedricbwang.cloud:9999',
    'https://cbc.cedricbwang.cloud:9999'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建临时上传目录
const uploadDir = path.join(__dirname, 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只支持图片和视频文件格式!'));
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取 COS 临时密钥接口 (用于前端直传)
app.get('/api/sts/credentials', async (req, res) => {
  try {
    console.log('获取 STS 临时密钥');
    
    const credentials = await stsService.getTempCredentials();
    
    res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('获取临时密钥失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取临时密钥失败'
    });
  }
});

// 文件上传接口
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件'
      });
    }

    console.log('开始上传文件到 COS:', req.file.originalname);

    // 上传到 COS
    const cosResult = await cosService.uploadFile(req.file.path, req.file.originalname);

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    console.log('文件上传成功:', cosResult.url);

    res.json({
      success: true,
      data: {
        url: cosResult.url,
        key: cosResult.key
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || '文件上传失败'
    });
  }
});

// 创建视频生成任务
app.post('/api/video/create', async (req, res) => {
  try {
    console.log('创建视频生成任务:', JSON.stringify(req.body, null, 2));

    const taskData = {
      SubAppId: parseInt(process.env.VOD_SUB_APP_ID),
      ModelName: req.body.ModelName,
      ModelVersion: req.body.ModelVersion,
      FileInfos: req.body.FileInfos,
      Prompt: req.body.Prompt,
      EnhancePrompt: req.body.EnhancePrompt || 'Enabled',
      OutputConfig: {
        StorageMode: req.body.OutputConfig?.StorageMode || 'Permanent',
        Resolution: req.body.OutputConfig?.Resolution || '720P',
        PersonGeneration: req.body.OutputConfig?.PersonGeneration || 'AllowAdult',
        InputComplianceCheck: req.body.OutputConfig?.InputComplianceCheck || 'Disabled',
        OutputComplianceCheck: req.body.OutputConfig?.OutputComplianceCheck || 'Disabled'
      },
      InputRegion: req.body.InputRegion || 'Mainland'
    };

    const result = await vodService.createAigcVideoTask(taskData);

    console.log('任务创建成功:', result.TaskId);

    res.json({
      success: true,
      data: {
        taskId: result.TaskId,
        requestId: result.RequestId
      }
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '创建任务失败'
    });
  }
});

// 查询任务状态
app.get('/api/video/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('查询任务状态:', taskId);

    const result = await vodService.queryTaskStatus(taskId);

    console.log('任务状态:', result.Status);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('查询任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '查询任务状态失败'
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  🚀 服务器启动成功!`);
  console.log(`  📡 端口: ${PORT}`);
  console.log(`  🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ⏰ 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`========================================\n`);
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号,正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号,正在关闭服务器...');
  process.exit(0);
});
