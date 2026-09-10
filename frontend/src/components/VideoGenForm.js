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
import {
  VIDEO_MODEL_CONFIG,
  getVideoVersionCaps,
  getVideoResolutionConfig,
  getVideoDurationConfig,
  getVideoAspectRatioConfig,
  buildVideoOutputConfig,
  buildVideoTaskData,
  parseSubjectInfos,
  parseFileTexts,
  normalizeExtInfo,
} from '../config/videoModels';
import './VideoGenForm.css';

// =====================================================================
// 模型能力配置见 src/config/videoModels.js（依据 VOD AIGC 接入指南）
// =====================================================================

const RequiredMark = () => (
  <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
);

const getFileKind = (file) => {
  if (file.type?.startsWith('image/')) return 'image';
  if (file.type?.startsWith('video/')) return 'video';
  if (file.type?.startsWith('audio/')) return 'audio';
  return null;
};

const VideoGenForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);      // 首帧/参考素材 已上传
  const [fileList, setFileList] = useState([]);                // 首帧/参考素材 antd fileList
  const [lastFrameFile, setLastFrameFile] = useState(null);   // 尾帧 已上传文件
  const [lastFrameFileList, setLastFrameFileList] = useState([]); // 尾帧 antd fileList
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [selectedModel, setSelectedModel] = useState('Hailuo');
  const [selectedVersion, setSelectedVersion] = useState('H3-Max');

  const modelCfg = VIDEO_MODEL_CONFIG[selectedModel] || VIDEO_MODEL_CONFIG.Hailuo;
  const versionCaps = getVideoVersionCaps(selectedModel, selectedVersion);
  const resolutionCfg = getVideoResolutionConfig(selectedModel, selectedVersion);
  const durationCfg = getVideoDurationConfig(selectedModel, selectedVersion);
  const aspectCfg = getVideoAspectRatioConfig(selectedModel, selectedVersion);
  const maxImages = versionCaps.maxImages;
  const maxVideos = versionCaps.maxVideos;
  const maxAudios = versionCaps.maxAudios;
  const maxTotalFiles = maxImages + maxVideos + maxAudios;
  const uploadedImages = uploadedFiles.filter((f) => f.type === 'image').length;
  const uploadedVideos = uploadedFiles.filter((f) => f.type === 'video').length;
  const uploadedAudios = uploadedFiles.filter((f) => f.type === 'audio').length;

  // 当前版本是否支持首尾帧
  const canLastFrame = versionCaps.supportsLastFrame;
  // 当前版本是否支持音频
  const canAudio = versionCaps.supportsAudio ?? modelCfg.supportsAudio;

  // 素材中有视频/音频，或已上传多张图时，不走首尾帧模式
  const hasNonImageFile = uploadedFiles.some((f) => f.type !== 'image');
  const showLastFrame = canLastFrame && uploadedFiles.length <= 1 && !hasNonImageFile;

  // 首尾帧模式下（有尾帧）是否强制无声（如 Kling 2.6）
  const lastFrameNoAudio = canLastFrame && versionCaps.audioWithLastFrame === false && lastFrameFile !== null;

  // 上传单个类型的上限校验
  const beforeUpload = (file) => {
    const kind = getFileKind(file);
    if (!kind) {
      message.error('只能上传图片、视频或音频文件！');
      return Upload.LIST_IGNORE;
    }
    if (kind === 'image') {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type.toLowerCase())) {
        message.error('图片仅支持 JPEG / PNG / WEBP 格式！');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 10) {
        message.error('图片大小不能超过 10MB！');
        return Upload.LIST_IGNORE;
      }
      if (uploadedImages >= maxImages) {
        message.error(`当前模式最多上传 ${maxImages} 张参考图片！`);
        return Upload.LIST_IGNORE;
      }
    }
    if (kind === 'video') {
      if (maxVideos <= 0) {
        message.error('当前模型不支持参考视频！');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 100) {
        message.error('视频大小不能超过 100MB！');
        return Upload.LIST_IGNORE;
      }
      if (uploadedVideos >= maxVideos) {
        message.error(`当前模式最多上传 ${maxVideos} 段参考视频！`);
        return Upload.LIST_IGNORE;
      }
    }
    if (kind === 'audio') {
      if (maxAudios <= 0) {
        message.error('当前模型不支持参考音频！');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 15) {
        message.error('音频大小不能超过 15MB！');
        return Upload.LIST_IGNORE;
      }
      if (uploadedAudios >= maxAudios) {
        message.error(`当前模式最多上传 ${maxAudios} 段参考音频！`);
        return Upload.LIST_IGNORE;
      }
    }
    return true;
  };

  // 尾帧上传前校验（只允许 jpeg/png/webp，最大 10MB，只能 1 张）
  const beforeUploadLastFrame = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('尾帧只能上传图片！');
      return Upload.LIST_IGNORE;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      message.error('尾帧图片仅支持 JPEG / PNG / WEBP 格式！');
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
        type: getFileKind(file) || 'image',
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
    if (!values.prompt || values.prompt.trim() === '') {
      message.warning('请输入 Prompt！');
      return;
    }

    // Kling 2.6 等版本：首尾帧模式仅支持无声
    if (lastFrameNoAudio && values.audioGeneration === 'Enabled') {
      message.error(`Kling ${values.modelVersion} 使用首尾帧时不支持有声模式，请关闭音频！`);
      return;
    }

    // 万相：不支持纯尾帧生成
    if (values.modelName === 'Wan' && lastFrameFile && uploadedFiles.length === 0) {
      message.error('Wan 不支持纯尾帧生成，请先上传首帧图片！');
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

    // Pixverse V5.6：1080P 不支持 10 秒
    if (
      values.modelName === 'Pixverse' &&
      values.modelVersion === 'V5.6' &&
      values.resolution === '1080P' &&
      Number(values.duration) === 10
    ) {
      message.error('Pixverse V5.6 的 1080P 分辨率不支持 10 秒时长！');
      return;
    }

    // SceneType 校验：Kling 数字人场景需要人物图片
    if (values.sceneType === 'avatar_i2v' && !uploadedFiles.some((f) => f.type === 'image')) {
      message.error('数字人场景请上传 1 张人物图片！');
      return;
    }

    let extInfo;
    try {
      extInfo = normalizeExtInfo(values.extInfo);
    } catch (error) {
      message.error(error.message);
      return;
    }

    try {
      setLoading(true);
      message.loading({ content: '正在创建视频生成任务...', key: 'submit' });

      const caps = getVideoVersionCaps(values.modelName, values.modelVersion);
      const supportsAspectRatio = caps.supportsAspectRatio ?? VIDEO_MODEL_CONFIG[values.modelName]?.supportsAspectRatio;
      const supportsAudio = caps.supportsAudio ?? VIDEO_MODEL_CONFIG[values.modelName]?.supportsAudio;
      const outputConfig = buildVideoOutputConfig({
        resolution: values.resolution,
        duration: values.duration,
        aspectRatio: values.aspectRatio,
        storageMode: values.storageMode,
        personGeneration: values.personGeneration,
        inputComplianceCheck: values.inputComplianceCheck,
        outputComplianceCheck: values.outputComplianceCheck,
        audioGeneration: values.audioGeneration,
        enhanceSwitch: values.enhanceSwitch,
        frameInterpolate: values.frameInterpolate,
        offPeak: values.offPeak,
        logoAdd: values.logoAdd,
        supportsAspectRatio,
        supportsAudio,
        audioAlwaysEnabled: caps.audioAlwaysEnabled,
        forceNoAudio: lastFrameNoAudio,
      });

      const taskData = buildVideoTaskData({
        modelName: values.modelName,
        version: values.modelVersion,
        files: uploadedFiles,
        lastFrameFile: showLastFrame ? lastFrameFile : null,
        prompt: values.prompt,
        negativePrompt: values.negativePrompt,
        enhancePrompt: values.enhancePrompt,
        outputConfig,
        inputRegion: values.inputRegion,
        sceneType: values.sceneType,
        extInfo,
        subjectInfos: parseSubjectInfos(values.subjectInfos),
        referenceType: values.referenceType,
        fileTexts: parseFileTexts(values.fileTexts),
      });

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
    setSelectedVersion('H3-Max');
  };

  // 计算某版本的默认表单字段
  const getVersionFormValues = (modelName, version) => {
    const resCfg = getVideoResolutionConfig(modelName, version);
    const durCfg = getVideoDurationConfig(modelName, version);
    const ratioCfg = getVideoAspectRatioConfig(modelName, version);
    return {
      modelVersion: version,
      resolution: resCfg.default,
      duration: durCfg.default,
      aspectRatio: ratioCfg?.default || undefined,
      audioGeneration: 'Disabled',
      sceneType: '',
    };
  };

  // 切换模型时重置相关字段
  const handleModelChange = (value) => {
    setSelectedModel(value);
    const cfg = VIDEO_MODEL_CONFIG[value];
    const newVersion = cfg.defaultVersion;
    setSelectedVersion(newVersion);
    setUploadedFiles([]);
    setFileList([]);
    setLastFrameFile(null);
    setLastFrameFileList([]);
    form.setFieldsValue(getVersionFormValues(value, newVersion));
  };

  // 切换版本时更新相关字段
  const handleVersionChange = (value) => {
    setSelectedVersion(value);
    setLastFrameFile(null);
    setLastFrameFileList([]);
    form.setFieldsValue(getVersionFormValues(selectedModel, value));
  };

  // 上传区提示
  const uploadHint = (() => {
    if (showLastFrame) return '首帧图片：仅 1 张，JPEG/PNG/WEBP，≤10MB';
    const parts = [];
    if (maxImages > 0) parts.push(`图片 ≤${maxImages} 张`);
    if (maxVideos > 0) parts.push(`参考视频 ≤${maxVideos} 段（≤100MB）`);
    if (maxAudios > 0) parts.push(`参考音频 ≤${maxAudios} 段（≤15MB，不能单独输入）`);
    if (parts.length === 0) return '当前模型不支持素材输入';
    return `参考素材：${parts.join('，')}，JPEG/PNG/WEBP`;
  })();

  const acceptTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    ...(maxVideos > 0 ? ['video/*'] : []),
    ...(maxAudios > 0 ? ['audio/*'] : []),
  ].join(',');

  const canAddMoreFiles = uploadedImages < maxImages || uploadedVideos < maxVideos || uploadedAudios < maxAudios;

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
            modelVersion: 'H3-Max',
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
            enhanceSwitch: '',
            frameInterpolate: '',
            offPeak: '',
            logoAdd: '',
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
                    {Object.entries(VIDEO_MODEL_CONFIG).map(([key, { label }]) => (
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
              {modelCfg.supportsImageInput && maxTotalFiles > 0 ? (
                <>
                  {/* 首帧 / 主素材 */}
                  <Form.Item
                    label={
                      <span>
                        {showLastFrame ? '首帧' : '参考文件'} &nbsp;
                        <Tooltip title={uploadHint}>
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
                      accept={acceptTypes}
                      multiple={maxTotalFiles > 1}
                    >
                      {!canAddMoreFiles ? null : (
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8, fontSize: 13 }}>上传文件</div>
                        </div>
                      )}
                    </Upload>
                    <div className="upload-hint">
                      已上传 {uploadedFiles.length} 个文件
                      {maxImages > 0 && <span>（图片 {uploadedImages}/{maxImages}</span>}
                      {maxVideos > 0 && <span>，视频 {uploadedVideos}/{maxVideos}</span>}
                      {maxAudios > 0 && <span>，音频 {uploadedAudios}/{maxAudios}</span>}
                      {maxImages > 0 && <span>）</span>}
                      ，直传 COS
                    </div>
                    {canLastFrame && uploadedFiles.length > 1 && (
                      <div className="upload-warn">⚠ 已上传多张参考图：当前按参考生模式提交，首尾帧不可用</div>
                    )}
                    {lastFrameNoAudio && (
                      <div className="upload-warn">⚠ Kling {selectedVersion} 首尾帧模式：仅支持无声</div>
                    )}
                  </Form.Item>

                  {/* 尾帧（仅首尾帧支持版本且非多素材模式） */}
                  {showLastFrame && (
                    <Form.Item
                      label={
                        <span>
                          尾帧&nbsp;
                          <Tooltip title="尾帧图片：仅 1 张，JPEG/PNG/WEBP，≤10MB；通过 FileInfos.Usage=LastFrame 传入">
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
                        accept="image/jpeg,image/jpg,image/png,image/webp"
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
                        {lastFrameFile ? '尾帧已上传' : '可选；仅上传尾帧时按纯尾帧生视频提交'}
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
                <Input.TextArea rows={5} placeholder="请详细描述您想要生成的视频内容..." maxLength={2000} showCount />
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
                  {resolutionCfg.options.map((r) => (
                    <Radio.Button key={r} value={r}>
                      {r}{r === resolutionCfg.default ? ' ✦' : ''}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              {/* 视频时长 */}
              {(durationCfg.options?.length > 0 || durationCfg.freeInput) && (
                <Form.Item
                  label={
                    <span>
                      时长（秒）&nbsp;
                      <Tooltip title={durationCfg.note || `可选值: ${durationCfg.options?.join('、') || `${durationCfg.min}-${durationCfg.max}`} 秒`}>
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="duration"
                  style={{ marginBottom: 16 }}
                >
                  {durationCfg.freeInput ? (
                    <InputNumber
                      min={durationCfg.min}
                      max={durationCfg.max}
                      step={1}
                      style={{ width: 120 }}
                      addonAfter="秒"
                    />
                  ) : (
                    <Radio.Group>
                      {durationCfg.options.map((d) => (
                        <Radio.Button key={d} value={d}>
                          {d}s{d === durationCfg.default ? ' ✦' : ''}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  )}
                </Form.Item>
              )}

              {/* 宽高比 */}
              {aspectCfg && (
                <Form.Item
                  label={
                    <span>
                      宽高比&nbsp;
                      {aspectCfg.note && (
                        <Tooltip title={aspectCfg.note}>
                          <QuestionCircleOutlined style={{ color: '#ccc' }} />
                        </Tooltip>
                      )}
                    </span>
                  }
                  name="aspectRatio"
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Group>
                    {aspectCfg.options.map((r) => (
                      <Radio.Button key={r} value={r}>
                        {r}{r === aspectCfg.default ? ' ✦' : ''}
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
                      {lastFrameNoAudio && (
                        <Tooltip title={`Kling ${selectedVersion} 使用首尾帧时仅支持无声模式`}>
                          <QuestionCircleOutlined style={{ color: '#fa8c16' }} />
                        </Tooltip>
                      )}
                    </span>
                  }
                  name="audioGeneration"
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Group disabled={lastFrameNoAudio}>
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
                            超分输出&nbsp;
                            <Tooltip title="选择 2K/4K 时默认开启超分；1080P 开启后可让模型直出 720P 再超分到 1080P">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="enhanceSwitch"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="">默认</Radio.Button>
                          <Radio.Button value="Enabled">开启</Radio.Button>
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            智能插帧&nbsp;
                            <Tooltip title="Vidu 智能插帧（FrameInterpolate）">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="frameInterpolate"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="">默认</Radio.Button>
                          <Radio.Button value="Enabled">开启</Radio.Button>
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            错峰模式&nbsp;
                            <Tooltip title="错峰任务（OffPeak），价格更低、耗时更长">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="offPeak"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="">默认</Radio.Button>
                          <Radio.Button value="Enabled">开启</Radio.Button>
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            图标水印&nbsp;
                            <Tooltip title="输出视频是否添加图标水印（LogoAdd）">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="logoAdd"
                      >
                        <Radio.Group size="small">
                          <Radio.Button value="">默认</Radio.Button>
                          <Radio.Button value="Enabled">开启</Radio.Button>
                          <Radio.Button value="Disabled">关闭</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            固定主体 ID&nbsp;
                            <Tooltip title="Kling / Vidu 固定主体，多个用英文逗号分隔；Vidu 可用 id:名称 格式（Prompt 中以 @名称 引用）">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="subjectInfos"
                      >
                        <Input size="small" placeholder="例：858477278396170315,858477602846711835:猫猫" />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            参考类型&nbsp;
                            <Tooltip title="FileInfos.ReferenceType：feature 特征参考视频 / base 待编辑视频（Kling 视频编辑）/ base_video 源视频再生成（H3_regen）/ subject 主体 / background 背景（PixVerse）/ asset 素材 / style 风格（GV）">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="referenceType"
                      >
                        <Select size="small" allowClear placeholder="默认（不传）">
                          <Select.Option value="feature">feature（特征参考视频）</Select.Option>
                          <Select.Option value="base">base（待编辑视频）</Select.Option>
                          <Select.Option value="base_video">base_video（源视频再生成）</Select.Option>
                          <Select.Option value="subject">subject（主体）</Select.Option>
                          <Select.Option value="background">background（背景）</Select.Option>
                          <Select.Option value="asset">asset（素材）</Select.Option>
                          <Select.Option value="style">style（风格）</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            素材命名&nbsp;
                            <Tooltip title="按顺序对应每个参考素材，多个用英文逗号分隔；PixVerse 多主体参考时可在 Prompt 中以 @名称 引用">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="fileTexts"
                      >
                        <Input size="small" placeholder="例：小猫,折扇,耳坠" />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            扩展参数 ExtInfo&nbsp;
                            <Tooltip title="模型特殊参数 JSON，例如：多镜头 multi_shot / 音色 voice_list / 有状态编辑 PreviousTaskId / 视频再生成 RegenSourceTaskId">
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="extInfo"
                      >
                        <Input.TextArea rows={2} size="small" placeholder='例：{"AdditionalParameters":"{\"multi_shot\":true}"}' />
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
