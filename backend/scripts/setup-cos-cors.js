/**
 * 配置 COS CORS 规则
 * 允许前端直传到 COS
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
  SecretId: process.env.TENCENTCLOUD_SECRET_ID,
  SecretKey: process.env.TENCENTCLOUD_SECRET_KEY
});

const bucket = process.env.COS_BUCKET;
const region = process.env.COS_REGION;

async function setupCORS() {
  console.log('配置 COS CORS 规则...');
  console.log(`存储桶: ${bucket}`);
  console.log(`区域: ${region}`);

  const corsRules = [
    {
      ID: 'video-gen-frontend-direct-upload',
      AllowedOrigins: [
        'http://localhost:9999',
        'http://127.0.0.1:9999',
        'http://43.132.153.123:9999',
        'http://video.werookies.com:9999',
        'https://video.werookies.com:9999'
      ],
      AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: [
        'ETag',
        'Content-Length',
        'x-cos-request-id',
        'x-cos-version-id'
      ],
      MaxAgeSeconds: 3600
    }
  ];

  return new Promise((resolve, reject) => {
    cos.putBucketCors({
      Bucket: bucket,
      Region: region,
      CORSRules: corsRules
    }, (err, data) => {
      if (err) {
        console.error('❌ CORS 配置失败:', err);
        reject(err);
      } else {
        console.log('✅ CORS 配置成功!');
        console.log('响应:', data);
        resolve(data);
      }
    });
  });
}

async function verifyCORS() {
  console.log('\n验证 CORS 配置...');
  
  return new Promise((resolve, reject) => {
    cos.getBucketCors({
      Bucket: bucket,
      Region: region
    }, (err, data) => {
      if (err) {
        console.error('❌ 获取 CORS 配置失败:', err);
        reject(err);
      } else {
        console.log('✅ 当前 CORS 配置:');
        console.log(JSON.stringify(data.CORSRules, null, 2));
        resolve(data);
      }
    });
  });
}

async function main() {
  try {
    await setupCORS();
    await verifyCORS();
    console.log('\n🎉 COS CORS 配置完成!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 配置失败:', error.message);
    process.exit(1);
  }
}

main();
