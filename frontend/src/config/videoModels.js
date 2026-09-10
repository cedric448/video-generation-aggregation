// =====================================================================
// 视频生成模型能力配置
// 依据《【通用】VOD AIGC服务接入指南》整理（更新至 2026.09.10）
//
// 版本级能力（versionCapabilities）可覆盖模型级字段：
//   supportsLastFrame     是否支持尾帧（首尾帧生视频）
//   supportsAudio         是否支持 OutputConfig.AudioGeneration
//   supportsAspectRatio   是否支持宽高比
//   aspectRatio           版本级宽高比 { options, default, note }
//   resolution            版本级分辨率 { options, default }
//   duration              版本级时长配置 { options, default, min, max, freeInput, unit, note }
//   maxImages             参考图片上限
//   maxVideos             参考视频上限
//   maxAudios             参考音频上限
//   fileUsageMode         'firstFrame' | 'reference'，单文件时默认 Usage 取值
//   forceReference        单文件强制使用 Usage=Reference（仅参考生模型）
//   audioWithLastFrame    首尾帧模式下是否允许有声
//   fixedSceneType        固定 SceneType（如混元 3d_scene）
// =====================================================================

export const VIDEO_MODEL_CONFIG = {
  Hailuo: {
    label: '海螺 (Hailuo)',
    versions: ['H3-Max', 'H3', 'H3_regen', '2.3-fast', '2.3', '02'],
    defaultVersion: 'H3-Max',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['768P', '1080P'], default: '768P' },
    duration: { options: [6, 10], default: 6, unit: '秒' },
    versionCapabilities: {
      // 2026.09.04 上新：文生、图生（首帧/尾帧/首尾帧），不支持参考生
      'H3-Max': {
        supportsLastFrame: true,
        supportsAudio: true,
        supportsAspectRatio: true,
        aspectRatio: { options: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9', note: '图生视频时宽高比由输入图片决定' },
        resolution: { options: ['768P', '1080P', '2K', '4K'], default: '768P' },
        duration: { options: [], default: 6, min: 5, max: 15, freeInput: true, unit: '秒' },
        maxImages: 1,
        note: 'H3-Max：文生、首帧/尾帧/首尾帧图生；不支持参考生；1080P/2K/4K 为超分输出',
      },
      // 2026.07.31 上新：文生、图生（首帧/尾帧/首尾帧）、多模态参考生
      H3: {
        supportsLastFrame: true,
        supportsAudio: true,
        supportsAspectRatio: true,
        aspectRatio: { options: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'], default: '16:9', note: '图生视频时宽高比由输入图片决定' },
        resolution: { options: ['768P', '1080P', '2K', '4K'], default: '768P' },
        duration: { options: [], default: 6, min: 4, max: 15, freeInput: true, unit: '秒' },
        maxImages: 9,
        maxVideos: 3,
        maxAudios: 3,
        note: 'H3：多模态参考生（图≤9、视频≤3 段、音频≤3 段；音频不能单独输入，单段视频/音频 2-15 秒且总时长≤15 秒）',
      },
      // 2026.08.19 上新：视频再生成
      H3_regen: {
        supportsAudio: false,
        supportsAspectRatio: false,
        resolution: { options: ['2K', '4K'], default: '2K' },
        duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
        maxImages: 1,
        maxVideos: 1,
        fileUsageMode: 'reference',
        note: 'H3_regen：视频再生成，可通过 ExtInfo 传 RegenSourceTaskId，或上传源视频（ReferenceType=base_video）',
      },
      '2.3-fast': {},
      '2.3': {},
      '02': {},
    },
  },
  Kling: {
    label: '可灵 (Kling)',
    versions: ['3.0-Omni', '3.0', '3.0-turbo', '2.6', '2.5', '2.1', '2.0', '1.6', 'O1'],
    defaultVersion: '3.0-Omni',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: true,
    supportsAudio: true,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [5, 10], default: 5, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16', '1:1'], default: '16:9', note: '仅文生视频时可用' },
    sceneTypes: [
      { value: '', label: '默认' },
      { value: 'motion_control', label: '动作控制 (motion_control)' },
      { value: 'avatar_i2v', label: '数字人 (avatar_i2v)' },
      { value: 'lip_sync', label: '对口型 (lip_sync)' },
    ],
    versionCapabilities: {
      // 全模态全能版：参考生图 ≤8 张、支持视频参考、首尾帧 3-15s、4K
      '3.0-Omni': {
        supportsLastFrame: true,
        maxImages: 8,
        maxVideos: 1,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
        duration: { options: [], default: 5, min: 3, max: 15, freeInput: true, unit: '秒' },
        note: '3.0-Omni：支持参考生（图≤8）、视频参考、首尾帧；4K 需开通白名单',
      },
      // 基础旗舰版：图生（单图、首尾帧），不支持参考生
      '3.0': {
        supportsLastFrame: true,
        maxImages: 1,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
        duration: { options: [], default: 5, min: 3, max: 15, freeInput: true, unit: '秒' },
        note: '3.0：文生、图生（首帧/首尾帧），不支持参考生；4K 需开通白名单',
      },
      // 2026.06.18 上新：文生、图生（仅一张输入图），支持主体参考
      '3.0-turbo': {
        supportsLastFrame: false,
        maxImages: 1,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
        duration: { options: [], default: 5, min: 3, max: 15, freeInput: true, unit: '秒' },
        note: '3.0-turbo：文生、图生（仅一张输入图），支持主体参考；宽高比仅文生视频支持',
      },
      // 经典版：首尾帧仅无声；参考生视频 + 1080P 支持音频
      '2.6': {
        supportsLastFrame: true,
        audioWithLastFrame: false,
        maxImages: 4,
        maxVideos: 1,
        resolution: { options: ['720P', '1080P'], default: '720P' },
        duration: { options: [5, 10], default: 5, unit: '秒' },
        note: '2.6：首尾帧时仅支持无声；参考生视频 + 1080P 支持音频',
      },
      '2.5': { supportsLastFrame: false, fileUsageMode: 'firstFrame', maxImages: 3 },
      '2.1': { supportsLastFrame: true, fileUsageMode: 'firstFrame', maxImages: 1, note: '首尾帧仅 1080P 支持' },
      '2.0': { supportsLastFrame: false, fileUsageMode: 'firstFrame', maxImages: 1 },
      '1.6': { supportsLastFrame: false, fileUsageMode: 'firstFrame', maxImages: 1 },
      // 轻量化高效版：3-10s，参考生图 ≤4
      O1: {
        supportsLastFrame: false,
        maxImages: 4,
        duration: { options: [], default: 5, min: 3, max: 10, freeInput: true, unit: '秒' },
      },
    },
  },
  Jimeng: {
    label: '即梦 (Jimeng)',
    versions: ['3.0pro'],
    defaultVersion: '3.0pro',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
  },
  Vidu: {
    label: 'Vidu',
    versions: ['q3-pro', 'q3', 'q3-turbo', 'q3-mix', 'q3-drama', 'q3-ad', 'q2', 'q2-pro', 'q2-turbo', 'avatar-q2-pro', 'avatar-q2-turbo', 'lip-sync'],
    defaultVersion: 'q3-pro',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: true,
    supportsAudio: true,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: 5, min: 1, max: 10, freeInput: true, unit: '秒' },
    aspectRatio: {
      options: ['16:9', '9:16', '4:3', '3:4', '1:1'],
      default: '16:9',
      note: '4:3 / 3:4 仅 q2 版本支持',
    },
    sceneTypes: [
      { value: '', label: '默认' },
      { value: 'template_effect', label: '特效模板 (template_effect)' },
    ],
    versionCapabilities: {
      // q3-pro：文生 + 图生（首帧/首尾帧），不支持参考生
      'q3-pro': {
        supportsLastFrame: true,
        maxImages: 1,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
      },
      // q3：参考生（非主体 + 主体）、文生，多机位一致性更出色
      q3: {
        supportsLastFrame: false,
        maxImages: 7,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
      },
      // q3-turbo：生成速度最快，支持首尾帧 + 参考生
      'q3-turbo': {
        supportsLastFrame: true,
        maxImages: 7,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
      },
      // q3-mix：只支持参考生（非主体模式）
      'q3-mix': {
        forceReference: true,
        maxImages: 7,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
        note: 'q3-mix 仅支持参考生视频（Usage=Reference），不支持主体库调用',
      },
      // 2026.06.18 上新：漫剧行业模型，参考图 1-14 张，8-12 秒
      'q3-drama': {
        supportsLastFrame: false,
        maxImages: 14,
        maxVideos: 0,
        resolution: { options: ['1080P', '2K', '4K'], default: '1080P' },
        duration: { options: [], default: 10, min: 8, max: 12, freeInput: true, unit: '秒' },
        aspectRatio: { options: ['9:16', '16:9'], default: '9:16' },
        note: 'q3-drama：参考图 1-14 张，8-12 秒，支持主体调用',
      },
      // 2026.06.18 上新：广告行业模型，参考图 1-7 张，3-16 秒
      'q3-ad': {
        supportsLastFrame: false,
        maxImages: 7,
        maxVideos: 0,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
        duration: { options: [], default: 8, min: 3, max: 16, freeInput: true, unit: '秒' },
        aspectRatio: { options: ['1:1', '9:16', '16:9', '3:4', '4:3'], default: '16:9' },
        note: 'q3-ad：参考图 1-7 张，3-16 秒，支持主体调用',
      },
      // q2：多图参考（1-7 张），支持 4:3 / 3:4
      q2: { supportsLastFrame: false, maxImages: 7 },
      // q2-pro：首尾帧 + 参考生（唯一支持视频主体）
      'q2-pro': { supportsLastFrame: true, maxImages: 7, maxVideos: 1 },
      'q2-turbo': { supportsLastFrame: true, maxImages: 1 },
      // 2026.07.23 上新：数字人（图片 + 音频 / 音色 id + 文本）
      'avatar-q2-pro': {
        supportsAspectRatio: false,
        maxImages: 1,
        maxAudios: 1,
        duration: { options: [], default: null, unit: '秒', note: '由输入音频决定' },
        note: '数字人：参考图片 + 参考音频，或在 ExtInfo 中传 text / voice_id',
      },
      'avatar-q2-turbo': {
        supportsAspectRatio: false,
        maxImages: 1,
        maxAudios: 1,
        duration: { options: [], default: null, unit: '秒', note: '由输入音频决定' },
        note: '数字人：参考图片 + 参考音频，或在 ExtInfo 中传 text / voice_id',
      },
      // 2026.08.03 上新：对口型（视频 + 音频 + 人脸图，或视频 + 人脸图 + 文本/音色）
      'lip-sync': {
        supportsAspectRatio: false,
        maxImages: 1,
        maxVideos: 1,
        maxAudios: 1,
        duration: { options: [], default: null, unit: '秒', note: '由输入视频决定' },
        note: '对口型：视频 + 音频 + 人脸图；或在 ExtInfo 中传 voice_id / speed / volume',
      },
    },
  },
  GV: {
    label: 'Google Veo (GV)',
    versions: ['omni', '3.1', '3.1-fast', '3.1-lite'],
    defaultVersion: 'omni',
    supportsImageInput: true,
    supportsLastFrame: true,
    supportsAspectRatio: true,
    supportsAudio: true,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [8], default: 8, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16'], default: '16:9' },
    versionCapabilities: {
      // 2026.07.09 上新：文生、图生、参考生、有状态视频编辑
      omni: {
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '1080P' },
        duration: { options: [], default: 8, min: 3, max: 10, freeInput: true, unit: '秒' },
        maxImages: 7,
        maxVideos: 5,
        lastFrameDisabledWhenMultiple: true,
        note: 'omni：参考图/视频总配额 7（搭配视频时图片最多 5 张），视频时长≤3 秒；通过 ExtInfo 传 PreviousTaskId 可实现有状态视频编辑；音画同出，不可上传外部音频',
      },
      '3.1': { maxImages: 3, lastFrameDisabledWhenMultiple: true },
      '3.1-fast': { maxImages: 3, lastFrameDisabledWhenMultiple: true },
      '3.1-lite': {
        resolution: { options: ['720P'], default: '720P' },
        maxImages: 3,
        lastFrameDisabledWhenMultiple: true,
      },
    },
  },
  Hunyuan: {
    label: '混元 (Hunyuan)',
    versions: ['3d_2.0', '1.5'],
    defaultVersion: '3d_2.0',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
    versionCapabilities: {
      // 2026.05.07 上新：混元 3D 世界模型（SceneType=3d_scene）
      '3d_2.0': {
        fixedSceneType: '3d_scene',
        supportsAudio: true,
        resolution: { options: ['720P', '1080P'], default: '1080P' },
        duration: { options: [], default: 16, min: 5, max: 30, freeInput: true, unit: '秒', note: '由模型决定，示例值 16 秒' },
        note: '混元 3D 世界模型：文生 3D / 图生 3D，输出 3DGS/Mesh 场景；生 3D 场景 200 元/次',
      },
      '1.5': {},
    },
  },
  Mingmou: {
    label: '明眸 (Mingmou)',
    versions: ['1.0'],
    defaultVersion: '1.0',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: false,
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
  },
  Seedance: {
    label: '豆包 (Seedance)',
    versions: ['1.5-pro', '1.0-pro', '1.0-pro-fast', '1.0-lite-i2v'],
    defaultVersion: '1.5-pro',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: false,
    supportsAudio: true, // 仅 1.5-pro 支持有声/无声
    fileUsageMode: 'firstFrame',
    resolution: { options: ['720P', '1080P'], default: '720P' },
    duration: { options: [], default: null, unit: '秒', note: '由模型决定' },
    versionCapabilities: {
      '1.5-pro': { supportsAudio: true, maxResolution: '720P' }, // 不支持 1080P
      '1.0-pro': { supportsAudio: false },
      '1.0-pro-fast': { supportsAudio: false },
      '1.0-lite-i2v': { supportsAudio: false },
    },
  },
  OS: {
    label: 'OpenAI Sora (OS)',
    versions: ['2.0'],
    defaultVersion: '2.0',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: true,
    supportsAudio: false, // UI 不显示开关；提交时固定 AudioGeneration: 'Enabled'
    audioAlwaysEnabled: true,
    resolution: { options: ['720P'], default: '720P' },
    duration: { options: [4, 8, 12], default: 8, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16'], default: '16:9', note: '仅文生视频时可用' },
  },
  Pixverse: {
    label: 'Pixverse (爱诗)',
    versions: ['C1', 'V6.0', 'V5.6', 'lip_sync'],
    defaultVersion: 'C1',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: true,
    supportsAudio: false,
    resolution: { options: ['360P', '540P', '720P', '1080P'], default: '720P' },
    duration: { options: [], default: 5, min: 1, max: 15, freeInput: true, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16', '1:1', '4:3', '3:4'], default: '16:9' },
    versionCapabilities: {
      // v6：旗舰商用模型，7 张参考图，音画同出，1-15 秒
      'V6.0': {
        supportsAudio: true,
        maxImages: 7,
        maxVideos: 0,
        duration: { options: [], default: 5, min: 1, max: 15, freeInput: true, unit: '秒' },
        note: 'v6：参考生视频（多图主体，可配合 Text 命名），音画同出',
      },
      // C1：影视级模型，参考生 + 参考视频
      C1: {
        supportsAudio: true,
        maxImages: 7,
        maxVideos: 1,
        duration: { options: [], default: 5, min: 1, max: 15, freeInput: true, unit: '秒' },
        note: 'C1：参考生视频、参考视频，音画同出',
      },
      // v5.6：上一代稳定版，5/8/10 秒（1080P 不支持 10 秒）
      'V5.6': {
        supportsAudio: false,
        maxImages: 7,
        maxVideos: 0,
        duration: { options: [5, 8, 10], default: 5, unit: '秒' },
        note: 'v5.6：1080P 不支持 10 秒',
      },
      // 2026.07.23 上新：对口型
      lip_sync: {
        supportsAspectRatio: false,
        maxImages: 0,
        maxVideos: 1,
        maxAudios: 1,
        duration: { options: [], default: null, unit: '秒', note: '由输入视频决定' },
        note: '对口型：参考视频 + 参考音频；或在 ExtInfo 中传 lip_sync_tts_content / lip_sync_tts_speaker_id',
      },
    },
  },
  H2: {
    label: '快乐马 (H2)',
    versions: ['1.1', '1.0'],
    defaultVersion: '1.1',
    supportsImageInput: true,
    supportsLastFrame: false,
    supportsAspectRatio: true,
    supportsAudio: true,
    fileUsageMode: 'reference',
    resolution: { options: ['720P', '1080P', '2K', '4K'], default: '720P' },
    duration: { options: [], default: 5, min: 3, max: 15, freeInput: true, unit: '秒' },
    aspectRatio: { options: ['16:9', '9:16', '1:1', '3:4', '4:3'], default: '16:9' },
    versionCapabilities: {
      // 2026.06.24 上新
      '1.1': {
        maxImages: 9,
        maxVideos: 0,
        aspectRatio: { options: ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9'], default: '16:9' },
        note: 'H2 1.1：文生、图生（仅首帧）、参考生（1-9 张），时长 3-15 秒',
      },
      '1.0': { maxImages: 9, maxVideos: 0 },
    },
  },
  // 2026.09.01 上新：万相 3.0 全能参考视频生成模型
  Wan: {
    label: '万相 (Wan)',
    versions: ['3.0', '3.0-prime'],
    defaultVersion: '3.0',
    supportsImageInput: true,
    supportsLastFrame: true,
    supportsAspectRatio: true,
    supportsAudio: true,
    resolution: { options: ['480P', '720P', '1080P', '2K', '4K'], default: '720P' },
    duration: { options: [], default: 5, min: 2, max: 30, freeInput: true, unit: '秒' },
    aspectRatio: { options: ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16'], default: 'adaptive' },
    versionCapabilities: {
      '3.0': {
        maxImages: 10,
        maxVideos: 5,
        maxAudios: 5,
        maxVideoRefDuration: 15,
        note: 'Wan 3.0：首帧/首尾帧、多模态参考生（图≤10、视频≤5 段总时长≤15 秒、音频≤5 段总时长≤15 秒）；最长 30 秒；2K/4K 为超分输出',
      },
      '3.0-prime': {
        maxImages: 10,
        maxVideos: 5,
        maxAudios: 5,
        maxVideoRefDuration: 15,
        note: 'Wan 3.0-prime：能力对齐 3.0，端到端速度显著提升',
      },
    },
  },
};

// 合并模型级 + 版本级能力
export const getVideoVersionCaps = (modelName, version) => {
  const modelCfg = VIDEO_MODEL_CONFIG[modelName];
  if (!modelCfg) return {};
  const base = {
    supportsLastFrame: !!modelCfg.supportsLastFrame,
    supportsAudio: !!modelCfg.supportsAudio,
    supportsAspectRatio: !!modelCfg.supportsAspectRatio,
    maxImages: modelCfg.defaultMaxImages ?? 1,
    maxVideos: modelCfg.defaultMaxVideos ?? 0,
    maxAudios: modelCfg.defaultMaxAudios ?? 0,
    fileUsageMode: modelCfg.fileUsageMode,
    audioAlwaysEnabled: !!modelCfg.audioAlwaysEnabled,
    audioWithLastFrame: modelCfg.audioWithLastFrame !== false,
  };
  const vCap = modelCfg.versionCapabilities?.[version] || {};
  const caps = { ...base, ...vCap };
  if (caps.maxImages == null) caps.maxImages = 1;
  if (caps.maxVideos == null) caps.maxVideos = 0;
  if (caps.maxAudios == null) caps.maxAudios = 0;
  return caps;
};

// 分辨率选项（版本级优先）
export const getVideoResolutionConfig = (modelName, version) => {
  const caps = getVideoVersionCaps(modelName, version);
  return caps.resolution || VIDEO_MODEL_CONFIG[modelName]?.resolution || { options: ['720P'], default: '720P' };
};

// 时长配置（版本级优先）
export const getVideoDurationConfig = (modelName, version) => {
  const caps = getVideoVersionCaps(modelName, version);
  return caps.duration || VIDEO_MODEL_CONFIG[modelName]?.duration || { options: [], default: null, note: '由模型决定' };
};

// 宽高比配置
export const getVideoAspectRatioConfig = (modelName, version) => {
  const modelCfg = VIDEO_MODEL_CONFIG[modelName];
  const caps = getVideoVersionCaps(modelName, version);
  if (!(caps.supportsAspectRatio ?? modelCfg?.supportsAspectRatio)) return null;
  return caps.aspectRatio || modelCfg?.aspectRatio || null;
};

const CATEGORY_BY_TYPE = { image: 'Image', video: 'Video', audio: 'Audio' };

const toCategory = (file) => {
  if (file.category && CATEGORY_BY_TYPE[file.category.toLowerCase()]) {
    return CATEGORY_BY_TYPE[file.category.toLowerCase()];
  }
  return CATEGORY_BY_TYPE[file.type] || 'Image';
};

/**
 * 构建视频任务 FileInfos
 * 规则（依据文档）：
 *   - 首帧：Usage=FirstFrame；尾帧：Usage=LastFrame（推荐方式1，直接放入 FileInfos）
 *   - 参考帧：Usage=Reference（单图参考生也必须显式传 Reference）
 *   - 多素材（多图 / 含视频音频）统一按参考帧模式
 * @param {Object} options
 * @param {Array} options.files - [{ url, type: 'image'|'video'|'audio' }]
 * @param {Object} [options.lastFrameFile] - 尾帧文件
 * @param {string} [options.referenceType] - FileInfos.ReferenceType（feature/base/base_video/subject/background/asset/style）
 * @param {Array<string>} [options.fileTexts] - 每个素材的名称（FileInfos.Text，PixVerse 多主体参考可用）
 */
export const buildVideoFileInfos = ({ modelName, version, files = [], lastFrameFile = null, referenceType, fileTexts = [] } = {}) => {
  const caps = getVideoVersionCaps(modelName, version);
  const result = [];
  const hasNonImage = files.some((f) => toCategory(f) !== 'Image');
  const multi = files.length > 1 || hasNonImage;
  const extras = referenceType ? { ReferenceType: referenceType } : {};

  const withText = (info, index) => {
    const text = fileTexts?.[index];
    return text ? { ...info, Text: text } : info;
  };

  if (multi) {
    files.forEach((f, index) => {
      result.push(withText({ Type: 'Url', Url: f.url, Category: toCategory(f), Usage: 'Reference', ...extras }, index));
    });
  } else if (files.length === 1) {
    const single = files[0];
    const useFirstFrame =
      !caps.forceReference &&
      (caps.fileUsageMode === 'firstFrame' || (caps.fileUsageMode !== 'reference' && caps.supportsLastFrame));
    result.push(
      withText(
        {
          Type: 'Url',
          Url: single.url,
          Category: toCategory(single),
          Usage: useFirstFrame ? 'FirstFrame' : 'Reference',
          ...extras,
        },
        0
      )
    );
  }

  if (lastFrameFile && !multi) {
    result.push({ Type: 'Url', Url: lastFrameFile.url, Category: 'Image', Usage: 'LastFrame' });
  }

  return result.length > 0 ? result : undefined;
};

/**
 * 构建视频 OutputConfig
 */
export const buildVideoOutputConfig = ({
  resolution,
  duration,
  aspectRatio,
  storageMode,
  personGeneration,
  inputComplianceCheck,
  outputComplianceCheck,
  audioGeneration,
  enhanceSwitch,
  frameInterpolate,
  offPeak,
  logoAdd,
  supportsAspectRatio,
  supportsAudio,
  audioAlwaysEnabled,
  forceNoAudio,
} = {}) => {
  const outputConfig = {
    StorageMode: storageMode || 'Permanent',
    ...(resolution ? { Resolution: resolution } : {}),
    PersonGeneration: personGeneration || 'AllowAdult',
    InputComplianceCheck: inputComplianceCheck || 'Disabled',
    OutputComplianceCheck: outputComplianceCheck || 'Disabled',
  };
  if (duration) outputConfig.Duration = Number(duration);
  if (aspectRatio && supportsAspectRatio) outputConfig.AspectRatio = aspectRatio;
  if (audioAlwaysEnabled) {
    outputConfig.AudioGeneration = 'Enabled';
  } else if (supportsAudio && !forceNoAudio && audioGeneration) {
    outputConfig.AudioGeneration = audioGeneration;
  }
  if (enhanceSwitch) outputConfig.EnhanceSwitch = enhanceSwitch;
  if (frameInterpolate) outputConfig.FrameInterpolate = frameInterpolate;
  if (offPeak) outputConfig.OffPeak = offPeak;
  if (logoAdd) outputConfig.LogoAdd = logoAdd;
  return outputConfig;
};

/**
 * 构建视频任务请求体
 */
export const buildVideoTaskData = ({
  modelName,
  version,
  files,
  lastFrameFile,
  prompt,
  negativePrompt,
  enhancePrompt,
  outputConfig,
  inputRegion,
  sceneType,
  extInfo,
  subjectInfos,
  referenceType,
  fileTexts,
} = {}) => {
  const caps = getVideoVersionCaps(modelName, version);
  const fileInfos = buildVideoFileInfos({ modelName, version, files, lastFrameFile, referenceType, fileTexts });
  const effectiveSceneType = caps.fixedSceneType || sceneType;
  return {
    ModelName: modelName,
    ModelVersion: version,
    ...(fileInfos ? { FileInfos: fileInfos } : {}),
    ...(prompt ? { Prompt: prompt } : {}),
    ...(negativePrompt ? { NegativePrompt: negativePrompt } : {}),
    EnhancePrompt: enhancePrompt || 'Enabled',
    OutputConfig: outputConfig,
    InputRegion: inputRegion || 'Mainland',
    ...(effectiveSceneType ? { SceneType: effectiveSceneType } : {}),
    ...(extInfo ? { ExtInfo: extInfo } : {}),
    ...(subjectInfos && subjectInfos.length > 0 ? { SubjectInfos: subjectInfos } : {}),
  };
};

/**
 * 解析固定主体输入："id1,id2:名称"
 * @returns {Array<{Id: string, Name?: string}>|undefined}
 */
export const parseSubjectInfos = (input) => {
  if (!input || !String(input).trim()) return undefined;
  const items = String(input)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const [id, name] = item.split(':').map((s) => s.trim());
      return name ? { Id: id, Name: name } : { Id: id };
    });
  return items.length > 0 ? items : undefined;
};

/**
 * 解析素材命名（逗号分隔，按顺序对应每个参考素材，用于 PixVerse 多主体 @名称 引用）
 * @returns {Array<string>|undefined}
 */
export const parseFileTexts = (input) => {
  if (!input || !String(input).trim()) return undefined;
  const items = String(input)
    .split(',')
    .map((s) => s.trim());
  return items.length > 0 ? items : undefined;
};

/**
 * 规范化 ExtInfo（支持 JSON 对象字符串或普通字符串）
 * @throws {Error} JSON 非法时抛出
 */
export const normalizeExtInfo = (input) => {
  if (!input || !String(input).trim()) return undefined;
  const trimmed = String(input).trim();
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
  } catch (e) {
    throw new Error('ExtInfo 必须是合法的 JSON 字符串');
  }
};
