const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');

// 初始化 COS 客户端
const cos = new COS({
  SecretId: process.env.TENCENTCLOUD_SECRET_ID,
  SecretKey: process.env.TENCENTCLOUD_SECRET_KEY,
});

/**
 * 上传文件到 COS (输入文件)
 * @param {string} filePath - 本地文件路径
 * @param {string} originalName - 原始文件名
 * @returns {Promise<{url: string, key: string}>}
 */
const uploadFile = async (filePath, originalName) => {
  return new Promise((resolve, reject) => {
    const bucket = process.env.COS_BUCKET;
    const region = process.env.COS_REGION;
    const cosInputPath = process.env.COS_INPUT_PATH || 'video-gen/input';
    
    // 生成唯一文件名
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${random}${ext}`;
    const key = `${cosInputPath}/${fileName}`;

    console.log(`上传文件到 COS: ${bucket}/${key}`);

    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentLength: fs.statSync(filePath).size,
      },
      (err, data) => {
        if (err) {
          console.error('COS 上传失败:', err);
          return reject(new Error(`COS 上传失败: ${err.message}`));
        }

        // 构造访问 URL
        const url = `https://${bucket}.cos.${region}.myqcloud.com/${key}`;

        console.log('COS 上传成功:', url);

        resolve({
          url: url,
          key: key,
          location: data.Location
        });
      }
    );
  });
};

/**
 * 删除 COS 文件
 * @param {string} key - 文件 Key
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  return new Promise((resolve, reject) => {
    const bucket = process.env.COS_BUCKET;
    const region = process.env.COS_REGION;

    cos.deleteObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
      },
      (err, data) => {
        if (err) {
          return reject(new Error(`删除文件失败: ${err.message}`));
        }
        resolve(data);
      }
    );
  });
};

module.exports = {
  uploadFile,
  deleteFile,
};
