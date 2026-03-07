/**
 * 腾讯云 STS 临时密钥服务
 * 用于前端直接上传文件到 COS
 */

const STS = require('qcloud-cos-sts');

// STS 配置
const stsConfig = {
  secretId: process.env.TENCENTCLOUD_SECRET_ID,
  secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
  durationSeconds: 1800, // 密钥有效期 30 分钟
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION,
  // 允许的操作
  allowActions: [
    // 简单上传
    'name/cos:PutObject',
    'name/cos:PostObject',
    // 分块上传
    'name/cos:InitiateMultipartUpload',
    'name/cos:ListMultipartUploads',
    'name/cos:ListParts',
    'name/cos:UploadPart',
    'name/cos:CompleteMultipartUpload',
  ],
};

/**
 * 获取临时密钥
 * @returns {Promise<Object>} 临时密钥信息
 */
const getTempCredentials = () => {
  return new Promise((resolve, reject) => {
    const inputPath = process.env.COS_INPUT_PATH || 'video-gen/input';
    const bucket = stsConfig.bucket;
    const region = stsConfig.region;
    
    // 从 bucket 名称中提取 appid
    const bucketParts = bucket.split('-');
    const appid = bucketParts[bucketParts.length - 1];
    
    // 设置策略 - 使用正确的资源格式
    const policy = {
      version: '2.0',
      statement: [{
        action: stsConfig.allowActions,
        effect: 'allow',
        resource: [
          // 允许操作指定路径下的所有对象
          `qcs::cos:${region}:uid/${appid}:${bucket}/${inputPath}/*`,
        ],
      }],
    };

    // 获取临时密钥
    STS.getCredential({
      secretId: stsConfig.secretId,
      secretKey: stsConfig.secretKey,
      durationSeconds: stsConfig.durationSeconds,
      policy: policy,
    }, (err, credential) => {
      if (err) {
        console.error('获取临时密钥失败:', err);
        reject(new Error('获取临时密钥失败'));
        return;
      }

      resolve({
        credentials: credential.credentials,
        expiredTime: credential.expiredTime,
        startTime: credential.startTime,
        bucket: bucket,
        region: region,
        inputPath: inputPath,
      });
    });
  });
};

module.exports = {
  getTempCredentials,
};
