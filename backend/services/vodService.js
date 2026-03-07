const tencentcloud = require('tencentcloud-sdk-nodejs');

// 导入 VOD 客户端
const VodClient = tencentcloud.vod.v20180717.Client;

// 实例化认证对象
const clientConfig = {
  credential: {
    secretId: process.env.TENCENTCLOUD_SECRET_ID,
    secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
  },
  region: '', // VOD 不需要指定 region
  profile: {
    httpProfile: {
      endpoint: 'vod.tencentcloudapi.com',
    },
  },
};

const client = new VodClient(clientConfig);

/**
 * 创建 AIGC 视频生成任务
 * @param {Object} taskData - 任务参数
 * @returns {Promise<{TaskId: string, RequestId: string}>}
 */
const createAigcVideoTask = async (taskData) => {
  try {
    console.log('调用腾讯云 CreateAigcVideoTask API...');
    console.log('请求参数:', JSON.stringify(taskData, null, 2));

    const response = await client.CreateAigcVideoTask(taskData);

    console.log('API 响应:', JSON.stringify(response, null, 2));

    return {
      TaskId: response.TaskId,
      RequestId: response.RequestId,
    };
  } catch (error) {
    console.error('CreateAigcVideoTask 调用失败:', error);
    throw new Error(`创建视频任务失败: ${error.message}`);
  }
};

/**
 * 查询任务详情
 * @param {string} taskId - 任务 ID
 * @returns {Promise<Object>}
 */
const queryTaskStatus = async (taskId) => {
  try {
    console.log('调用腾讯云 DescribeTaskDetail API...');
    console.log('任务ID:', taskId);

    const params = {
      TaskId: taskId,
      SubAppId: parseInt(process.env.VOD_SUB_APP_ID),
    };

    const response = await client.DescribeTaskDetail(params);

    console.log('任务状态:', response.Status);

    // 返回简化的状态信息
    return {
      Status: response.Status,
      TaskType: response.TaskType,
      CreateTime: response.CreateTime,
      BeginProcessTime: response.BeginProcessTime,
      FinishTime: response.FinishTime,
      AigcVideoTask: response.AigcVideoTask,
      RequestId: response.RequestId,
    };
  } catch (error) {
    console.error('DescribeTaskDetail 调用失败:', error);
    throw new Error(`查询任务状态失败: ${error.message}`);
  }
};

module.exports = {
  createAigcVideoTask,
  queryTaskStatus,
};
