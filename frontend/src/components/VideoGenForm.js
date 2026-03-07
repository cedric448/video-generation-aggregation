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
  Progress
} from 'antd';
import { 
  UploadOutlined, 
  VideoCameraOutlined, 
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { createAigcVideoTask, queryTaskStatus } from '../services/api';
import { uploadFileToCOS } from '../services/cosService';
import './VideoGenForm.css';

const { TextArea } = Input;

// 模型配置
const MODEL_OPTIONS = {
  hailuo: {
    label: '海螺 (Hailuo)',
    versions: ['2.3-fast']
  },
  kling: {
    label: '可灵 (Kling)',
    versions: ['3.0', '3.0-Omni']
  },
  jimeng: {
    label: '即梦 (Jimeng)',
    versions: ['3.0pro']
  },
  seedance: {
    label: '豆包 (Seedance)',
    versions: ['1.5-pro']
  },
  gv: {
    label: 'Google (GV)',
    versions: ['3.1-fast']
  }
};

const VideoGenForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileList, setFileList] = useState([]); // 管理 Upload 组件的文件列表
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [selectedModel, setSelectedModel] = useState('hailuo');

  // 调试: 监控 uploadedFiles 变化
  React.useEffect(() => {
    console.log('uploadedFiles 状态变化:', uploadedFiles);
  }, [uploadedFiles]);

  // 文件上传前的处理
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      message.error('只能上传图片或视频文件!');
      return Upload.LIST_IGNORE;
    }

    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error('文件大小不能超过 100MB!');
      return Upload.LIST_IGNORE;
    }

    // 返回 true 允许继续,customRequest 会处理实际上传
    return true;
  };

  // 自定义上传处理 - 前端直传 COS
  const handleUpload = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    console.log('handleUpload 被调用, file:', file);
    
    try {
      setLoading(true);
      message.loading({ content: '正在上传文件到腾讯云 COS...', key: 'upload' });
      
      // 使用前端直传 COS
      console.log('开始调用 uploadFileToCOS...');
      const result = await uploadFileToCOS(file, (progressData) => {
        console.log('上传进度回调:', progressData);
        onProgress({ percent: progressData.percent });
      });

      console.log('uploadFileToCOS 返回结果:', result);
      message.success({ content: '文件上传成功!', key: 'upload' });
      
      // 更新已上传文件列表
      const uploadedFile = {
        uid: file.uid,
        name: file.name,
        url: result.url,
        key: result.key,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        status: 'done'
      };
      
      console.log('准备更新 uploadedFiles, uploadedFile:', uploadedFile);
      setUploadedFiles(prev => {
        const newList = [...prev, uploadedFile];
        console.log('uploadedFiles 更新后:', newList);
        return newList;
      });
      
      onSuccess(result);
    } catch (error) {
      console.error('上传失败:', error);
      message.error({ content: `上传失败: ${error.message}`, key: 'upload' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // 移除已上传文件
  const handleRemoveFile = (file) => {
    setUploadedFiles(prev => prev.filter(f => f.uid !== file.uid));
    return true;
  };
  
  // 文件列表变化时的处理
  const handleFileListChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 轮询任务状态
  const startPolling = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const status = await queryTaskStatus(taskId);
        setTaskStatus(status);

        if (status.Status === 'FINISH') {
          clearInterval(interval);
          setPollingInterval(null);
          message.success('视频生成成功!');
        } else if (status.Status === 'FAIL') {
          clearInterval(interval);
          setPollingInterval(null);
          message.error('视频生成失败!');
        }
      } catch (error) {
        console.error('查询任务状态失败:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // 提交表单
  const handleSubmit = async (values) => {
    if (uploadedFiles.length === 0) {
      message.warning('请先上传参考图片或视频!');
      return;
    }

    if (!values.prompt || values.prompt.trim() === '') {
      message.warning('请输入 Prompt!');
      return;
    }

    try {
      setLoading(true);
      message.loading({ content: '正在创建视频生成任务...', key: 'submit' });

      const fileInfos = uploadedFiles.map(file => ({
        Type: 'Url',
        Url: file.url,
        Category: file.type === 'image' ? 'Image' : 'Video'
      }));

      // 转换模型名称格式
      // 特殊处理: gv -> GV (全大写)
      // 其他: hailuo -> Hailuo (首字母大写)
      const formatModelName = (name) => {
        if (name.toLowerCase() === 'gv') {
          return 'GV';
        }
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      };

      const taskData = {
        ModelName: formatModelName(values.modelName),
        ModelVersion: values.modelVersion,
        FileInfos: fileInfos,
        Prompt: values.prompt,
        EnhancePrompt: 'Enabled',
        OutputConfig: {
          StorageMode: 'Permanent',
          Resolution: values.resolution || '720P',
          PersonGeneration: 'AllowAdult',
          InputComplianceCheck: 'Disabled',
          OutputComplianceCheck: 'Disabled'
        },
        InputRegion: 'Mainland'
      };

      const result = await createAigcVideoTask(taskData);
      
      message.success({ content: '任务创建成功!', key: 'submit' });
      setTaskId(result.TaskId);
      setTaskStatus({ Status: 'PROCESSING', Progress: 0 });
      
      // 开始轮询
      startPolling(result.TaskId);
      
    } catch (error) {
      message.error({ content: `任务创建失败: ${error.message}`, key: 'submit' });
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
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
  };

  // 渲染任务状态
  const renderTaskStatus = () => {
    if (!taskStatus) return null;

    const { Status, Progress: progressPercent = 0, AigcVideoTask } = taskStatus;

    if (Status === 'PROCESSING' || Status === 'WAITING') {
      return (
        <Card className="task-status-card">
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            tip="视频生成中,请耐心等待..."
          >
            <div style={{ padding: '40px 0' }}>
              <Progress 
                type="circle" 
                percent={progressPercent} 
                status="active"
              />
            </div>
          </Spin>
          <p className="task-id">任务ID: {taskId}</p>
        </Card>
      );
    }

    if (Status === 'FINISH' && AigcVideoTask) {
      // 检查任务是否真正成功(ErrCode 为 0 表示成功)
      const isSuccess = AigcVideoTask.ErrCode === 0;
      const videoUrl = AigcVideoTask.Output?.FileInfos?.[0]?.FileUrl;
      const errorMsg = AigcVideoTask.Message || '未知错误';
      
      // 任务失败
      if (!isSuccess) {
        return (
          <Card className="task-status-card">
            <Result
              status="error"
              icon={<CloseCircleOutlined />}
              title="视频生成失败"
              subTitle={`任务ID: ${taskId}`}
              extra={[
                <div key="error" style={{ marginTop: '20px', textAlign: 'left', maxWidth: '600px', margin: '20px auto' }}>
                  <p><strong>错误代码:</strong> {AigcVideoTask.ErrCode}</p>
                  <p><strong>错误信息:</strong> {errorMsg}</p>
                  {AigcVideoTask.ErrCode === 70000 && errorMsg.includes('blocked by your current safety settings') && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#fff7e6', border: '1px solid #ffd666', borderRadius: '4px' }}>
                      <p><strong>提示:</strong></p>
                      <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                        <li>图片可能包含人脸或人物,被安全审核拦截</li>
                        <li>请尝试使用不包含人物的图片</li>
                        <li>或者使用风景、物品等非人物图片</li>
                      </ul>
                    </div>
                  )}
                </div>,
                <Button key="retry" type="primary" onClick={handleReset}>
                  重新生成
                </Button>
              ]}
            />
          </Card>
        );
      }
      
      // 任务成功
      return (
        <Card className="task-status-card">
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="视频生成成功!"
            subTitle={`任务ID: ${taskId}`}
            extra={[
              videoUrl && (
                <div key="video" className="video-result">
                  <video 
                    controls 
                    style={{ width: '100%', maxWidth: '600px', marginTop: '20px' }}
                    src={videoUrl}
                  >
                    您的浏览器不支持视频播放
                  </video>
                  <Button 
                    type="primary" 
                    href={videoUrl} 
                    target="_blank"
                    style={{ marginTop: '16px' }}
                  >
                    下载视频
                  </Button>
                </div>
              ),
              <Button key="new" onClick={handleReset}>
                生成新视频
              </Button>
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
            extra={[
              <Button key="retry" type="primary" onClick={handleReset}>
                重新尝试
              </Button>
            ]}
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
            <span>视频生成配置</span>
          </Space>
        }
        className="form-card"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            modelName: 'hailuo',
            modelVersion: '2.3-fast',
            resolution: '720P'
          }}
        >
          <Form.Item
            label="模型选择"
            name="modelName"
            rules={[{ required: true, message: '请选择模型!' }]}
          >
            <Select
              placeholder="请选择模型"
              onChange={(value) => {
                setSelectedModel(value);
                form.setFieldsValue({ 
                  modelVersion: MODEL_OPTIONS[value].versions[0] 
                });
              }}
            >
              {Object.entries(MODEL_OPTIONS).map(([key, { label }]) => (
                <Select.Option key={key} value={key}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="模型版本"
            name="modelVersion"
            rules={[{ required: true, message: '请选择模型版本!' }]}
          >
            <Select placeholder="请选择模型版本">
              {MODEL_OPTIONS[selectedModel]?.versions.map(version => (
                <Select.Option key={version} value={version}>
                  {version}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="上传参考文件"
            required
            tooltip="支持上传图片或视频作为参考"
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={beforeUpload}
              customRequest={handleUpload}
              onRemove={handleRemoveFile}
              onChange={handleFileListChange}
              accept="image/*,video/*"
              multiple
            >
              {fileList.length >= 8 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传文件</div>
                </div>
              )}
            </Upload>
            <div className="upload-hint">
              已上传 {uploadedFiles.length} 个文件 (前端直传到 COS)
              <br />
              <small style={{ color: '#999' }}>
                路径: cedricbwang-hk-1258272081/video-gen/input
              </small>
            </div>
          </Form.Item>

          <Form.Item
            label="Prompt"
            name="prompt"
            rules={[{ required: true, message: '请输入 Prompt!' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细描述您想要生成的视频内容..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="分辨率"
            name="resolution"
            rules={[{ required: true, message: '请选择分辨率!' }]}
          >
            <Radio.Group>
              <Radio.Button value="720P">720P</Radio.Button>
              <Radio.Button value="1080P">1080P</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item className="form-actions">
            <Space size="large">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                disabled={!!taskStatus && taskStatus.Status === 'PROCESSING'}
              >
                生成视频
              </Button>
              <Button 
                onClick={handleReset}
                size="large"
                disabled={loading}
              >
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
