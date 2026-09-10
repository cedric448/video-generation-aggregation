/**
 * VOD AIGC 任务参数构建（纯函数，便于单元测试）
 * 依据《【通用】VOD AIGC服务接入指南》
 */

// OutputConfig 中允许透传的字段（视频 / 图片通用）
const VIDEO_OUTPUT_KEYS = [
  'Resolution',
  'Duration',
  'AspectRatio',
  'AudioGeneration',
  'EnhanceSwitch',
  'FrameInterpolate',
  'OffPeak',
  'LogoAdd',
  'MediaName',
  'ExpireTime',
  'ClassId',
  'EnhancePrompt',
];

// 图片额外字段
const IMAGE_OUTPUT_KEYS = [...VIDEO_OUTPUT_KEYS, 'OutputImageCount', 'OutputFormat'];

// 音频输出字段
const AUDIO_OUTPUT_KEYS = ['Duration', 'OutputAudioFormat', 'MediaName', 'ClassId', 'ExpireTime'];

const isPresent = (value) => value !== undefined && value !== null && value !== '';

const assignPresent = (target, source, keys) => {
  keys.forEach((key) => {
    if (isPresent(source[key])) target[key] = source[key];
  });
};

const buildOutputConfig = (output = {}, extraKeys = [], { includeCompliance = true } = {}) => {
  const cfg = {
    StorageMode: output.StorageMode || 'Permanent',
    ...(includeCompliance
      ? {
          PersonGeneration: output.PersonGeneration || 'AllowAdult',
          InputComplianceCheck: output.InputComplianceCheck || 'Disabled',
          OutputComplianceCheck: output.OutputComplianceCheck || 'Disabled',
        }
      : {}),
  };
  assignPresent(cfg, output, extraKeys);
  if (isPresent(cfg.Duration)) cfg.Duration = Number(cfg.Duration);
  if (isPresent(cfg.OutputImageCount)) cfg.OutputImageCount = Number(cfg.OutputImageCount);
  return cfg;
};

/**
 * 构建 CreateAigcVideoTask 参数
 * @param {Object} body - 前端请求体
 * @param {Object} options
 * @param {number} options.subAppId
 * @returns {Object}
 */
const buildVideoTaskPayload = (body = {}, { subAppId } = {}) => {
  const payload = {
    SubAppId: subAppId,
    ModelName: body.ModelName,
    ModelVersion: body.ModelVersion,
    ...(body.FileInfos && body.FileInfos.length > 0 ? { FileInfos: body.FileInfos } : {}),
    ...(isPresent(body.LastFrameUrl) ? { LastFrameUrl: body.LastFrameUrl } : {}),
    ...(isPresent(body.Prompt) ? { Prompt: body.Prompt } : {}),
    ...(isPresent(body.NegativePrompt) ? { NegativePrompt: body.NegativePrompt } : {}),
    ...(isPresent(body.EnhancePrompt) ? { EnhancePrompt: body.EnhancePrompt } : {}),
    ...(body.SubjectInfos && body.SubjectInfos.length > 0 ? { SubjectInfos: body.SubjectInfos } : {}),
    ...(isPresent(body.ExtInfo) ? { ExtInfo: body.ExtInfo } : {}),
    ...(isPresent(body.Seed) ? { Seed: body.Seed } : {}),
    ...(isPresent(body.SessionId) ? { SessionId: body.SessionId } : {}),
    ...(isPresent(body.SessionContext) ? { SessionContext: body.SessionContext } : {}),
    ...(isPresent(body.SceneType) ? { SceneType: body.SceneType } : {}),
    ...(isPresent(body.InputRegion) ? { InputRegion: body.InputRegion } : {}),
    OutputConfig: buildOutputConfig(body.OutputConfig, VIDEO_OUTPUT_KEYS),
  };
  return payload;
};

/**
 * 构建 CreateAigcImageTask 参数
 */
const buildImageTaskPayload = (body = {}, { subAppId } = {}) => {
  const payload = {
    SubAppId: subAppId,
    ModelName: body.ModelName,
    ModelVersion: body.ModelVersion,
    ...(body.FileInfos && body.FileInfos.length > 0 ? { FileInfos: body.FileInfos } : {}),
    ...(isPresent(body.Prompt) ? { Prompt: body.Prompt } : {}),
    ...(isPresent(body.NegativePrompt) ? { NegativePrompt: body.NegativePrompt } : {}),
    ...(isPresent(body.EnhancePrompt) ? { EnhancePrompt: body.EnhancePrompt } : {}),
    ...(isPresent(body.ExtInfo) ? { ExtInfo: body.ExtInfo } : {}),
    ...(isPresent(body.SessionId) ? { SessionId: body.SessionId } : {}),
    ...(isPresent(body.SessionContext) ? { SessionContext: body.SessionContext } : {}),
    ...(isPresent(body.SceneType) ? { SceneType: body.SceneType } : {}),
    ...(isPresent(body.InputRegion) ? { InputRegion: body.InputRegion } : {}),
    OutputConfig: buildOutputConfig(body.OutputConfig, IMAGE_OUTPUT_KEYS),
  };
  return payload;
};

/**
 * 构建 CreateAigcAudioTask 参数
 */
const buildAudioTaskPayload = (body = {}, { subAppId } = {}) => {
  const payload = {
    SubAppId: subAppId,
    ...(isPresent(body.ModelName) ? { ModelName: body.ModelName } : {}),
    ...(isPresent(body.ModelVersion) ? { ModelVersion: body.ModelVersion } : {}),
    ...(isPresent(body.SceneType) ? { SceneType: body.SceneType } : {}),
    ...(isPresent(body.Prompt) ? { Prompt: body.Prompt } : {}),
    ...(body.VideoInfos && body.VideoInfos.length > 0 ? { VideoInfos: body.VideoInfos } : {}),
    ...(body.AudioInfos && body.AudioInfos.length > 0 ? { AudioInfos: body.AudioInfos } : {}),
    ...(isPresent(body.AdditionalParameters) ? { AdditionalParameters: body.AdditionalParameters } : {}),
    OutputConfig: buildOutputConfig(body.OutputConfig, AUDIO_OUTPUT_KEYS, { includeCompliance: false }),
  };
  return payload;
};

module.exports = {
  buildVideoTaskPayload,
  buildImageTaskPayload,
  buildAudioTaskPayload,
  buildOutputConfig,
};
