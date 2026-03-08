import axios from 'axios';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 300000, // 5分钟超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(errorMessage));
  }
);

/**
 * 上传文件到 COS
 * @param {File} file - 文件对象
 * @param {Function} onProgress - 上传进度回调
 * @returns {Promise<{url: string}>} - 返回文件 URL
 */
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });

    if (!response.success) {
      throw new Error(response.error || '上传失败');
    }

    return {
      url: response.data.url,
      key: response.data.key,
    };
  } catch (error) {
    throw new Error(`文件上传失败: ${error.message}`);
  }
};

/**
 * 创建 AIGC 视频生成任务
 * @param {Object} taskData - 任务数据
 * @returns {Promise<{TaskId: string}>} - 返回任务 ID
 */
export const createAigcVideoTask = async (taskData) => {
  try {
    const response = await apiClient.post('/video/create', taskData);

    if (!response.success) {
      throw new Error(response.error || '任务创建失败');
    }

    return {
      TaskId: response.data.taskId,
      RequestId: response.data.requestId,
    };
  } catch (error) {
    throw new Error(`创建视频任务失败: ${error.message}`);
  }
};

/**
 * 查询任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Promise<Object>} - 返回任务状态信息
 */
export const queryTaskStatus = async (taskId) => {
  try {
    const response = await apiClient.get(`/video/status/${taskId}`);

    if (!response.success) {
      throw new Error(response.error || '查询失败');
    }

    return response.data;
  } catch (error) {
    throw new Error(`查询任务状态失败: ${error.message}`);
  }
};

/**
 * 创建 AIGC 图片生成任务
 * @param {Object} taskData - 任务数据
 * @returns {Promise<{TaskId: string}>}
 */
export const createAigcImageTask = async (taskData) => {
  try {
    const response = await apiClient.post('/image/create', taskData);

    if (!response.success) {
      throw new Error(response.error || '任务创建失败');
    }

    return {
      TaskId: response.data.taskId,
      RequestId: response.data.requestId,
    };
  } catch (error) {
    throw new Error(`创建图片任务失败: ${error.message}`);
  }
};

/**
 * 查询图片任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Promise<Object>}
 */
export const queryImageTaskStatus = async (taskId) => {
  try {
    const response = await apiClient.get(`/image/status/${taskId}`);

    if (!response.success) {
      throw new Error(response.error || '查询失败');
    }

    return response.data;
  } catch (error) {
    throw new Error(`查询图片任务状态失败: ${error.message}`);
  }
};

export default apiClient;
