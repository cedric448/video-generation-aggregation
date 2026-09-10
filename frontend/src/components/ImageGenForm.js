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
  Collapse,
  Tooltip,
  InputNumber,
} from 'antd';
import {
  UploadOutlined,
  PictureOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  CloudOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { createAigcImageTask, queryImageTaskStatus } from '../services/api';
import { uploadFileToCOS } from '../services/cosService';
import {
  IMAGE_MODEL_CONFIG,
  getImageVersionCaps,
  getImageResolutionConfig,
  getImageAspectRatioConfig,
  buildImageOutputConfig,
  buildImageTaskData,
} from '../config/imageModels';
import { normalizeExtInfo } from '../config/videoModels';
import './VideoGenForm.css';

// =====================================================================
// 图片生成模型配置见 src/config/imageModels.js（依据 VOD AIGC 接入指南）
// =====================================================================

const RequiredMark = () => (
  <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
);

const ImageGenForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [selectedModel, setSelectedModel] = useState('GEM');
  const [selectedVersion, setSelectedVersion] = useState('3.1-lite');
  const [maskMode, setMaskMode] = useState(false);

  const modelCfg = IMAGE_MODEL_CONFIG[selectedModel] || IMAGE_MODEL_CONFIG.GEM;
  const vCap = getImageVersionCaps(selectedModel, selectedVersion);
  const maxImages = vCap.maxImages || 1;
  const resolutionCfg = getImageResolutionConfig(selectedModel, selectedVersion);
  const aspectCfg = getImageAspectRatioConfig(selectedModel, selectedVersion);
  const outputImageCountCfg = vCap.outputImageCount;
  const supportsMask = !!vCap.supportsMask;

  // 允许的图片格式（默认 jpeg/png，部分模型加 webp）
  const allowedFormats = vCap.allowedFormats || ['jpeg', 'jpg', 'png'];
  const acceptAttr = allowedFormats.map((f) => `image/${f}`).join(',');

  // 上传前校验
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return Upload.LIST_IGNORE;
    }
    const mimeType = file.type.toLowerCase().replace('image/', '');
    if (!allowedFormats.includes(mimeType)) {
      message.error(`当前模型仅支持 ${allowedFormats.join(' / ').toUpperCase()} 格式图片！`);
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > 10) {
      message.error('图片大小不能超过 10MB！');
      return Upload.LIST_IGNORE;
    }
    if (uploadedFiles.length >= maxImages) {
      message.error(`当前模型最多上传 ${maxImages} 张参考图！`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // COS 直传
  const handleUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    try {
      setLoading(true);
      message.loading({ content: '正在上传图片到腾讯云 COS...', key: 'img-upload' });

      const result = await uploadFileToCOS(file, (p) => {
        onProgress({ percent: p.percent });
      });

      message.success({ content: '图片上传成功！', key: 'img-upload' });

      const uploaded = {
        uid: file.uid,
        name: file.name,
        url: result.url,
        key: result.key,
        status: 'done',
      };
      setUploadedFiles((prev) => [...prev, uploaded]);
      onSuccess(result);
    } catch (error) {
      console.error('图片上传失败:', error);
      message.error({ content: `上传失败: ${error.message}`, key: 'img-upload' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (file) => {
    setUploadedFiles((prev) => prev.filter((f) => f.uid !== file.uid));
    return true;
  };

  const handleFileListChange = ({ fileList: newList }) => {
    setFileList(newList);
  };

  // 轮询任务状态
  const startPolling = (tid) => {
    const interval = setInterval(async () => {
      try {
        const status = await queryImageTaskStatus(tid);
        setTaskStatus(status);
        if (status.Status === 'FINISH') {
          clearInterval(interval);
          setPollingInterval(null);
          message.success('图片生成成功！');
        } else if (status.Status === 'FAIL') {
          clearInterval(interval);
          setPollingInterval(null);
          message.error('图片生成失败！');
        }
      } catch (error) {
        console.error('查询图片任务状态失败:', error);
      }
    }, 5000);
    setPollingInterval(interval);
  };

  // 提交
  const handleSubmit = async (values) => {
    if (!values.prompt || values.prompt.trim() === '') {
      message.warning('请输入 Prompt！');
      return;
    }
    if (maskMode && uploadedFiles.length === 0) {
      message.error('蒙版模式需要先上传图片（第一张作为蒙版）！');
      return;
    }
    if (maskMode && uploadedFiles.length < 2) {
      message.error('蒙版模式建议上传 2 张图：第一张为蒙版，第二张为待编辑原图！');
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
      message.loading({ content: '正在创建图片生成任务...', key: 'img-submit' });

      const caps = getImageVersionCaps(values.modelName, values.modelVersion);
      const outputConfig = buildImageOutputConfig({
        resolution: values.resolution,
        aspectRatio: values.aspectRatio,
        storageMode: values.storageMode,
        personGeneration: values.personGeneration,
        inputComplianceCheck: values.inputComplianceCheck,
        outputComplianceCheck: values.outputComplianceCheck,
        outputImageCount: values.outputImageCount,
        outputFormat: values.outputFormat,
        logoAdd: values.logoAdd,
        supportsAspectRatio: caps.supportsAspectRatio,
      });

      const taskData = buildImageTaskData({
        modelName: values.modelName,
        version: values.modelVersion,
        files: uploadedFiles.slice(0, maxImages),
        maskMode: supportsMask && maskMode,
        prompt: values.prompt,
        negativePrompt: values.negativePrompt,
        enhancePrompt: values.enhancePrompt,
        outputConfig,
        inputRegion: values.inputRegion,
        extInfo,
      });

      const result = await createAigcImageTask(taskData);
      message.success({ content: '任务创建成功！', key: 'img-submit' });
      setTaskId(result.TaskId);
      setTaskStatus({ Status: 'PROCESSING' });
      startPolling(result.TaskId);
    } catch (error) {
      message.error({ content: `任务创建失败: ${error.message}`, key: 'img-submit' });
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
    setTaskId(null);
    setTaskStatus(null);
    setMaskMode(false);
    setSelectedModel('GEM');
    setSelectedVersion('3.1-lite');
  };

  const getVersionFormValues = (modelName, version) => {
    const caps = getImageVersionCaps(modelName, version);
    const resCfg = getImageResolutionConfig(modelName, version);
    return {
      modelVersion: version,
      aspectRatio: caps.aspectRatio?.default || undefined,
      resolution: resCfg?.default || undefined,
      outputImageCount: caps.outputImageCount ? 1 : undefined,
      outputFormat: undefined,
    };
  };

  // 切换模型
  const handleModelChange = (value) => {
    setSelectedModel(value);
    const cfg = IMAGE_MODEL_CONFIG[value];
    const newVersion = cfg.defaultVersion;
    setSelectedVersion(newVersion);
    setUploadedFiles([]);
    setFileList([]);
    setMaskMode(false);
    form.setFieldsValue(getVersionFormValues(value, newVersion));
  };

  // 切换版本
  const handleVersionChange = (value) => {
    setSelectedVersion(value);
    setUploadedFiles([]);
    setFileList([]);
    setMaskMode(false);
    form.setFieldsValue(getVersionFormValues(selectedModel, value));
  };

  // 渲染任务状态
  const renderTaskStatus = () => {
    if (!taskStatus) return null;
    const { Status, AigcImageTask } = taskStatus;

    if (Status === 'PROCESSING' || Status === 'WAITING') {
      return (
        <Card className="task-status-card" style={{ marginTop: 24 }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="图片生成中，请耐心等待...">
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <PictureOutlined style={{ fontSize: 64, color: '#4a6cf7', opacity: 0.3 }} />
            </div>
          </Spin>
          <p className="task-id">任务ID: {taskId}</p>
        </Card>
      );
    }

    if (Status === 'FINISH' && AigcImageTask) {
      const isSuccess = AigcImageTask.ErrCode === 0;
      const imageUrls = (AigcImageTask.Output?.FileInfos || []).map((f) => f.FileUrl).filter(Boolean);
      const errorMsg = AigcImageTask.Message || '未知错误';

      if (!isSuccess) {
        return (
          <Card className="task-status-card" style={{ marginTop: 24 }}>
            <Result
              status="error"
              icon={<CloseCircleOutlined />}
              title="图片生成失败"
              subTitle={`任务ID: ${taskId}`}
              extra={[
                <div key="error" style={{ marginTop: 20, textAlign: 'left', maxWidth: 600, margin: '20px auto' }}>
                  <p><strong>错误代码:</strong> {AigcImageTask.ErrCode}</p>
                  <p><strong>错误信息:</strong> {errorMsg}</p>
                </div>,
                <Button key="retry" type="primary" onClick={handleReset}>重新生成</Button>,
              ]}
            />
          </Card>
        );
      }

      return (
        <Card className="task-status-card" style={{ marginTop: 24 }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="图片生成成功！"
            subTitle={`任务ID: ${taskId}`}
            extra={[
              imageUrls.length > 0 && (
                <div key="image" style={{ textAlign: 'center', marginTop: 16 }}>
                  {imageUrls.map((url) => (
                    <div key={url} style={{ marginBottom: 16 }}>
                      <img
                        src={url}
                        alt="生成结果"
                        style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Button type="primary" href={url} target="_blank">
                          查看原图 / 下载
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ),
              <Button key="new" onClick={handleReset} style={{ marginTop: 8 }}>生成新图片</Button>,
            ]}
          />
        </Card>
      );
    }

    if (Status === 'FAIL') {
      const errorMsg = AigcImageTask?.Message || '未知错误';
      return (
        <Card className="task-status-card" style={{ marginTop: 24 }}>
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="图片生成失败"
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
            <PictureOutlined />
            <span>AI 图片生成</span>
          </Space>
        }
        className="form-card"
        extra={
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            Powered by Tencent Cloud VOD
          </span>
        }
      >
        {/* 存储位置备注 */}
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
            modelName: 'GEM',
            modelVersion: '3.1-lite',
            resolution: '1K',
            storageMode: 'Permanent',
            personGeneration: 'AllowAdult',
            inputComplianceCheck: 'Disabled',
            outputComplianceCheck: 'Disabled',
            enhancePrompt: 'Enabled',
            inputRegion: 'Mainland',
            outputImageCount: undefined,
            outputFormat: undefined,
            logoAdd: '',
          }}
        >
          <div className="form-two-col">
            {/* ══ 左栏：模型 + 素材 + Prompt ══ */}
            <div className="form-col-left">
              <div className="section-title">模型配置</div>

              <div className="model-select-row">
                <Form.Item
                  label={<span>模型 <RequiredMark /></span>}
                  name="modelName"
                  rules={[{ required: true, message: '请选择模型！' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Select onChange={handleModelChange}>
                    {Object.entries(IMAGE_MODEL_CONFIG).map(([key, { label }]) => (
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
                        {modelCfg.versionLabels?.[v] || v}
                        {v === modelCfg.defaultVersion ? ' ✦' : ''}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              {vCap.note && (
                <div style={{ padding: '6px 10px', background: '#f6f8fa', borderRadius: 6, color: '#888', fontSize: 12, marginBottom: 12 }}>
                  {vCap.note}
                </div>
              )}

              {/* 参考图上传 */}
              <div className="section-title" style={{ marginTop: 8 }}>参考图（可选）</div>
              <Form.Item
                label={
                  <span>
                    参考图&nbsp;
                    <Tooltip title={(() => {
                      if (maxImages === 1) return '最多 1 张参考图，JPEG/PNG，≤10MB';
                      return `最多 ${maxImages} 张参考图（${allowedFormats.join('/')}），≤10MB`;
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
                  accept={acceptAttr}
                  multiple={maxImages > 1}
                >
                  {fileList.length >= maxImages ? null : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8, fontSize: 13 }}>上传参考图</div>
                    </div>
                  )}
                </Upload>
                <div className="upload-hint">
                  已上传 {uploadedFiles.length} / {maxImages} 张（直传 COS，可选）
                </div>
              </Form.Item>

              {supportsMask && (
                <Form.Item
                  label={
                    <span>
                      图片编辑蒙版&nbsp;
                      <Tooltip title="开启后第一张参考图将作为蒙版（FileInfos.ReferenceType=mask），第二张为待编辑原图">
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  style={{ marginBottom: 12 }}
                >
                  <Radio.Group size="small" value={maskMode} onChange={(e) => setMaskMode(e.target.value)}>
                    <Radio.Button value={false}>关闭</Radio.Button>
                    <Radio.Button value={true}>第一张为蒙版</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}

              {/* Prompt */}
              <div className="section-title" style={{ marginTop: 8 }}>描述内容</div>
              <Form.Item
                label={<span>Prompt <RequiredMark /></span>}
                name="prompt"
                rules={[{ required: true, message: '请输入 Prompt！' }]}
                style={{ marginBottom: 12 }}
              >
                <Input.TextArea rows={5} placeholder="请详细描述您想要生成的图片内容..." maxLength={2000} showCount />
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    负向 Prompt&nbsp;
                    <Tooltip title="描述不希望出现在图片中的内容">
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

            {/* ══ 右栏：输出配置 + 高级选项 ══ */}
            <div className="form-col-right">
              <div className="section-title">输出配置</div>

              {/* 分辨率（部分版本支持） */}
              {resolutionCfg && (
                <Form.Item
                  label={<span>分辨率 <RequiredMark /></span>}
                  name="resolution"
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
              )}

              {/* 宽高比 */}
              {aspectCfg && (
                <Form.Item
                  label={<span>宽高比</span>}
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
              {!aspectCfg && (
                <div style={{ padding: '6px 10px', background: '#f6f8fa', borderRadius: 6, color: '#999', fontSize: 13, marginBottom: 16 }}>
                  当前模型不支持宽高比设置
                </div>
              )}

              {/* 生成图片张数 */}
              {outputImageCountCfg && (
                <Form.Item
                  label={
                    <span>
                      生成张数&nbsp;
                      <Tooltip title={`可选 1-${outputImageCountCfg.max} 张，默认 1 张`}>
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="outputImageCount"
                  style={{ marginBottom: 16 }}
                >
                  <InputNumber min={outputImageCountCfg.min} max={outputImageCountCfg.max} step={1} style={{ width: 120 }} />
                </Form.Item>
              )}

              {/* 输出格式 */}
              {vCap.supportsOutputFormat && (
                <Form.Item
                  label={
                    <span>
                      输出格式&nbsp;
                      <Tooltip title="不指定则跟随模型默认值">
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="outputFormat"
                  style={{ marginBottom: 16 }}
                >
                  <Select allowClear placeholder="默认（跟随模型）" style={{ width: 180 }}>
                    <Select.Option value="png">png</Select.Option>
                    <Select.Option value="jpeg">jpeg</Select.Option>
                  </Select>
                </Form.Item>
              )}

              {/* 高级选项（折叠） */}
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
                            图标水印&nbsp;
                            <Tooltip title="输出图片是否添加图标水印（LogoAdd）">
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
                            扩展参数 ExtInfo&nbsp;
                            <Tooltip
                              title={
                                '模型特殊参数 JSON，例如：{"AdditionalParameters":"{\\"size\\":\\"auto\\"}"}、{"AdditionalParameters":"{\\"background\\":\\"transparent\\"}"}、扩图比例等'
                              }
                            >
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="extInfo"
                      >
                        <Input.TextArea
                          rows={2}
                          size="small"
                          placeholder='例：{"AdditionalParameters":"{\"size\":\"2000x1104\"}"}'
                        />
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

          {/* 提交按钮 */}
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
                生成图片
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

export default ImageGenForm;
