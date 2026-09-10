import {
  VIDEO_MODEL_CONFIG,
  getVideoVersionCaps,
  getVideoResolutionConfig,
  getVideoDurationConfig,
  getVideoAspectRatioConfig,
  buildVideoFileInfos,
  buildVideoOutputConfig,
  buildVideoTaskData,
  parseSubjectInfos,
  parseFileTexts,
  normalizeExtInfo,
} from '../videoModels';

describe('视频模型配置（依据 VOD AIGC 接入指南）', () => {
  test('包含全部生视频模型', () => {
    expect(Object.keys(VIDEO_MODEL_CONFIG).sort()).toEqual(
      ['GV', 'H2', 'Hailuo', 'Hunyuan', 'Jimeng', 'Kling', 'Mingmou', 'OS', 'Pixverse', 'Seedance', 'Vidu', 'Wan'].sort()
    );
  });

  describe('Hailuo（海螺）', () => {
    test('包含 H3 / H3-Max / H3_regen 新版本', () => {
      expect(VIDEO_MODEL_CONFIG.Hailuo.versions).toEqual(
        expect.arrayContaining(['H3-Max', 'H3', 'H3_regen', '2.3-fast', '2.3', '02'])
      );
    });

    test('H3 支持首尾帧与多模态参考生（图≤9、视频≤3、音频≤3）', () => {
      const caps = getVideoVersionCaps('Hailuo', 'H3');
      expect(caps.supportsLastFrame).toBe(true);
      expect(caps.maxImages).toBe(9);
      expect(caps.maxVideos).toBe(3);
      expect(caps.maxAudios).toBe(3);
      expect(getVideoResolutionConfig('Hailuo', 'H3').options).toEqual(['768P', '1080P', '2K', '4K']);
      const duration = getVideoDurationConfig('Hailuo', 'H3');
      expect(duration.min).toBe(4);
      expect(duration.max).toBe(15);
      expect(getVideoAspectRatioConfig('Hailuo', 'H3').options).toEqual(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
    });

    test('H3-Max 支持首尾帧但不支持参考生，时长 5-15 秒', () => {
      const caps = getVideoVersionCaps('Hailuo', 'H3-Max');
      expect(caps.supportsLastFrame).toBe(true);
      expect(caps.maxImages).toBe(1);
      expect(caps.maxVideos).toBe(0);
      const duration = getVideoDurationConfig('Hailuo', 'H3-Max');
      expect(duration.min).toBe(5);
      expect(duration.max).toBe(15);
    });

    test('H3_regen 视频再生成仅支持 2K / 4K', () => {
      expect(getVideoResolutionConfig('Hailuo', 'H3_regen').options).toEqual(['2K', '4K']);
      expect(getVideoVersionCaps('Hailuo', 'H3_regen').maxVideos).toBe(1);
    });
  });

  describe('Kling（可灵）', () => {
    test('包含 3.0-turbo 等全部版本', () => {
      expect(VIDEO_MODEL_CONFIG.Kling.versions).toEqual(
        expect.arrayContaining(['3.0-Omni', '3.0', '3.0-turbo', '2.6', '2.5', '2.1', '2.0', '1.6', 'O1'])
      );
    });

    test('3.0 / 3.0-Omni 支持 4K 与首尾帧', () => {
      for (const version of ['3.0', '3.0-Omni']) {
        expect(getVideoResolutionConfig('Kling', version).options).toContain('4K');
        expect(getVideoVersionCaps('Kling', version).supportsLastFrame).toBe(true);
        expect(getVideoDurationConfig('Kling', version).max).toBe(15);
      }
    });

    test('3.0-Omni 参考图上限 8 张，2.6 首尾帧限制无声', () => {
      expect(getVideoVersionCaps('Kling', '3.0-Omni').maxImages).toBe(8);
      expect(getVideoVersionCaps('Kling', '2.6').audioWithLastFrame).toBe(false);
    });

    test('1.6 / 2.0 单图按首帧提交', () => {
      expect(getVideoVersionCaps('Kling', '1.6').fileUsageMode).toBe('firstFrame');
      expect(getVideoVersionCaps('Kling', '2.0').fileUsageMode).toBe('firstFrame');
    });
  });

  describe('Vidu', () => {
    test('包含 q3 / q3-drama / q3-ad / 数字人 / 对口型', () => {
      expect(VIDEO_MODEL_CONFIG.Vidu.versions).toEqual(
        expect.arrayContaining(['q3', 'q3-pro', 'q3-turbo', 'q3-mix', 'q3-drama', 'q3-ad', 'q2', 'q2-pro', 'q2-turbo', 'avatar-q2-pro', 'avatar-q2-turbo', 'lip-sync'])
      );
    });

    test('q3-drama 参考图 1-14 张，时长 8-12 秒，比例 9:16 / 16:9', () => {
      const caps = getVideoVersionCaps('Vidu', 'q3-drama');
      expect(caps.maxImages).toBe(14);
      const duration = getVideoDurationConfig('Vidu', 'q3-drama');
      expect(duration.min).toBe(8);
      expect(duration.max).toBe(12);
      expect(getVideoAspectRatioConfig('Vidu', 'q3-drama').options).toEqual(['9:16', '16:9']);
      expect(getVideoResolutionConfig('Vidu', 'q3-drama').options).toEqual(['1080P', '2K', '4K']);
    });

    test('q3-ad 参考图 1-7 张，时长 3-16 秒', () => {
      const caps = getVideoVersionCaps('Vidu', 'q3-ad');
      expect(caps.maxImages).toBe(7);
      const duration = getVideoDurationConfig('Vidu', 'q3-ad');
      expect(duration.min).toBe(3);
      expect(duration.max).toBe(16);
      expect(getVideoAspectRatioConfig('Vidu', 'q3-ad').options).toEqual(['1:1', '9:16', '16:9', '3:4', '4:3']);
    });

    test('q3-mix 仅支持参考生（强制 Reference）', () => {
      const caps = getVideoVersionCaps('Vidu', 'q3-mix');
      expect(caps.forceReference).toBe(true);
      const fileInfos = buildVideoFileInfos({
        modelName: 'Vidu',
        version: 'q3-mix',
        files: [{ url: 'https://x/a.png', type: 'image' }],
      });
      expect(fileInfos).toEqual([{ Type: 'Url', Url: 'https://x/a.png', Category: 'Image', Usage: 'Reference' }]);
    });

    test('数字人 / 对口型支持音视频素材', () => {
      expect(getVideoVersionCaps('Vidu', 'avatar-q2-turbo').maxAudios).toBe(1);
      const lipSync = getVideoVersionCaps('Vidu', 'lip-sync');
      expect(lipSync.maxVideos).toBe(1);
      expect(lipSync.maxAudios).toBe(1);
    });
  });

  describe('GV（Google Veo）', () => {
    test('包含 omni / 3.1-lite', () => {
      expect(VIDEO_MODEL_CONFIG.GV.versions).toEqual(expect.arrayContaining(['omni', '3.1', '3.1-fast', '3.1-lite']));
    });

    test('omni 支持参考图/视频总配额 7、3-10 秒、4K', () => {
      const caps = getVideoVersionCaps('GV', 'omni');
      expect(caps.maxImages).toBe(7);
      expect(caps.maxVideos).toBe(5);
      expect(caps.lastFrameDisabledWhenMultiple).toBe(true);
      const duration = getVideoDurationConfig('GV', 'omni');
      expect(duration.min).toBe(3);
      expect(duration.max).toBe(10);
      expect(getVideoResolutionConfig('GV', 'omni').options).toContain('4K');
    });
  });

  describe('Wan（万相）', () => {
    test('包含 3.0 / 3.0-prime，支持多模态参考生', () => {
      expect(VIDEO_MODEL_CONFIG.Wan.versions).toEqual(['3.0', '3.0-prime']);
      for (const version of ['3.0', '3.0-prime']) {
        const caps = getVideoVersionCaps('Wan', version);
        expect(caps.supportsLastFrame).toBe(true);
        expect(caps.maxImages).toBe(10);
        expect(caps.maxVideos).toBe(5);
        expect(caps.maxAudios).toBe(5);
        expect(getVideoResolutionConfig('Wan', version).options).toEqual(['480P', '720P', '1080P', '2K', '4K']);
        expect(getVideoAspectRatioConfig('Wan', version).options).toContain('adaptive');
        const duration = getVideoDurationConfig('Wan', version);
        expect(duration.min).toBe(2);
        expect(duration.max).toBe(30);
      }
    });
  });

  describe('H2（快乐马）', () => {
    test('1.1 支持 9 种宽高比与 3-15 秒', () => {
      expect(VIDEO_MODEL_CONFIG.H2.versions).toEqual(['1.1', '1.0']);
      const aspect = getVideoAspectRatioConfig('H2', '1.1');
      expect(aspect.options).toEqual(['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9']);
      expect(getVideoDurationConfig('H2', '1.1').max).toBe(15);
      expect(getVideoVersionCaps('H2', '1.1').maxImages).toBe(9);
    });
  });

  describe('Pixverse（爱诗）', () => {
    test('包含 lip_sync 对口型版本；C1 支持参考视频', () => {
      expect(VIDEO_MODEL_CONFIG.Pixverse.versions).toEqual(expect.arrayContaining(['V5.6', 'V6.0', 'C1', 'lip_sync']));
      expect(getVideoVersionCaps('Pixverse', 'C1').maxVideos).toBe(1);
      expect(getVideoVersionCaps('Pixverse', 'lip_sync').maxAudios).toBe(1);
      expect(getVideoVersionCaps('Pixverse', 'V5.6').supportsAudio).toBe(false);
    });
  });

  describe('Hunyuan（混元）', () => {
    test('3d_2.0 固定 SceneType=3d_scene', () => {
      expect(VIDEO_MODEL_CONFIG.Hunyuan.versions).toEqual(['3d_2.0', '1.5']);
      expect(getVideoVersionCaps('Hunyuan', '3d_2.0').fixedSceneType).toBe('3d_scene');
    });
  });
});

describe('buildVideoFileInfos', () => {
  test('无素材时返回 undefined（支持文生视频）', () => {
    expect(buildVideoFileInfos({ modelName: 'Kling', version: '3.0', files: [] })).toBeUndefined();
  });

  test('首帧 + 尾帧使用 Usage=FirstFrame / LastFrame', () => {
    const fileInfos = buildVideoFileInfos({
      modelName: 'Kling',
      version: '3.0',
      files: [{ url: 'https://x/first.png', type: 'image' }],
      lastFrameFile: { url: 'https://x/last.png' },
    });
    expect(fileInfos).toEqual([
      { Type: 'Url', Url: 'https://x/first.png', Category: 'Image', Usage: 'FirstFrame' },
      { Type: 'Url', Url: 'https://x/last.png', Category: 'Image', Usage: 'LastFrame' },
    ]);
  });

  test('H3-Max 纯尾帧生视频', () => {
    const fileInfos = buildVideoFileInfos({
      modelName: 'Hailuo',
      version: 'H3-Max',
      files: [],
      lastFrameFile: { url: 'https://x/last.png' },
    });
    expect(fileInfos).toEqual([{ Type: 'Url', Url: 'https://x/last.png', Category: 'Image', Usage: 'LastFrame' }]);
  });

  test('多图 / 视频 / 音频按参考帧模式提交', () => {
    const fileInfos = buildVideoFileInfos({
      modelName: 'Wan',
      version: '3.0',
      files: [
        { url: 'https://x/1.png', type: 'image' },
        { url: 'https://x/2.png', type: 'image' },
        { url: 'https://x/v.mp4', type: 'video' },
        { url: 'https://x/a.mp3', type: 'audio' },
      ],
    });
    expect(fileInfos.map((f) => f.Usage)).toEqual(['Reference', 'Reference', 'Reference', 'Reference']);
    expect(fileInfos.map((f) => f.Category)).toEqual(['Image', 'Image', 'Video', 'Audio']);
  });

  test('不支持参考生的模型单图按首帧提交（Kling 1.6）', () => {
    const fileInfos = buildVideoFileInfos({
      modelName: 'Kling',
      version: '1.6',
      files: [{ url: 'https://x/a.png', type: 'image' }],
    });
    expect(fileInfos[0].Usage).toBe('FirstFrame');
  });

  test('透传 ReferenceType（视频编辑）与素材命名 Text', () => {
    const fileInfos = buildVideoFileInfos({
      modelName: 'Kling',
      version: '3.0-Omni',
      files: [{ url: 'https://x/v.mp4', type: 'video' }],
      referenceType: 'base',
      fileTexts: ['待编辑视频'],
    });
    expect(fileInfos[0]).toMatchObject({
      Category: 'Video',
      Usage: 'Reference',
      ReferenceType: 'base',
      Text: '待编辑视频',
    });
  });
});

describe('buildVideoOutputConfig', () => {
  test('支持音频且未强制静音时透传 AudioGeneration', () => {
    const cfg = buildVideoOutputConfig({
      resolution: '1080P',
      duration: '8',
      aspectRatio: '16:9',
      supportsAspectRatio: true,
      supportsAudio: true,
      audioGeneration: 'Enabled',
    });
    expect(cfg).toMatchObject({
      StorageMode: 'Permanent',
      Resolution: '1080P',
      Duration: 8,
      AspectRatio: '16:9',
      AudioGeneration: 'Enabled',
      PersonGeneration: 'AllowAdult',
    });
  });

  test('强制静音 / 不支持音频时不输出 AudioGeneration', () => {
    const forceNoAudio = buildVideoOutputConfig({
      supportsAudio: true,
      audioGeneration: 'Enabled',
      forceNoAudio: true,
    });
    expect(forceNoAudio.AudioGeneration).toBeUndefined();

    const noAudio = buildVideoOutputConfig({ supportsAudio: false, audioGeneration: 'Enabled' });
    expect(noAudio.AudioGeneration).toBeUndefined();
  });

  test('OS 模型始终开启音频', () => {
    const cfg = buildVideoOutputConfig({ supportsAudio: false, audioAlwaysEnabled: true });
    expect(cfg.AudioGeneration).toBe('Enabled');
  });

  test('透传插帧 / 错峰 / 图标水印开关', () => {
    const cfg = buildVideoOutputConfig({
      frameInterpolate: 'Enabled',
      offPeak: 'Enabled',
      logoAdd: 'Disabled',
    });
    expect(cfg.FrameInterpolate).toBe('Enabled');
    expect(cfg.OffPeak).toBe('Enabled');
    expect(cfg.LogoAdd).toBe('Disabled');
  });

  test('不支持宽高比时不输出 AspectRatio', () => {
    const cfg = buildVideoOutputConfig({ aspectRatio: '16:9', supportsAspectRatio: false });
    expect(cfg.AspectRatio).toBeUndefined();
  });
});

describe('buildVideoTaskData', () => {
  test('透传 ExtInfo / SubjectInfos / SceneType', () => {
    const taskData = buildVideoTaskData({
      modelName: 'Kling',
      version: '3.0-Omni',
      files: [{ url: 'https://x/a.png', type: 'image' }],
      prompt: '测试',
      outputConfig: { StorageMode: 'Permanent' },
      sceneType: 'motion_control',
      extInfo: '{"AdditionalParameters":"{}"}',
      subjectInfos: [{ Id: '123' }],
    });
    expect(taskData.SceneType).toBe('motion_control');
    expect(taskData.ExtInfo).toBe('{"AdditionalParameters":"{}"}');
    expect(taskData.SubjectInfos).toEqual([{ Id: '123' }]);
    expect(taskData.FileInfos[0].Usage).toBe('FirstFrame');
  });

  test('混元 3d_2.0 自动携带固定 SceneType', () => {
    const taskData = buildVideoTaskData({
      modelName: 'Hunyuan',
      version: '3d_2.0',
      prompt: '生成3D场景',
      outputConfig: { StorageMode: 'Permanent' },
    });
    expect(taskData.SceneType).toBe('3d_scene');
    expect(taskData.FileInfos).toBeUndefined();
  });
});

describe('辅助函数', () => {
  test('parseSubjectInfos 支持 id 与 id:名称', () => {
    expect(parseSubjectInfos('858477278396170315,858477602846711835:猫猫')).toEqual([
      { Id: '858477278396170315' },
      { Id: '858477602846711835', Name: '猫猫' },
    ]);
    expect(parseSubjectInfos('')).toBeUndefined();
  });

  test('normalizeExtInfo 校验 JSON', () => {
    expect(normalizeExtInfo('{"a":1}')).toBe('{"a":1}');
    expect(normalizeExtInfo('')).toBeUndefined();
    expect(() => normalizeExtInfo('{bad}')).toThrow();
  });

  test('parseFileTexts 解析素材命名', () => {
    expect(parseFileTexts('小猫, 折扇,耳坠')).toEqual(['小猫', '折扇', '耳坠']);
    expect(parseFileTexts('')).toBeUndefined();
  });
});
