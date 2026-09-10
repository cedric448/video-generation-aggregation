// =====================================================================
// 图片生成模型能力配置
// 依据《【通用】VOD AIGC服务接入指南》整理（更新至 2026.09.10）
//
// 版本级能力（versionCapabilities）可覆盖/补充模型级字段：
//   maxImages             参考图上限
//   allowedFormats        允许的图片格式（默认 jpeg/jpg/png）
//   resolution            版本级分辨率 { options, default }
//   aspectRatio           版本级宽高比 { options, default }
//   outputImageCount      单次生成图片张数上限（Kling 1-9 / OG 1-8）
//   supportsOutputFormat  是否支持 OutputConfig.OutputFormat
//   supportsMask          OG 图片编辑蒙版（FileInfos.ReferenceType=mask）
//   fixedSceneType        固定 SceneType（Kling scene=image_expand / Hunyuan 3d_2.0=3d_panorama）
// =====================================================================

export const IMAGE_MODEL_CONFIG = {
  GEM: {
    label: 'GEM (Gemini)',
    versions: ['2.5', '3.0', '3.1', '3.1-lite'],
    defaultVersion: '3.1-lite',
    versionLabels: {
      '2.5': '2.5 (nano banana)',
      '3.0': '3.0 (nano banana pro)',
      '3.1': '3.1 (nano banana2)',
      '3.1-lite': '3.1-lite (nano banana 2 lite)',
    },
    supportsAspectRatio: true,
    aspectRatio: { options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'], default: '1:1' },
    versionCapabilities: {
      '2.5': { maxImages: 3, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' } },
      '3.0': { maxImages: 3, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' } },
      '3.1': { maxImages: 3, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'] },
      // 2026.07.08 上新：只支持 1K 直出，2K/4K 超分
      '3.1-lite': {
        maxImages: 3,
        allowedFormats: ['jpeg', 'jpg', 'png', 'webp'],
        resolution: { options: ['1K', '2K', '4K'], default: '1K' },
        note: '3.1-lite：1K 直出，2K/4K 为超分输出',
      },
    },
  },
  Qwen: {
    label: 'Qwen (千问)',
    versions: ['0925'],
    defaultVersion: '0925',
    supportsAspectRatio: false,
    versionCapabilities: {
      '0925': { maxImages: 1 },
    },
  },
  Seedream: {
    label: 'Seedream (豆包)',
    versions: ['5.0-lite', '4.5'],
    defaultVersion: '5.0-lite',
    supportsAspectRatio: false, // Seedream 不支持 AspectRatio/Resolution，否则会触发尺寸不足报错
    versionCapabilities: {
      '5.0-lite': { maxImages: 1 },
      '4.5': { maxImages: 1 },
    },
  },
  // 文档 1.1.1：SI（豆包，计费文档 SI），传参请联系商务
  SI: {
    label: 'SI (豆包)',
    versions: ['5.0-pro', '5.0-lite', '4.5', 'layer-5.0-pro'],
    defaultVersion: '5.0-pro',
    supportsAspectRatio: false,
    versionCapabilities: {
      // 2026.07.16 上新：1K、2K（超分）、4K（超分）
      '5.0-pro': {
        maxImages: 1,
        resolution: { options: ['1K', '2K', '4K'], default: '1K' },
        note: '1K 直出，2K/4K 为超分输出；传参请联系商务开通',
      },
      '5.0-lite': { maxImages: 1, note: '传参请联系商务开通' },
      '4.5': { maxImages: 1, note: '传参请联系商务开通' },
      'layer-5.0-pro': { maxImages: 1, note: '图层版，传参请联系商务开通' },
    },
  },
  Kling: {
    label: 'Kling (可灵)',
    versions: ['3.0-Omni', '3.0', '2.1', 'O1', 'scene'],
    defaultVersion: '3.0-Omni',
    supportsAspectRatio: true,
    aspectRatio: { options: ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'], default: '1:1' },
    versionCapabilities: {
      '3.0-Omni': { maxImages: 1, resolution: { options: ['1K', '2K'], default: '1K' }, outputImageCount: { min: 1, max: 9 } },
      '3.0': { maxImages: 1, resolution: { options: ['1K', '2K'], default: '1K' }, outputImageCount: { min: 1, max: 9 } },
      '2.1': { maxImages: 1, resolution: { options: ['1K', '2K'], default: '1K' }, outputImageCount: { min: 1, max: 9 } },
      O1: { maxImages: 1, resolution: { options: ['1K', '2K'], default: '1K' }, outputImageCount: { min: 1, max: 9 } },
      // 2026.01.30 上新：扩图（SceneType=image_expand，ExtInfo 传扩图比例）
      scene: {
        maxImages: 1,
        supportsAspectRatio: false,
        resolution: null,
        outputImageCount: { min: 1, max: 9 },
        fixedSceneType: 'image_expand',
        note: '扩图：仅 1 张输入图；ExtInfo 传 up/down/left/right_expansion_ratio（取值 [0,2]，新图面积不超过原图 3 倍）',
      },
    },
  },
  Vidu: {
    label: 'Vidu',
    versions: ['q2'],
    defaultVersion: 'q2',
    supportsAspectRatio: true,
    aspectRatio: { options: ['16:9', '9:16', '1:1', '3:4', '4:3', '21:9', '2:3', '3:2'], default: '1:1' },
    versionCapabilities: {
      q2: { maxImages: 7, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1080P', '2K', '4K'], default: '1080P' } },
    },
  },
  Jimeng: {
    label: 'Jimeng (即梦)',
    versions: ['4.0'],
    defaultVersion: '4.0',
    supportsAspectRatio: true,
    aspectRatio: { options: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2'], default: '1:1' },
    versionCapabilities: {
      '4.0': { maxImages: 1 },
    },
  },
  Hunyuan: {
    label: 'Hunyuan (混元)',
    versions: ['3.0', '3d_2.0', '3.5-preview'],
    defaultVersion: '3.0',
    supportsAspectRatio: true,
    aspectRatio: { options: ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'], default: '1:1' },
    versionCapabilities: {
      '3.0': {
        maxImages: 1,
        resolution: { options: ['720P', '1080P', '2K', '4K'], default: '720P' },
        note: 'ExtInfo 支持自由设置宽高（宽高均在 [512, 2048]，乘积 ≤ 1024x1024）',
      },
      // 2026.05.07 上新：混元全景图（SceneType=3d_panorama，5 元/次）
      '3d_2.0': {
        maxImages: 1,
        supportsAspectRatio: false,
        resolution: null,
        fixedSceneType: '3d_panorama',
        note: '360 全景图：文生 / 图生 360° ERP 全景图，5 元/次',
      },
      '3.5-preview': { maxImages: 1, resolution: { options: ['1K', '2K', '4K'], default: '1K' } },
    },
  },
  // 2026.07.23 上新 v8.1 / niji_7，2026.08.03 上新 v8.2；参数通过 Prompt 指定
  MJ: {
    label: 'MJ (Midjourney)',
    versions: ['v8.2', 'v8.1', 'niji_7', 'v7'],
    defaultVersion: 'v8.2',
    supportsAspectRatio: false, // 宽高比等参数通过 Prompt 指定，如 --ar 16:9
    versionCapabilities: {
      'v8.2': { maxImages: 1, note: '宽高比 / 画质等参数通过 Prompt 指定（--ar / --q / --style 等），单次固定生成 4 张' },
      'v8.1': { maxImages: 1, note: '参数通过 Prompt 指定，单次固定生成 4 张' },
      niji_7: { maxImages: 1, note: '二次元专用模型，参数通过 Prompt 指定，单次固定生成 4 张' },
      v7: { maxImages: 1, note: '参数通过 Prompt 指定，单次固定生成 4 张' },
    },
  },
  OG: {
    label: 'GPT-Image (OG)',
    versions: [
      'image2.5_sunburst_medium',
      'image2.5_sunburst_low',
      'image2.5_sunburst_high',
      'image2.5_sunburst_xhigh',
      'image2.5_sunburst_max',
      'image2.5_flare_medium',
      'image2.5_flare_low',
      'image2.5_flare_high',
      'image2.5_flare_xhigh',
      'image2.5_flare_max',
      'image2_medium',
      'image2_low',
      'image2_high',
    ],
    defaultVersion: 'image2.5_flare_medium',
    versionLabels: {
      'image2.5_sunburst_low': '2.5 Sunburst 低',
      'image2.5_sunburst_medium': '2.5 Sunburst 中',
      'image2.5_sunburst_high': '2.5 Sunburst 高',
      'image2.5_sunburst_xhigh': '2.5 Sunburst 超高',
      'image2.5_sunburst_max': '2.5 Sunburst 最高',
      'image2.5_flare_low': '2.5 Flare 低',
      'image2.5_flare_medium': '2.5 Flare 中',
      'image2.5_flare_high': '2.5 Flare 高',
      'image2.5_flare_xhigh': '2.5 Flare 超高',
      'image2.5_flare_max': '2.5 Flare 最高',
      'image2_low': 'image2_low（低画质）',
      'image2_medium': 'image2_medium（中画质）',
      'image2_high': 'image2_high（高画质）',
    },
    supportsAspectRatio: true,
    aspectRatio: { options: ['1:1', '3:2', '2:3', '3:4', '4:3', '16:9', '9:16', '21:9', '9:21'], default: '1:1' },
    versionCapabilities: {
      // 2026.09.10 上新：Sunburst 适合编辑精度优先，Flare 适合快速高质量日常生成
      'image2.5_sunburst_low': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_sunburst_medium': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_sunburst_high': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_sunburst_xhigh': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_sunburst_max': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_flare_low': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_flare_medium': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_flare_high': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_flare_xhigh': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      'image2.5_flare_max': { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      image2_low: { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      image2_medium: { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
      image2_high: { maxImages: 16, allowedFormats: ['jpeg', 'jpg', 'png', 'webp'], resolution: { options: ['1K', '2K', '4K'], default: '1K' }, outputImageCount: { min: 1, max: 8 }, supportsOutputFormat: true, supportsMask: true },
    },
  },
  Mingmou: {
    label: 'Mingmou (明眸)',
    versions: ['1.0'],
    defaultVersion: '1.0',
    supportsAspectRatio: false,
    versionCapabilities: {
      '1.0': { maxImages: 1 },
    },
  },
};

// 合并模型级 + 版本级能力
export const getImageVersionCaps = (modelName, version) => {
  const modelCfg = IMAGE_MODEL_CONFIG[modelName];
  if (!modelCfg) return {};
  const base = {
    maxImages: 1,
    allowedFormats: ['jpeg', 'jpg', 'png'],
    supportsAspectRatio: !!modelCfg.supportsAspectRatio,
    aspectRatio: modelCfg.aspectRatio,
    resolution: null,
  };
  const vCap = modelCfg.versionCapabilities?.[version] || {};
  const caps = { ...base, ...vCap };
  if (caps.maxImages == null) caps.maxImages = 1;
  return caps;
};

export const getImageResolutionConfig = (modelName, version) => getImageVersionCaps(modelName, version).resolution;

export const getImageAspectRatioConfig = (modelName, version) => {
  const caps = getImageVersionCaps(modelName, version);
  if (!caps.supportsAspectRatio) return null;
  return caps.aspectRatio || null;
};

/**
 * 构建图片任务 FileInfos（图片接口不支持 Category / Usage；OG 支持 ReferenceType=mask）
 */
export const buildImageFileInfos = ({ files = [], maskMode = false } = {}) => {
  if (!files || files.length === 0) return undefined;
  return files.map((f, index) => {
    const info = { Type: 'Url', Url: f.url };
    if (maskMode && index === 0) info.ReferenceType = 'mask';
    return info;
  });
};

/**
 * 构建图片任务 OutputConfig
 */
export const buildImageOutputConfig = ({
  resolution,
  aspectRatio,
  storageMode,
  personGeneration,
  inputComplianceCheck,
  outputComplianceCheck,
  outputImageCount,
  outputFormat,
  logoAdd,
  supportsAspectRatio,
} = {}) => {
  const outputConfig = {
    StorageMode: storageMode || 'Permanent',
    PersonGeneration: personGeneration || 'AllowAdult',
    InputComplianceCheck: inputComplianceCheck || 'Disabled',
    OutputComplianceCheck: outputComplianceCheck || 'Disabled',
  };
  if (aspectRatio && supportsAspectRatio) outputConfig.AspectRatio = aspectRatio;
  if (resolution) outputConfig.Resolution = resolution;
  if (outputImageCount && Number(outputImageCount) > 1) outputConfig.OutputImageCount = Number(outputImageCount);
  if (outputFormat) outputConfig.OutputFormat = outputFormat;
  if (logoAdd) outputConfig.LogoAdd = logoAdd;
  return outputConfig;
};

/**
 * 构建图片任务请求体
 */
export const buildImageTaskData = ({
  modelName,
  version,
  files,
  maskMode,
  prompt,
  negativePrompt,
  enhancePrompt,
  outputConfig,
  inputRegion,
  sceneType,
  extInfo,
} = {}) => {
  const caps = getImageVersionCaps(modelName, version);
  const fileInfos = buildImageFileInfos({ files, maskMode });
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
  };
};
