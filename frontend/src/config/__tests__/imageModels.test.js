import {
  IMAGE_MODEL_CONFIG,
  getImageVersionCaps,
  getImageResolutionConfig,
  getImageAspectRatioConfig,
  buildImageFileInfos,
  buildImageOutputConfig,
  buildImageTaskData,
} from '../imageModels';

describe('图片模型配置（依据 VOD AIGC 接入指南）', () => {
  test('包含全部生图模型', () => {
    expect(Object.keys(IMAGE_MODEL_CONFIG).sort()).toEqual(
      ['GEM', 'Hunyuan', 'Jimeng', 'Kling', 'MJ', 'Mingmou', 'OG', 'Qwen', 'SI', 'Seedream', 'Vidu'].sort()
    );
  });

  describe('GEM（Gemini）', () => {
    test('包含 3.1-lite 版本（1K 直出）', () => {
      expect(IMAGE_MODEL_CONFIG.GEM.versions).toEqual(['2.5', '3.0', '3.1', '3.1-lite']);
      const caps = getImageVersionCaps('GEM', '3.1-lite');
      expect(getImageResolutionConfig('GEM', '3.1-lite').options).toEqual(['1K', '2K', '4K']);
      expect(caps.maxImages).toBe(3);
      expect(caps.allowedFormats).toContain('webp');
      expect(getImageAspectRatioConfig('GEM', '3.1-lite').options).toHaveLength(10);
    });
  });

  describe('OG（GPT-Image）', () => {
    test('包含 image2.5 Sunburst / Flare 全部版本与 image2 版本', () => {
      const versions = IMAGE_MODEL_CONFIG.OG.versions;
      ['image2.5_sunburst_low', 'image2.5_sunburst_medium', 'image2.5_sunburst_high', 'image2.5_sunburst_xhigh', 'image2.5_sunburst_max',
        'image2.5_flare_low', 'image2.5_flare_medium', 'image2.5_flare_high', 'image2.5_flare_xhigh', 'image2.5_flare_max',
        'image2_low', 'image2_medium', 'image2_high'].forEach((v) => {
        expect(versions).toContain(v);
      });
    });

    test('支持最多 16 张参考图、1-8 张输出、输出格式与蒙版', () => {
      const caps = getImageVersionCaps('OG', 'image2.5_flare_medium');
      expect(caps.maxImages).toBe(16);
      expect(caps.outputImageCount).toEqual({ min: 1, max: 8 });
      expect(caps.supportsOutputFormat).toBe(true);
      expect(caps.supportsMask).toBe(true);
      expect(caps.allowedFormats).toContain('webp');
    });
  });

  describe('MJ（Midjourney）', () => {
    test('包含 v7 / v8.1 / v8.2 / niji_7', () => {
      expect(IMAGE_MODEL_CONFIG.MJ.versions).toEqual(['v8.2', 'v8.1', 'niji_7', 'v7']);
      expect(IMAGE_MODEL_CONFIG.MJ.defaultVersion).toBe('v8.2');
      expect(getImageVersionCaps('MJ', 'v8.2').maxImages).toBe(1);
    });
  });

  describe('SI（豆包）', () => {
    test('包含 4.5 / 5.0-lite / 5.0-pro / layer-5.0-pro', () => {
      expect(IMAGE_MODEL_CONFIG.SI.versions).toEqual(expect.arrayContaining(['4.5', '5.0-lite', '5.0-pro', 'layer-5.0-pro']));
      expect(getImageResolutionConfig('SI', '5.0-pro').options).toEqual(['1K', '2K', '4K']);
    });
  });

  describe('Kling（可灵）', () => {
    test('包含 O1 与 scene（扩图）版本', () => {
      expect(IMAGE_MODEL_CONFIG.Kling.versions).toEqual(expect.arrayContaining(['3.0-Omni', '3.0', '2.1', 'O1', 'scene']));
      expect(getImageVersionCaps('Kling', 'scene').fixedSceneType).toBe('image_expand');
      expect(getImageAspectRatioConfig('Kling', 'scene')).toBeNull();
      expect(getImageVersionCaps('Kling', 'O1').outputImageCount).toEqual({ min: 1, max: 9 });
    });
  });

  describe('Hunyuan（混元）', () => {
    test('包含 3d_2.0 全景图 / 3.5-preview', () => {
      expect(IMAGE_MODEL_CONFIG.Hunyuan.versions).toEqual(['3.0', '3d_2.0', '3.5-preview']);
      expect(getImageVersionCaps('Hunyuan', '3d_2.0').fixedSceneType).toBe('3d_panorama');
    });
  });

  describe('Vidu / 其他', () => {
    test('Vidu q2 支持 7 张参考图；Mingmou 图片模型存在', () => {
      expect(getImageVersionCaps('Vidu', 'q2').maxImages).toBe(7);
      expect(IMAGE_MODEL_CONFIG.Mingmou.versions).toEqual(['1.0']);
    });
  });
});

