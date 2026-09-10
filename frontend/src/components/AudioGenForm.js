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
  CustomerServiceOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  CloudOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { createAigcAudioTask, queryAudioTaskStatus } from '../services/api';
import { uploadFileToCOS } from '../services/cosService';
import {
  AUDIO_MODEL_CONFIG,
  AUDIO_SCENES,
  getAudioSceneConfig,
  buildAudioTaskData,
} from '../config/audioModels';
import './VideoGenForm.css';

// =====================================================================
// 音频生成（CreateAigcAudioTask）：
//   文生音效 / 视频生音效（Kling sfx）、文生音乐（MiniMaxMusic / GL）
// =====================================================================

const RequiredMark = () => (
  <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>
);

const AudioGenForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('music');
  const [selectedModel, setSelectedModel] = useState('MiniMaxMusic');
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileList, setVideoFileList] = useState([]);
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileList, setAudioFileList] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  const scene = getAudioSceneConfig(mode);
  const modelCfg = AUDIO_MODEL_CONFIG[selectedModel] || AUDIO_MODEL_CONFIG.MiniMaxMusic;
  const modelOptions = scene.models.map((m) => ({ key: m, ...AUDIO_MODEL_CONFIG[m] }));
  const requiresVideo = !!scene.requiresVideo;

  const resetUploads = () => {
    setVideoFile(null);
    setVideoFileList([]);
    setAudioFile(null);
    setAudioFileList([]);
  };

  const handleModeChange = (value) => {
    setMode(value);
    const nextScene = getAudioSceneConfig(value);
    const nextModel = nextScene.models[0];
    setSelectedModel(nextModel);
    resetUploads();
    form.setFieldsValue({
      modelName: nextModel,
      modelVersion: AUDIO_MODEL_CONFIG[nextModel].defaultVersion || undefined,
      duration: nextScene.value === 'sfx_text' ? AUDIO_MODEL_CONFIG[nextModel].duration?.default : undefined,
      outputFormat: undefined,
      instrumental: false,
      lyrics: undefined,
    });
  };

  const handleModelChange = (value) => {
    setSelectedModel(value);
    resetUploads();
    form.setFieldsValue({
      modelVersion: AUDIO_MODEL_CONFIG[value].defaultVersion || undefined,
      duration: mode === 'sfx_text' ? AUDIO_MODEL_CONFIG[value].duration?.default : undefined,
      lyrics: undefined,
      instrumental: false,
    });
  };

  // 上传（视频 / 音频共用）
  const makeUploadHandler = ({ kind, key, setFile, setFileList }) => async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    try {
      setLoading(true);
      message.loading({ content: `正在上传${kind}到腾讯云 COS...`, key });
      const result = await uploadFileToCOS(file, (progressData) => {
        onProgress({ percent: progressData.percent });
      });
      message.success({ content: `${kind}上传成功！`, key });
      setFile({ uid: file.uid, name: file.name, url: result.url, key: result.key, status: 'done' });
      onSuccess(result);
    } catch (error) {
      console.error(`${kind}上传失败:`, error);
      message.error({ content: `${kind}上传失败: ${error.message}`, key });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = makeUploadHandler({
    kind: '参考视频',
    key: 'audio-video-upload',
    setFile: setVideoFile,
    setFileList: setVideoFileList,
  });
  const handleAudioUpload = makeUploadHandler({
    kind: '参考音频',
    key: 'audio-audio-upload',
    setFile: setAudioFile,
    setFileList: setAudioFileList,
  });

  const beforeUploadVideo = (file) => {
    if (!file.type.startsWith('video/')) {
      message.error('只能上传视频文件！');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > 100) {
      message.error('视频大小不能超过 100MB！');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const beforeUploadAudio = (file) => {
    const ok = file.type.startsWith('audio/') || /\.(mp3|wav)$/i.test(file.name);
    if (!ok) {
      message.error('只能上传音频文件（mp3 / wav）！');
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > 15) {
      message.error('音频大小不能超过 15MB！');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  // 轮询任务状态
  const startPolling = (tid) => {
    const interval = setInterval(async () => {
      try {
        const status = await queryAudioTaskStatus(tid);
        setTaskStatus(status);
        if (status.Status === 'FINISH') {
          clearInterval(interval);
          setPollingInterval(null);
          message.success('音频生成成功！');
        } else if (status.Status === 'FAIL') {
          clearInterval(interval);
          setPollingInterval(null);
          message.error('音频生成失败！');
        }
      } catch (error) {
        console.error('查询音频任务状态失败:', error);
      }
    }, 5000);
    setPollingInterval(interval);
  };

  const handleSubmit = async (values) => {
    if (!values.prompt || values.prompt.trim() === '') {
      message.warning(values.modelName === 'GL' ? '请输入风格描述！' : '请输入 Prompt！');
      return;
    }
    if (requiresVideo && !videoFile) {
      message.error('视频生音效请先上传参考视频！');
      return;
    }

    try {
      setLoading(true);
      message.loading({ content: '正在创建音频生成任务...', key: 'audio-submit' });

      const taskData = buildAudioTaskData({
        modelName: values.modelName,
        version: values.modelVersion,
        mode,
        prompt: values.prompt,
        style: values.prompt,
        lyrics: values.lyrics,
        instrumental: values.instrumental,
        duration: values.duration,
        videoFile,
        audioFile,
        outputFormat: values.outputFormat,
        storageMode: values.storageMode,
        additionalParameters: values.additionalParameters,
      });

      const result = await createAigcAudioTask(taskData);
      message.success({ content: '任务创建成功！', key: 'audio-submit' });
      setTaskId(result.TaskId);
      setTaskStatus({ Status: 'PROCESSING' });
      startPolling(result.TaskId);
    } catch (error) {
      message.error({ content: `任务创建失败: ${error.message}`, key: 'audio-submit' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    form.resetFields();
    resetUploads();
    setTaskId(null);
    setTaskStatus(null);
    setMode('music');
    setSelectedModel('MiniMaxMusic');
  };

  const renderTaskStatus = () => {
    if (!taskStatus) return null;
    const { Status, AigcAudioTask } = taskStatus;

    if (Status === 'PROCESSING' || Status === 'WAITING') {
      return (
        <Card className="task-status-card" style={{ marginTop: 24 }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="音频生成中，请耐心等待...">
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <CustomerServiceOutlined style={{ fontSize: 64, color: '#4a6cf7', opacity: 0.3 }} />
            </div>
          </Spin>
          <p className="task-id">任务ID: {taskId}</p>
        </Card>
      );
    }

    if (Status === 'FINISH' && AigcAudioTask) {
      const isSuccess = AigcAudioTask.ErrCode === 0;
      const audioUrls = (AigcAudioTask.Output?.AudioInfos || []).map((f) => f.FileUrl).filter(Boolean);
      const videoUrls = (AigcAudioTask.Output?.VideoInfos || []).map((f) => f.FileUrl).filter(Boolean);
      const errorMsg = AigcAudioTask.Message || '未知错误';

      if (!isSuccess) {
        return (
          <Card className="task-status-card" style={{ marginTop: 24 }}>
            <Result
              status="error"
              icon={<CloseCircleOutlined />}
              title="音频生成失败"
              subTitle={`任务ID: ${taskId}`}
              extra={[
                <div key="error" style={{ marginTop: 20, textAlign: 'left', maxWidth: 600, margin: '20px auto' }}>
                  <p><strong>错误代码:</strong> {AigcAudioTask.ErrCode}</p>
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
            title="音频生成成功！"
            subTitle={`任务ID: ${taskId}`}
            extra={[
              audioUrls.length > 0 && (
                <div key="audio" style={{ textAlign: 'center', marginTop: 16 }}>
                  {audioUrls.map((url) => (
                    <div key={url} style={{ marginBottom: 16 }}>
                      <audio controls src={url} style={{ width: '100%', maxWidth: 520 }} />
                      <div style={{ marginTop: 8 }}>
                        <Button type="primary" href={url} target="_blank">下载音频</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ),
              videoUrls.length > 0 && (
                <div key="video" style={{ textAlign: 'center', marginTop: 16 }}>
                  {videoUrls.map((url) => (
                    <video key={url} controls src={url} style={{ width: '100%', maxWidth: 520, marginBottom: 16 }}>
                      您的浏览器不支持视频播放
                    </video>
                  ))}
                </div>
              ),
              <Button key="new" onClick={handleReset} style={{ marginTop: 8 }}>生成新音频</Button>,
            ]}
          />
        </Card>
      );
    }

    if (Status === 'FAIL') {
      const errorMsg = AigcAudioTask?.Message || '未知错误';
      return (
        <Card className="task-status-card" style={{ marginTop: 24 }}>
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="音频生成失败"
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
            <CustomerServiceOutlined />
            <span>AI 音频生成</span>
          </Space>
        }
        className="form-card"
        extra={
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            Powered by Tencent Cloud VOD
          </span>
        }
      >
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
            mode: 'music',
            modelName: 'MiniMaxMusic',
            modelVersion: '3.0',
            storageMode: 'Permanent',
            outputFormat: 'mp3',
            instrumental: false,
          }}
        >
          <div className="form-two-col">
            <div className="form-col-left">
              <div className="section-title">生成类型</div>
              <Form.Item name="mode" style={{ marginBottom: 16 }}>
                <Radio.Group onChange={(e) => handleModeChange(e.target.value)}>
                  {AUDIO_SCENES.map((s) => (
                    <Radio.Button key={s.value} value={s.value}>{s.label}</Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              <div className="model-select-row">
                <Form.Item
                  label={<span>模型 <RequiredMark /></span>}
                  name="modelName"
                  rules={[{ required: true, message: '请选择模型！' }]}
                  style={{ marginBottom: 16 }}
                >
                  <Select onChange={handleModelChange}>
                    {modelOptions.map(({ key, label }) => (
                      <Select.Option key={key} value={key}>{label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {modelCfg.versions?.length > 0 && (
                  <Form.Item
                    label={<span>版本 <RequiredMark /></span>}
                    name="modelVersion"
                    rules={[{ required: true, message: '请选择版本！' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Select>
                      {modelCfg.versions.map((v) => (
                        <Select.Option key={v} value={v}>
                          {v}{v === modelCfg.defaultVersion ? ' ✦' : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </div>

              {modelCfg.note && (
                <div style={{ padding: '6px 10px', background: '#f6f8fa', borderRadius: 6, color: '#888', fontSize: 12, marginBottom: 12 }}>
                  {modelCfg.note}
                </div>
              )}

              {/* 视频生音效：参考视频 */}
              {requiresVideo && (
                <>
                  <div className="section-title" style={{ marginTop: 8 }}>参考视频</div>
                  <Form.Item
                    label={
                      <span>
                        参考视频 <RequiredMark />&nbsp;
                        <Tooltip title="仅支持 MP4/MOV，文件 ≤100MB，时长 3-20 秒">
                          <QuestionCircleOutlined style={{ color: '#ccc' }} />
                        </Tooltip>
                      </span>
                    }
                    style={{ marginBottom: 8 }}
                  >
                    <Upload
                      listType="picture-card"
                      fileList={videoFileList}
                      beforeUpload={beforeUploadVideo}
                      customRequest={handleVideoUpload}
                      onChange={({ fileList }) => setVideoFileList(fileList)}
                      onRemove={() => { setVideoFile(null); return true; }}
                      accept="video/*"
                      multiple={false}
                    >
                      {videoFile ? null : (
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8, fontSize: 13 }}>上传视频</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </>
              )}

              {/* 生音乐：参考音频（MiniMaxMusic） */}
              {modelCfg.supportsAudioInput && (
                <>
                  <div className="section-title" style={{ marginTop: 8 }}>参考音频（可选）</div>
                  <Form.Item
                    label={
                      <span>
                        参考音频&nbsp;
                        <Tooltip title="传入参考音频生成音乐，支持 mp3 / wav，≤15MB">
                          <QuestionCircleOutlined style={{ color: '#ccc' }} />
                        </Tooltip>
                      </span>
                    }
                    style={{ marginBottom: 8 }}
                  >
                    <Upload
                      listType="picture-card"
                      fileList={audioFileList}
                      beforeUpload={beforeUploadAudio}
                      customRequest={handleAudioUpload}
                      onChange={({ fileList }) => setAudioFileList(fileList)}
                      onRemove={() => { setAudioFile(null); return true; }}
                      accept="audio/*,.mp3,.wav"
                      multiple={false}
                    >
                      {audioFile ? null : (
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8, fontSize: 13 }}>上传音频</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </>
              )}

              <div className="section-title" style={{ marginTop: 8 }}>描述内容</div>
              <Form.Item
                label={
                  <span>
                    {valuesLabelPlaceholder(scene, selectedModel)}
                    <RequiredMark />
                  </span>
                }
                name="prompt"
                rules={[{ required: true, message: '请输入内容描述！' }]}
                style={{ marginBottom: 12 }}
              >
                <Input.TextArea
                  rows={4}
                  maxLength={2000}
                  showCount
                  placeholder={
                    selectedModel === 'GL'
                      ? '请输入风格描述，例如：欢快的电子舞曲，节奏感强'
                      : scene.sceneType === 'sfx'
                        ? '请描述想要生成的声音，例如：春节庆祝时的烟花声'
                        : '请描述想要生成的歌曲，例如：一首欢乐的歌'
                  }
                />
              </Form.Item>

              {/* 歌词（生音乐） */}
              {modelCfg.supportsLyrics && (
                <Form.Item
                  label={
                    <span>
                      歌词（可选）&nbsp;
                      <Tooltip title={selectedModel === 'GL' ? '歌词会按规则拼接进 Prompt；勾选纯音乐则不使用歌词' : '通过 AdditionalParameters.lyrics 传入'}>
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="lyrics"
                  style={{ marginBottom: 12 }}
                >
                  <Input.TextArea rows={4} placeholder="可选：填写歌词，不填则由模型自动写词" maxLength={2000} />
                </Form.Item>
              )}

              {selectedModel === 'GL' && (
                <Form.Item
                  label={
                    <span>
                      纯音乐&nbsp;
                      <Tooltip title="开启后在 Prompt 后追加 instrumental, no vocals.">
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="instrumental"
                  style={{ marginBottom: 0 }}
                >
                  <Radio.Group size="small">
                    <Radio.Button value={false}>否</Radio.Button>
                    <Radio.Button value={true}>是</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )}
            </div>

            <div className="form-col-right">
              <div className="section-title">输出配置</div>

              {/* 时长：仅文生音效有效 */}
              {mode === 'sfx_text' && modelCfg.duration && (
                <Form.Item
                  label={
                    <span>
                      时长（秒）&nbsp;
                      <Tooltip title={`取值范围 [${modelCfg.duration.min}, ${modelCfg.duration.max}] 秒`}>
                        <QuestionCircleOutlined style={{ color: '#ccc' }} />
                      </Tooltip>
                    </span>
                  }
                  name="duration"
                  style={{ marginBottom: 16 }}
                >
                  <InputNumber min={modelCfg.duration.min} max={modelCfg.duration.max} step={1} style={{ width: 120 }} addonAfter="秒" />
                </Form.Item>
              )}

              {/* 输出格式 */}
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
                  {modelCfg.outputFormats.map((f) => (
                    <Select.Option key={f} value={f}>{f}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

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
                        label={
                          <span style={{ fontSize: 13, color: '#666' }}>
                            扩展参数&nbsp;
                            <Tooltip title='模型特殊参数 JSON，例如视频生音效：{"bgm_prompt":"治愈系钢琴曲","asmr_mode":true}'>
                              <QuestionCircleOutlined style={{ color: '#ccc' }} />
                            </Tooltip>
                          </span>
                        }
                        name="additionalParameters"
                        style={{ marginBottom: 0 }}
                      >
                        <Input.TextArea rows={2} size="small" placeholder='例：{"asmr_mode":true}' />
                      </Form.Item>
                    </div>
                  ),
                }]}
              />
            </div>
          </div>

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
                生成音频
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

// 描述内容标签
function valuesLabelPlaceholder(scene, selectedModel) {
  if (selectedModel === 'GL') return '风格描述';
  if (scene?.sceneType === 'sfx') return '音效描述';
  return '歌曲描述';
}

export default AudioGenForm;
