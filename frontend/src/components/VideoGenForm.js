import React, { useState } from 'react';
import {
  Form,
  Select,
  Upload,
  Input,
  Button,
  Card,
  message,
  Space,
  Radio,
  Result,
  Spin,
  Progress,
  Collapse,
  Tooltip,
  InputNumber,
} from 'antd';
import {
  UploadOutlined,
  VideoCameraOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  CloudOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { createAigcVideoTask, queryTaskStatus } from '../services/api';
import { uploadFileToCOS } from '../services/cosService';
import './VideoGenForm.css';

// =====================================================================
// 模型能力配置表（基于腾讯云 VOD SDK vod_models.d.ts）
// =====================================================================
const MODEL_CONFIG = {
  Hailuo: {
    label: '海螺 (Hailuo)',
    versions: ['2.3-fast', '2.3', '02'],
    defaultVersion: '2.3-fast',
    supportsImageInput: true,   // 支持图片作为首帧输入
    supportsLastFrame: false,   // 不支持尾帧
    supportsAspectRatio: false, // 不支持宽高比设置
    supportsAudio: false,
    resolution: { options: ['768P', '1080P'], default: '768P' },
    duration: { options: [6, 10], default: 6, unit: '秒' },
  },
  Kling: {
    label: '可灵 (Kling)',
    versions: ['3.0-Omni', '3.0', '2.6', '2.5', '2.1', '2.0', '1.6', 'O1'],
    defaultVersion: '3.0-Omni',
    supportsImageInput: true,
    supportsLastFrame: true,    // 2.6 版仅支持首尾帧（且只能无声）
    supportsAspectRatio: true,
    supportsAudio: true,        // 支持有声/无声（AudioGeneration）
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [5, 10], default: 5, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16', '1:1'], default: '16:9', note: '仅文生视频时可用' },
    sceneTypes: [
      { value: '', label: '默认' },
      { value: 'motion_control', label: '动作控制 (motion_control)' },
      { value: 'avatar_i2v', label: '数字人 (avatar_i2v)' },
      { value: 'lip_sync', label: '对口型 (lip_sync)' },
    ],
    // 版本级别的特殊限制
    versionCapabilities: {
      '2.6': { supportsLastFrame: true, audioWithLastFrame: false }, // 2.6 首尾帧时只能无声
      '3.0': { supportsLastFrame: false },
      '3.0-Omni': { supportsLastFrame: false },
      '2.5': { supportsLastFrame: false },
      '2.1': { supportsLastFrame: true },
      '2.0': { supportsLastFrame: false },
      '1.6': { supportsLastFrame: false },
      'O1': { supportsLastFrame: false },
    },
  },
  Jimeng: {
    label: '即梦 (Jimeng)',
    versions: ['3.0pro'],
    defaultVersion: '3.0pro',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
  },
  Vidu: {
    label: 'Vidu',
    versions: ['q3-pro', 'q2', 'q2-pro', 'q2-turbo'],
    defaultVersion: 'q3-pro',
    supportsImageInput: true,
    supportsLastFrame: true,    // q2-pro / q2-turbo 支持；q3-pro 不支持
    supportsAspectRatio: true,
    supportsAudio: true,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: 5, min: 1, max: 10, unit: '秒', freeInput: true },
    aspectRatio: {
      options: ['16:9', '9:16', '4:3', '3:4', '1:1'],
      default: '16:9',
      note: '4:3 / 3:4 仅 q2 版本支持',
    },
    sceneTypes: [
      { value: '', label: '默认' },
      { value: 'template_effect', label: '特效模板 (template_effect)' },
    ],
    // 版本级别的特殊限制
    versionCapabilities: {
      'q3-pro': { supportsLastFrame: false, supportsMultiImage: false, textAndImageOnly: true },
      'q2': { supportsLastFrame: false, supportsMultiImage: true, maxImages: 7 },
      'q2-pro': { supportsLastFrame: true, supportsMultiImage: false },
      'q2-turbo': { supportsLastFrame: true, supportsMultiImage: false },
    },
  },
  GV: {
    label: 'Google Veo (GV)',
    versions: ['3.1', '3.1-fast'],
    defaultVersion: '3.1-fast',
    supportsImageInput: true,
    supportsLastFrame: true,    // 多图输入时不可使用
    supportsAspectRatio: true,
    supportsAudio: true,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [8], default: 8, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16'], default: '16:9' },
  },
  Hunyuan: {
    label: '混元 (Hunyuan)',
    versions: ['1.5'],
    defaultVersion: '1.5',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
  },
  Mingmou: {
    label: '明眸 (Mingmou)',
    versions: ['1.0'],
    defaultVersion: '1.0',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
  },
  Seedance: {
    label: '豆包 (Seedance)',
    versions: ['1.5-pro', '1.0-pro', '1.0-pro-fast', '1.0-lite-i2v'],
    defaultVersion: '1.5-pro',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: true,        // 仅 1.5-pro 支持有声/无声
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
    // 版本级别的特殊限制
    versionCapabilities: {
      '1.5-pro': { supportsAudio: true, maxResolution: '720P' }, // 不支持 1080P
      '1.0-pro': { supportsAudio: false },
      '1.0-pro-fast': { supportsAudio: false },
      '1.0-lite-i2v': { supportsAudio: false },
    },
  },
  OS: {
    label: 'OpenAI Sora (OS)',
    versions: ['2.0'],
    defaultVersion: '2.0',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: true,
    supportsAudio: false,      // UI 不显示开关；提交时固定 AudioGeneration: 'Enabled'
    audioAlwaysEnabled: true, // OS 始终开启音频
    resolution: { options: ['720P'], default: '720P' },
    duration: { options: [4, 8, 12], default: 8, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16'], default: '16:9', note: '仅文生视频时可用' },
  },
};

// 获取当前版本实际能力（合并模型级 + 版本级覆盖）
const getVersionCaps = (modelName, version) => {
  const modelCfg = MODEL_CONFIG[modelName];
  if (!modelCfg) return {};
  const base = {
    supportsLastFrame: modelCfg.supportsLastFrame,
    supportsAudio: modelCfg.supportsAudio,
  };
  const vCap = modelCfg.versionCapabilities?.[version] || {};
  return { ...base, ...vCap };
};

const RequiredMark = () => (
  <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
);

const VideoGenForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);      // 首帧/多图 已上传
  const [fileList, setFileList] = useState([]);                // 首帧/多图 antd fileList
  const [lastFrameFile, setLastFrameFile] = useState(null);   // 尾帧 已上传文件
  const [lastFrameFileList, setLastFrameFileList] = useState([]); // 尾帧 antd fileList
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [selectedModel, setSelectedModel] = useState('Hailuo');
  const [selectedVersion, setSelectedVersion] = useState('2.3-fast');

  const modelCfg = MODEL_CONFIG[selectedModel] || MODEL_CONFIG.Hailuo;
  const versionCaps = getVersionCaps(selectedModel, selectedVersion);

  // Seedance 1.5-pro 不支持 1080P，动态计算分辨率选项
  const resoliutionOptions = (() => {
    if (selectedModel === 'Seedance') {
      const cap = modelCfg.versionCapabilities?.[selectedVersion];
      if (cap?.maxResolution === '720P') {
        return ['720P'];
      }
    }
    return modelCfg.resolution.options;
  })();

  // 当前版本是否支持首尾帧
  const canLastFrame = versionCaps.supportsLastFrame;
  // 当前版本是否支持音频
  const canAudio = versionCaps.supportsAudio ?? modelCfg.supportsAudio;

  // GV: 多图输入时禁用首尾帧
  const gvMultiImage = selectedModel === 'GV' && uploadedFiles.length > 1;
  const showLastFrame = canLastFrame && !gvMultiImage;

  // Kling 2.6 首尾帧时强制无声（有尾帧上传时才算首尾帧模式）
  const kling26WithLastFrame =
    selectedModel === 'Kling' &&
    selectedVersion === '2.6' &&
    lastFrameFile !== null;

  // 动态计算最大上传数量
  const maxFiles = (() => {
    // 支持首尾帧的模式下，首帧只能 1 张
    if (canLastFrame && !gvMultiImage) return 1;
    // Vidu q2 支持多图，最多 7 张
    if (selectedModel === 'Vidu') {
      const vCap = modelCfg.versionCapabilities?.[selectedVersion];
      if (vCap?.maxImages) return vCap.maxImages;
    }
    // GV 多图最多 3 张
    if (selectedModel === 'GV') return 3;
    // 其他模型默认 1 张
    return 1;
  })();

  // 文件上传前校验（首帧/多图）
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      message.error('只能上传图片或视频文件！');
      return Upload.LIST_IGNORE;
    }
    if (isImage) {
      // 图片限制：仅支持 jpeg/png
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type.toLowerCase())) {
        message.error('图片仅支持 JPEG / PNG 格式！');
        return Upload.LIST_IGNORE;
      }
      // 图片限制：最大 10MB
      if (file.size / 1024 / 1024 > 10) {
        message.error('图片大小不能超过 10MB！');
        return Upload.LIST_IGNORE;
      }
    }
    if (isVideo && file.size / 1024 / 1024 > 100) {
      message.error('视频大小不能超过 100MB！');
      return Upload.LIST_IGNORE;
    }
    // 检查上传数量上限
    if (uploadedFiles.length >= maxFiles) {
      message.error(`当前模式最多上传 ${maxFiles} 个文件！`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // 尾帧上传前校验（只允许 jpeg/png，最大 10MB，只能 1 张）
  const beforeUploadLastFrame = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('尾帧只能上传图片！');
      return Upload.LIST_IGNORE;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type.toLowerCase())) {
      message.error('尾帧图片仅支持 JPEG / PNG 格式！');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > 10) {
      message.error('尾帧图片大小不能超过 10MB！');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // 自定义上传 - 前端直传 COS
  const handleUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    try {
      setLoading(true);
      message.loading({ content: '正在上传文件到腾讯云 COS...', key: 'upload' });

      const result = await uploadFileToCOS(file, (progressData) => {
        onProgress({ percent: progressData.percent });
      });

      message.success({ content: '文件上传成功！', key: 'upload' });

      const uploadedFile = {
        uid: file.uid,
        name: file.name,
        url: result.url,
        key: result.key,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        status: 'done',
      };
      setUploadedFiles((prev) => [...prev, uploadedFile]);
      onSuccess(result);
    } catch (error) {
      console.error('上传失败:', error);
      message.error({ content: `上传失败: ${error.message}`, key: 'upload' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (file) => {
    setUploadedFiles((prev) => prev.filter((f) => f.uid !== file.uid));
    return true;
  };

  const handleFileListChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 尾帧上传
  const handleLastFrameUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    try {
      setLoading(true);
      message.loading({ content: '正在上传尾帧到腾讯云 COS...', key: 'upload-last' });

      const result = await uploadFileToCOS(file, (progressData) => {
        onProgress({ percent: progressData.percent });
      });

      message.success({ content: '尾帧上传成功！', key: 'upload-last' });

      const uploadedFile = {
        uid: file.uid,
        name: file.name,
        url: result.url,
        key: result.key,
        type: 'image',
        status: 'done',
      };
      setLastFrameFile(uploadedFile);
      onSuccess(result);
    } catch (error) {
      console.error('尾帧上传失败:', error);
      message.error({ content: `尾帧上传失败: ${error.message}`, key: 'upload-last' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLastFrame = () => {
    setLastFrameFile(null);
    setLastFrameFileList([]);
    return true;
  };

  const handleLastFrameFileListChange = ({ fileList: newList }) => {
    setLastFrameFileList(newList);
  };

  // 轮询任务状态
  const startPolling = (tid) => {
    const interval = setInterval(async () => {
      try {
        const status = await queryTaskStatus(tid);
        setTaskStatus(status);
        if (status.Status === 'FINISH') {
          clearInterval(interval);
          setPollingInterval(null);
          message.success('视频生成成功！');
        } else if (status.Status === 'FAIL') {
          clearInterval(interval);
          setPollingInterval(null);
          message.error('视频生成失败！');
        }
      } catch (error) {
        console.error('查询任务状态失败:', error);
      }
    }, 5000);
    setPollingInterval(interval);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    const cfg = MODEL_CONFIG[values.modelName];
    const vCap = getVersionCaps(values.modelName, values.modelVersion);

    if (cfg.supportsImageInput && uploadedFiles.length === 0) {
      message.warning('请先上传参考图片或视频！');
      return;
    }
    if (!values.prompt || values.prompt.trim() === '') {
      message.warning('请输入 Prompt！');
      return;
    }

    // Kling 2.6 首尾帧只能无声
    if (
      values.modelName === 'Kling' &&
      values.modelVersion === '2.6' &&
      uploadedFiles.length > 0 &&
      values.audioGeneration === 'Enabled'
    ) {
      message.error('Kling 2.6 使用首尾帧时不支持有声模式，请关闭音频！');
      return;
    }

    // Seedance 1.5-pro 不支持 1080P
    if (
      values.modelName === 'Seedance' &&
      values.modelVersion === '1.5-pro' &&
      values.resolution === '1080P'
    ) {
      message.error('Seedance 1.5-pro 不支持 1080P 分辨率！');
      return;
    }

    try {
      setLoading(true);
      message.loading({ content: '正在创建视频生成任务...', key: 'submit' });

      // ── 构建 FileInfos ──
      // 规则：
      //   1. 支持首尾帧时，FileInfos 只放 1 张首帧（尾帧走 LastFrameUrl）
      //   2. Vidu q2 多图：最多 7 张
      //   3. GV 多图：最多 3 张，不传尾帧
      //   4. 其他：最多 1 张，最多 3 张（API 上限）
      let fileInfos = undefined;
      if (cfg.supportsImageInput && uploadedFiles.length > 0) {
        // 取前 maxFiles 张（多传按上限截断）
        const filesToSend = uploadedFiles.slice(0, maxFiles);
        fileInfos = filesToSend.map((f) => ({
          Type: 'Url',
          Url: f.url,
          Category: f.type === 'image' ? 'Image' : 'Video',
        }));
      }

      // 尾帧 URL（仅支持首尾帧且非 GV 多图时使用）
      const lastFrameUrl = (showLastFrame && lastFrameFile) ? lastFrameFile.url : undefined;

      // 构建 OutputConfig
      const outputConfig = {
        StorageMode: values.storageMode || 'Permanent',
        Resolution: values.resolution,
        PersonGeneration: values.personGeneration || 'AllowAdult',
        InputComplianceCheck: values.inputComplianceCheck || 'Disabled',
        OutputComplianceCheck: values.outputComplianceCheck || 'Disabled',
      };
      if (values.duration) outputConfig.Duration = Number(values.duration);
      if (values.aspectRatio && cfg.supportsAspectRatio) outputConfig.AspectRatio = values.aspectRatio;

      // 音频：OS 固定 Enabled；其他只有当前版本支持音频时才传
      const versionSupportsAudio = vCap.supportsAudio ?? cfg.supportsAudio;
      // Kling 2.6 + 首尾帧时强制无声
      const forceNoAudio =
        values.modelName === 'Kling' &&
        values.modelVersion === '2.6' &&
        uploadedFiles.length > 0;
      if (cfg.audioAlwaysEnabled) {
        outputConfig.AudioGeneration = 'Enabled';
      } else if (versionSupportsAudio && !forceNoAudio && values.audioGeneration) {
        outputConfig.AudioGeneration = values.audioGeneration;
      }

      if (values.enhanceSwitch) outputConfig.EnhanceSwitch = values.enhanceSwitch;

      const taskData = {
        ModelName: values.modelName,
        ModelVersion: values.modelVersion,
        ...(fileInfos ? { FileInfos: fileInfos } : {}),
        ...(lastFrameUrl ? { LastFrameUrl: lastFrameUrl } : {}),
        Prompt: values.prompt,
        ...(values.negativePrompt ? { NegativePrompt: values.negativePrompt } : {}),
        EnhancePrompt: values.enhancePrompt || 'Enabled',
        OutputConfig: outputConfig,
        InputRegion: values.inputRegion || 'Mainland',
        ...(values.sceneType ? { SceneType: values.sceneType } : {}),
      };

      const result = await createAigcVideoTask(taskData);
      message.success({ content: '任务创建成功！', key: 'submit' });
      setTaskId(result.TaskId);
      setTaskStatus({ Status: 'PROCESSING', Progress: 0 });
      startPolling(result.TaskId);
    } catch (error) {
      message.error({ content: `任务创建失败: ${error.message}`, key: 'submit' });
    } finally {
      setLoading(false);
    }
  };

  // 重置
  const handleReset = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    form.resetFields();
    setUploadedFiles([]);
    setFileList([]);
    setLastFrameFile(null);
    setLastFrameFileList([]);
    setTaskId(null);
    setTaskStatus(null);
    setSelectedModel('Hailuo');
    setSelectedVersion('2.3-fast');
  };

  // 切换模型时重置相关字段
  const handleModelChange = (value) => {
    setSelectedModel(value);
    const cfg = MODEL_CONFIG[value];
    const newVersion = cfg.defaultVersion;
    setSelectedVersion(newVersion);
    setUploadedFiles([]);
    setFileList([]);
    setLastFrameFile(null);
    setLastFrameFileList([]);

    // 计算默认分辨率（Seedance 1.5-pro 不支持 1080P）
    let defaultResolution = cfg.resolution.default;
    if (value === 'Seedance') {
      const vCap = cfg.versionCapabilities?.[newVersion];
      if (vCap?.maxResolution === '720P') defaultResolution = '720P';
    }

    form.setFieldsValue({
      modelVersion: newVersion,
      resolution: defaultResolution,
      duration: cfg.duration.default,
      aspectRatio: cfg.aspectRatio?.default || undefined,
      audioGeneration: 'Disabled',
      sceneType: '',
    });
  };

  // 切换版本时更新相关字段
  const handleVersionChange = (value) => {
    setSelectedVersion(value);
    // 版本切换时清空尾帧
    setLastFrameFile(null);
    setLastFrameFileList([]);

    // Seedance 1.5-pro 不支持 1080P，切换到 1.5-pro 时自动降分辨率
    if (selectedModel === 'Seedance') {
      const cap = modelCfg.versionCapabilities?.[value];
      if (cap?.maxResolution === '720P') {
        form.setFieldsValue({ resolution: '720P' });
      }
    }

    // Kling: 不支持首尾帧的版本，若已选有声则不影响（首尾帧 UI 动态隐藏）
    // 版本切换时重置音频为 Disabled
    form.setFieldsValue({ audioGeneration: 'Disabled' });
  };

  // 渲染任务状态
  const renderTaskStatus = () => {
    if (!taskStatus) return null;
    const { Status, Progress: progressPercent = 0, AigcVideoTask } = taskStatus;

    if (Status === 'PROCESSING' || Status === 'WAITING') {
      return (
        <Card className="task-status-card">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="视频生成中，请耐心等待...">
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Progress type="circle" percent={progressPercent} status="active" />
            </div>
          </Spin>
          <p className="task-id">任务ID: {taskId}</p>
        </Card>
      );
    }

    if (Status === 'FINISH' && AigcVideoTask) {
      const isSuccess = AigcVideoTask.ErrCode === 0;
      const videoUrl = AigcVideoTask.Output?.FileInfos?.[0]?.FileUrl;
      const errorMsg = AigcVideoTask.Message || '未知错误';

      if (!isSuccess) {
        return (
          <Card className="task-status-card">
            <Result
              status="error"
              icon={<CloseCircleOutlined />}
              title="视频生成失败"
              subTitle={`任务ID: ${taskId}`}
              extra={[
                <div key="error" style={{ marginTop: 20, textAlign: 'left', maxWidth: 600, margin: '20px auto' }}>
                  <p><strong>错误代码:</strong> {AigcVideoTask.ErrCode}</p>
                  <p><strong>错误信息:</strong> {errorMsg}</p>
                </div>,
                <Button key="retry" type="primary" onClick={handleReset}>重新生成</Button>,
              ]}
            />
          </Card>
        );
      }

      return (
        <Card className="task-status-card">
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="视频生成成功！"
            subTitle={`任务ID: ${taskId}`}
            extra={[
              videoUrl && (
                <div key="video" className="video-result">
                  <video controls style={{ width: '100%', maxWidth: 600, marginTop: 20 }} src={videoUrl}>
                    您的浏览器不支持视频播放
                  </video>
                  <Button type="primary" href={videoUrl} target="_blank" style={{ marginTop: 16 }}>
                    下载视频
                  </Button>
                </div>
              ),
              <Button key="new" onClick={handleReset}>生成新视频</Button>,
            ]}
          />
        </Card>
      );
    }

    if (Status === 'FAIL') {
      const errorMsg = AigcVideoTask?.Message || '未知错误';
      return (
        <Card className="task-status-card">
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="视频生成失败"
            subTitle={`错误信息: ${errorMsg}`}
            extra={[<Button key="retry" type="primary" onClick={handleReset}>重新尝试</Button>]}
          />
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="video-gen-form-container">
      <Card
        title={
          <Space>
            <VideoCameraOutlined />
            <span>AI 视频生成</span>
          </Space>
        }
        className="form-card"
        extra={
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            Powered by Tencent Cloud VOD
          </span>
        }
      >
        {/* ── 存储位置备注 ── */}
        <div className="storage-info-bar">
          <div className="info-item">
            <CloudOutlined style={{ color: '#4a6cf7' }} />
            <span className="info-label">Input：</span>
            <code>videogen-1258272081.cos.ap-hongkong</code>
          </div>
          <div className="info-item">
            <DatabaseOutlined style={{ color: '#764ba2' }} />
            <span className="info-label">Output：</span>
            <span>云点播 · cedricbwang 应用</span>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            modelName: 'Hailuo',
            modelVersion: '2.3-fast',
            resolution: '768P',
            duration: 6,
            storageMode: 'Permanent',
            personGeneration: 'AllowAdult',
            inputComplianceCheck: 'Disabled',
            outputComplianceCheck: 'Disabled',
            enhancePrompt: 'Enabled',
            inputRegion: 'Mainland',
            audioGeneration: 'Disabled',
            sceneType: '',
          }}
        >
          <div className="form-two-col">
            {/* ══════════════════════════════════
                左栏：模型 + 素材 + Prompt
                ══════════════════════════════════ */}
            <div className="form-col-left">
              <div className="section-title">模型配置</div>

              {/* 模型 + 版本 横排 */}
              <div className="model-select-row">
                <Form.Item
                  label={<span>模型 <RequiredMark /></span>}
                  name="modelName"
                  rules={[{ required: true, message: '请选择模型！' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Select onChange={handleModelChange}>
                    {Object.entries(MODEL_CONFIG).map(([key, { label }]) => (
                      <Select.Option key={key} value={key}>{label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label={<span>版本 <RequiredMark /></span>}
                  name="modelVersion"
                  rules={[{ required: true, message: '请选择版本！' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Select onChange={handleVersionChange}>
                    {modelCfg.versions.map((v) => (
                      <Select.Option key={v} value={v}>
                        {v}{v === modelCfg.defaultVersion ? ' ✦' : ''}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              {/* 场景类型 */}
              {modelCfg.sceneTypes && (
                <Form.Item
                  label={
                    <span>
                      场景类型&nbsp;
                      <Tooltip title="仅特定模型支持，选默认则不传该参数">
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="sceneType"
                  style={{ marginBottom: 16 }}
                >
                  <Select>
                    {modelCfg.sceneTypes.map((s) => (
                      <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {/* 文件上传 */}
              <div className="section-title" style={{ marginTop: 8 }}>素材上传</div>
              {modelCfg.supportsImageInput ? (
                <>
                  {/* 首帧 / 主素材 */}
                  <Form.Item
                    label={
                      <span>
                        {showLastFrame ? '首帧' : '参考文件'} <RequiredMark />&nbsp;
                        <Tooltip title={(() => {
                          if (showLastFrame) return '首帧图片：仅 1 张，JPEG/PNG，≤10MB';
                          if (selectedModel === 'Vidu') {
                            const vCap = modelCfg.versionCapabilities?.[selectedVersion];
                            if (vCap?.textAndImageOnly) return 'q3-pro 支持文生和图生（单图），JPEG/PNG，≤10MB';
                            if (vCap?.maxImages) return `q2 支持多图参考（1-${vCap.maxImages} 张），JPEG/PNG，≤10MB`;
                          }
                          if (selectedModel === 'GV') return `最多 ${maxFiles} 张，多图时首尾帧不可用，JPEG/PNG，≤10MB`;
                          return 'JPEG/PNG 图片（≤10MB）或视频（≤100MB），最多 1 张';
                        })()}>
                          <QuestionCircleOutlined style={{ color: '#ccc' }} />
                        </Tooltip>
                      </span>
                    }
                    style={{ marginBottom: 8 }}
                  >
                    <Upload
                      listType="picture-card"
                      fileList={fileList}
                      beforeUpload={beforeUpload}
                      customRequest={handleUpload}
                      onRemove={handleRemoveFile}
                      onChange={handleFileListChange}
                      accept="image/jpeg,image/jpg,image/png,video/*"
                      multiple={maxFiles > 1}
                    >
                      {fileList.length >= maxFiles ? null : (
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8, fontSize: 13 }}>上传文件</div>
                        </div>
                      )}
                    </Upload>
                    <div className="upload-hint">
                      已上传 {uploadedFiles.length} / {maxFiles} 个文件（直传 COS）
                      {maxFiles > 1 && <span>，最多 {maxFiles} 张</span>}
                    </div>
                    {gvMultiImage && (
                      <div className="upload-warn">⚠ GV 多图模式：首尾帧不可用</div>
                    )}
                    {kling26WithLastFrame && (
                      <div className="upload-warn">⚠ Kling 2.6 首尾帧模式：仅支持无声</div>
                    )}
                  </Form.Item>

                  {/* 尾帧（仅首尾帧支持版本且非 GV 多图） */}
                  {showLastFrame && (
                    <Form.Item
                      label={
                        <span>
                          尾帧&nbsp;
                          <Tooltip title="尾帧图片：仅 1 张，JPEG/PNG，≤10MB；通过 LastFrameUrl 传入">
                            <QuestionCircleOutlined style={{ color: '#ccc' }} />
                          </Tooltip>
                        </span>
                      }
                      style={{ marginBottom: 8 }}
                    >
                      <Upload
                        listType="picture-card"
                        fileList={lastFrameFileList}
                        beforeUpload={beforeUploadLastFrame}
                        customRequest={handleLastFrameUpload}
                        onRemove={handleRemoveLastFrame}
                        onChange={handleLastFrameFileListChange}
                        accept="image/jpeg,image/jpg,image/png"
                        multiple={false}
                      >
                        {lastFrameFileList.length >= 1 ? null : (
                          <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8, fontSize: 13 }}>上传尾帧</div>
                          </div>
                        )}
                      </Upload>
                      <div className="upload-hint">
                        {lastFrameFile ? '尾帧已上传' : '可选，不上传则仅使用首帧'}
                      </div>
                    </Form.Item>
                  )}
                </>
              ) : (
                <div style={{ padding: '8px 12px', background: '#f6f8fa', borderRadius: 6, color: '#888', fontSize: 13, marginBottom: 16 }}>
                  当前模型仅支持 <strong>文生视频</strong>，直接填写 Prompt 即可。
                </div>
              )}

              {/* Prompt */}
              <div className="section-title" style={{ marginTop: 8 }}>描述内容</div>
              <Form.Item
                label={<span>Prompt <RequiredMark /></span>}
                name="prompt"
                rules={[{ required: true, message: '请输入 Prompt！' }]}
                style={{ marginBottom: 12 }}
              >
                <Input.TextArea rows={5} placeholder="请详细描述您想要生成的视频内容..." maxLength={500} showCount />
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    负向 Prompt&nbsp;
                    <Tooltip title="描述不希望出现在视频中的内容">
                      <QuestionCircleOutlined style={{ color: '#ccc' }} />
                    </Tooltip>
                  </span>
                }
                name="negativePrompt"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="可选：描述不希望出现的内容" maxLength={200} />
              </Form.Item>
            </div>

            {/* ══════════════════════════════════
                右栏：输出配置 + 高级选项
                ══════════════════════════════════ */}
            <div className="form-col-right">
              <div className="section-title">输出配置</div>

              {/* 分辨率 */}
              <Form.Item
                label={<span>分辨率 <RequiredMark /></span>}
                name="resolution"
                rules={[{ required: true }]}
                style={{ marginBottom: 16 }}
              >
                <Radio.Group>
                  {resoliutionOptions.map((r) => (
                    <Radio.Button key={r} value={r}>
                      {r}{r === modelCfg.resolution.default ? ' ✦' : ''}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              {/* 视频时长 */}
              {(modelCfg.duration.options?.length > 0 || modelCfg.duration.freeInput) && (
                <Form.Item
                  label={
                    <span>
                      时长（秒）&nbsp;
                      <Tooltip title={modelCfg.duration.note || `可选值: ${modelCfg.duration.options?.join('、') || `${modelCfg.duration.min}-${modelCfg.duration.max}`} 秒`}>
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="duration"
                  style={{ marginBottom: 16 }}
                >
                  {modelCfg.duration.freeInput ? (
                    <InputNumber
                      min={modelCfg.duration.min}
                      max={modelCfg.duration.max}
                      step={1}
                      style={{ width: 120 }}
                      addonAfter="秒"
                    />
                  ) : (
                    <Radio.Group>
                      {modelCfg.duration.options.map((d) => (
                        <Radio.Button key={d} value={d}>
                          {d}s{d === modelCfg.duration.default ? ' ✦' : ''}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  )}
                </Form.Item>
              )}

              {/* 宽高比 */}
              {modelCfg.supportsAspectRatio && modelCfg.aspectRatio && (
                <Form.Item
                  label={
                    <span>
                      宽高比&nbsp;
                      {modelCfg.aspectRatio.note && (
                        <Tooltip title={modelCfg.aspectRatio.note}>
                          <QuestionCircleOutlined style={{ color: '#ccc' }} />
                        </Tooltip>
                      )}
                    </span>
                  }
                  name="aspectRatio"
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Group>
                    {modelCfg.aspectRatio.options.map((r) => (
                      <Radio.Button key={r} value={r}>
                        {r}{r === modelCfg.aspectRatio.default ? ' ✦' : ''}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>
              )}

              {/* 音频 */}
              {canAudio && (
                <Form.Item
                  label={
                    <span>
                      生成音频&nbsp;
                      {kling26WithLastFrame && (
                        <Tooltip title="Kling 2.6 使用首尾帧时仅支持无声模式">
                          <QuestionCircleOutlined style={{ color: '#fa8c16' }} />
                        </Tooltip>
                      )}
                    </span>
                  }
                  name="audioGeneration"
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Group disabled={kling26WithLastFrame}>
                    <Radio.Button value="Disabled">关闭</Radio.Button>
                    <Radio.Button value="Enabled">开启</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}

              {/* ── 高级选项（折叠） ── */}
              <Collapse
                className="advanced-collapse"
                ghost
                items={[{
                  key: 'advanced',
                  label: (
                    <span style={{ fontSize: 13, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <SettingOutlined />
                      高级选项
                    </span>
                  ),
                  children: (
                    <div className="advanced-form-items">
                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            Prompt 自动优化&nbsp;
                            <Tooltip title="开启后将自动优化 Prompt 以提升生成质量">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="enhancePrompt"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="Enabled">开启</Radio.Button>
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            存储模式&nbsp;
                            <Tooltip title="Permanent：永久存储到云点播；Temporary：临时 URL，不保存">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="storageMode"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="Permanent">永久</Radio.Button>
                          <Radio.Button value="Temporary">临时</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={<span style={{ fontSize: 13, color: '#666' }}>人物生成</span>}
                        name="personGeneration"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="AllowAdult">允许成人</Radio.Button>
                          <Radio.Button value="Disallowed">禁止</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={<span style={{ fontSize: 13, color: '#666' }}>输入合规检查</span>}
                        name="inputComplianceCheck"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                          <Radio.Button value="Enabled">开启</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={<span style={{ fontSize: 13, color: '#666' }}>输出合规检查</span>}
                        name="outputComplianceCheck"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                          <Radio.Button value="Enabled">开启</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            输入文件区域&nbsp;
                            <Tooltip title="文件 URL 在境外时选 Oversea，默认 Mainland">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="inputRegion"
                        style={{ marginBottom: 0 }}
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="Mainland">境内</Radio.Button>
                          <Radio.Button value="Oversea">境外</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                    </div>
                  ),
                }]}
              />
            </div>
          </div>

          {/* ── 提交按钮 ── */}
          <Form.Item className="form-actions" style={{ marginBottom: 0 }}>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="form-submit-btn"
                disabled={!!taskStatus && taskStatus.Status === 'PROCESSING'}
              >
                生成视频
              </Button>
              <Button onClick={handleReset} size="large" className="form-reset-btn" disabled={loading}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {renderTaskStatus()}
    </div>
  );
};

export default VideoGenForm;
