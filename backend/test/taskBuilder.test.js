const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVideoTaskPayload,
  buildImageTaskPayload,
  buildAudioTaskPayload,
  buildOutputConfig,
} = require('../services/taskBuilder');

test('buildVideoTaskPayload：透传新模型参数（ExtInfo / SubjectInfos / LastFrameUrl / SceneType / Seed）', () => {
  const payload = buildVideoTaskPayload(
    {
      ModelName: 'Kling',
      ModelVersion: '3.0-Omni',
      FileInfos: [{ Type: 'Url', Url: 'https://x/a.png', Usage: 'FirstFrame' }],
      LastFrameUrl: 'https://x/last.png',
      Prompt: '测试',
      NegativePrompt: '不要出现水印',
      EnhancePrompt: 'Enabled',
      SubjectInfos: [{ Id: '858477278396170315' }],
      ExtInfo: '{"AdditionalParameters":"{}"}',
      Seed: 12345,
      SceneType: 'motion_control',
      InputRegion: 'Mainland',
      OutputConfig: {
        StorageMode: 'Permanent',
        Resolution: '1080P',
        Duration: '8',
        AspectRatio: '16:9',
        AudioGeneration: 'Enabled',
        EnhanceSwitch: 'Enabled',
      },
    },
    { subAppId: 1500044236 }
  );

  assert.equal(payload.SubAppId, 1500044236);
  assert.equal(payload.LastFrameUrl, 'https://x/last.png');
  assert.deepEqual(payload.SubjectInfos, [{ Id: '858477278396170315' }]);
  assert.equal(payload.ExtInfo, '{"AdditionalParameters":"{}"}');
  assert.equal(payload.Seed, 12345);
  assert.equal(payload.SceneType, 'motion_control');
  assert.equal(payload.OutputConfig.Duration, 8);
  assert.equal(payload.OutputConfig.AudioGeneration, 'Enabled');
  assert.equal(payload.OutputConfig.EnhanceSwitch, 'Enabled');
  assert.equal(payload.OutputConfig.StorageMode, 'Permanent');
});

test('buildVideoTaskPayload：文生视频（无 FileInfos）不携带 FileInfos 字段', () => {
  const payload = buildVideoTaskPayload(
    { ModelName: 'Wan', ModelVersion: '3.0', Prompt: '文生视频', OutputConfig: { StorageMode: 'Permanent' } },
    { subAppId: 1 }
  );
  assert.equal(payload.FileInfos, undefined);
  assert.equal(payload.Prompt, '文生视频');
});

test('buildImageTaskPayload：透传 OutputImageCount / OutputFormat / SceneType / ExtInfo', () => {
  const payload = buildImageTaskPayload(
    {
      ModelName: 'OG',
      ModelVersion: 'image2.5_flare_medium',
      FileInfos: [{ Type: 'Url', Url: 'https://x/a.png', ReferenceType: 'mask' }],
      Prompt: '生成图片',
      SceneType: 'image_expand',
      ExtInfo: '{"AdditionalParameters":"{\\"size\\":\\"auto\\"}"}',
      OutputConfig: {
        StorageMode: 'Permanent',
        Resolution: '1K',
        AspectRatio: '9:16',
        OutputImageCount: '3',
        OutputFormat: 'png',
      },
    },
    { subAppId: 1500044236 }
  );

  assert.equal(payload.OutputConfig.OutputImageCount, 3);
  assert.equal(payload.OutputConfig.OutputFormat, 'png');
  assert.equal(payload.SceneType, 'image_expand');
  assert.equal(payload.ExtInfo, '{"AdditionalParameters":"{\\"size\\":\\"auto\\"}"}');
  assert.equal(payload.FileInfos[0].ReferenceType, 'mask');
});

test('buildAudioTaskPayload：音效 / 音乐任务字段与输出配置', () => {
  const sfxPayload = buildAudioTaskPayload(
    {
      ModelName: 'Kling',
      SceneType: 'sfx',
      Prompt: '春节庆祝时的烟花声',
      VideoInfos: [{ Type: 'Url', Url: 'https://x/v.mp4' }],
      AdditionalParameters: '{"asmr_mode":true}',
      OutputConfig: { StorageMode: 'Temporary', Duration: '6', OutputAudioFormat: 'wav' },
    },
    { subAppId: 1500044236 }
  );

  assert.equal(sfxPayload.SceneType, 'sfx');
  assert.deepEqual(sfxPayload.VideoInfos, [{ Type: 'Url', Url: 'https://x/v.mp4' }]);
  assert.equal(sfxPayload.AdditionalParameters, '{"asmr_mode":true}');
  assert.equal(sfxPayload.OutputConfig.Duration, 6);
  assert.equal(sfxPayload.OutputConfig.OutputAudioFormat, 'wav');
  // 音频输出配置不包含人物生成 / 合规检查字段
  assert.equal(sfxPayload.OutputConfig.PersonGeneration, undefined);
  assert.equal(sfxPayload.OutputConfig.InputComplianceCheck, undefined);

  const musicPayload = buildAudioTaskPayload(
    {
      ModelName: 'MiniMaxMusic',
      ModelVersion: '3.0',
      SceneType: 'music',
      Prompt: '一首欢乐的歌',
      AudioInfos: [{ Type: 'Url', Url: 'https://x/ref.mp3' }],
      OutputConfig: { StorageMode: 'Temporary', OutputAudioFormat: 'mp3' },
    },
    { subAppId: 1500044236 }
  );
  assert.equal(musicPayload.ModelVersion, '3.0');
  assert.equal(musicPayload.OutputConfig.OutputAudioFormat, 'mp3');
  assert.equal(musicPayload.OutputConfig.Duration, undefined);
});

test('buildOutputConfig：空配置使用默认值', () => {
  const cfg = buildOutputConfig();
  assert.deepEqual(cfg, {
    StorageMode: 'Permanent',
    PersonGeneration: 'AllowAdult',
    InputComplianceCheck: 'Disabled',
    OutputComplianceCheck: 'Disabled',
  });
});