describe('buildImageFileInfos', () => {
  test('无参考图返回 undefined（支持文生图）', () => {
    expect(buildImageFileInfos({ files: [] })).toBeUndefined();
  });

  test('图片接口不传 Category / Usage', () => {
    const fileInfos = buildImageFileInfos({ files: [{ url: 'https://x/a.png' }] });
    expect(fileInfos).toEqual([{ Type: 'Url', Url: 'https://x/a.png' }]);
    expect(fileInfos[0].Category).toBeUndefined();
    expect(fileInfos[0].Usage).toBeUndefined();
  });

  test('蒙版模式下第一张图携带 ReferenceType=mask', () => {
    const fileInfos = buildImageFileInfos({
      files: [{ url: 'https://x/mask.png' }, { url: 'https://x/base.png' }],
      maskMode: true,
    });
    expect(fileInfos[0]).toEqual({ Type: 'Url', Url: 'https://x/mask.png', ReferenceType: 'mask' });
    expect(fileInfos[1]).toEqual({ Type: 'Url', Url: 'https://x/base.png' });
  });
});

describe('buildImageOutputConfig', () => {
  test('输出张数 > 1 时传入 OutputImageCount，支持 OutputFormat', () => {
    const cfg = buildImageOutputConfig({
      resolution: '1K',
      aspectRatio: '9:16',
      supportsAspectRatio: true,
      outputImageCount: '3',
      outputFormat: 'png',
    });
    expect(cfg).toMatchObject({
      StorageMode: 'Permanent',
      Resolution: '1K',
      AspectRatio: '9:16',
      OutputImageCount: 3,
      OutputFormat: 'png',
    });
  });

  test('输出张数为 1 时不传 OutputImageCount', () => {
    const cfg = buildImageOutputConfig({ outputImageCount: 1 });
    expect(cfg.OutputImageCount).toBeUndefined();
  });

  test('支持图标水印开关', () => {
    const cfg = buildImageOutputConfig({ logoAdd: 'Enabled' });
    expect(cfg.LogoAdd).toBe('Enabled');
  });
});

describe('buildImageTaskData', () => {
  test('Kling scene 版本自动携带 SceneType=image_expand 与 ExtInfo', () => {
    const taskData = buildImageTaskData({
      modelName: 'Kling',
      version: 'scene',
      files: [{ url: 'https://x/a.png' }],
      prompt: '扩图',
      outputConfig: { StorageMode: 'Permanent' },
      extInfo: '{"AdditionalParameters":"{\\"up_expansion_ratio\\":0.1}"}',
    });
    expect(taskData.SceneType).toBe('image_expand');
    expect(taskData.ExtInfo).toBe('{"AdditionalParameters":"{\\"up_expansion_ratio\\":0.1}"}');
  });

  test('混元 3d_2.0 自动携带 SceneType=3d_panorama', () => {
    const taskData = buildImageTaskData({
      modelName: 'Hunyuan',
      version: '3d_2.0',
      prompt: '360全景图',
      outputConfig: { StorageMode: 'Permanent' },
    });
    expect(taskData.SceneType).toBe('3d_panorama');
  });
});
