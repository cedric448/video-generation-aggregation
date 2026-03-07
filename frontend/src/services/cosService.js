/**
 * 腾讯云 COS 前端直传服务
 */

import COS from 'cos-js-sdk-v5';
import apiClient from './api';

let cosClient = null;
let credentials = null;
let credentialsExpireTime = 0;

/**
 * 获取或刷新 COS 临时密钥
 */
const getCredentials = async () => {
  const now = Date.now();
  
  // 如果密钥还有 5 分钟以上有效期,直接使用
  if (credentials && credentialsExpireTime > now + 5 * 60 * 1000) {
    return credentials;
  }
  
  console.log('获取新的临时密钥...');
  
  try {
    const response = await apiClient.get('/sts/credentials');
    
    if (!response.success) {
      throw new Error(response.error || '获取临时密钥失败');
    }
    
    credentials = response.data;
    credentialsExpireTime = credentials.expiredTime * 1000; // 转为毫秒
    
    // 重新初始化 COS 客户端
    initCosClient();
    
    return credentials;
  } catch (error) {
    console.error('获取临时密钥失败:', error);
    throw new Error(`获取临时密钥失败: ${error.message}`);
  }
};

/**
 * 初始化 COS 客户端
 */
const initCosClient = () => {
  if (!credentials) {
    throw new Error('未获取到临时密钥');
  }
  
  cosClient = new COS({
    getAuthorization: (options, callback) => {
      callback({
        TmpSecretId: credentials.credentials.tmpSecretId,
        TmpSecretKey: credentials.credentials.tmpSecretKey,
        SecurityToken: credentials.credentials.sessionToken,
        StartTime: credentials.startTime,
        ExpiredTime: credentials.expiredTime,
      });
    },
  });
};

/**
 * 上传文件到 COS
 * @param {File} file - 文件对象
 * @param {Function} onProgress - 上传进度回调
 * @returns {Promise<{url: string, key: string}>} - 返回文件信息
 */
export const uploadFileToCOS = async (file, onProgress) => {
  try {
    // 获取临时密钥
    const cred = await getCredentials();
    
    if (!cosClient) {
      throw new Error('COS 客户端未初始化');
    }
    
    // 生成文件路径
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const key = `${cred.inputPath}/${fileName}`;
    
    console.log('开始上传文件到 COS:', {
      bucket: cred.bucket,
      region: cred.region,
      key: key,
      fileName: file.name,
      fileSize: file.size,
    });
    
    // 上传文件
    return new Promise((resolve, reject) => {
      cosClient.putObject(
        {
          Bucket: cred.bucket,
          Region: cred.region,
          Key: key,
          Body: file,
          onProgress: (progressData) => {
            const percent = Math.round(progressData.percent * 100);
            console.log(`上传进度: ${percent}%`);
            
            if (onProgress) {
              onProgress({
                loaded: progressData.loaded,
                total: progressData.total,
                percent: percent,
              });
            }
          },
        },
        (err, data) => {
          if (err) {
            console.error('COS 上传失败:', err);
            reject(new Error(`上传失败: ${err.message}`));
            return;
          }
          
          // 构建文件 URL
          const url = `https://${cred.bucket}.cos.${cred.region}.myqcloud.com/${key}`;
          
          console.log('COS 上传成功:', {
            url: url,
            key: key,
            statusCode: data.statusCode,
          });
          
          resolve({
            url: url,
            key: key,
            bucket: cred.bucket,
            region: cred.region,
          });
        }
      );
    });
  } catch (error) {
    console.error('上传文件到 COS 失败:', error);
    throw error;
  }
};

/**
 * 上传多个文件
 * @param {File[]} files - 文件数组
 * @param {Function} onProgress - 总进度回调
 * @returns {Promise<Array>} - 返回所有文件信息
 */
export const uploadMultipleFiles = async (files, onProgress) => {
  const results = [];
  let totalLoaded = 0;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    const result = await uploadFileToCOS(file, (progress) => {
      const currentLoaded = totalLoaded + progress.loaded;
      const totalPercent = Math.round((currentLoaded / totalSize) * 100);
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: files.length,
          percent: totalPercent,
          currentFile: file.name,
        });
      }
    });
    
    results.push(result);
    totalLoaded += file.size;
  }
  
  return results;
};

export default {
  uploadFileToCOS,
  uploadMultipleFiles,
};
