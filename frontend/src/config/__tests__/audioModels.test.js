import {
  AUDIO_MODEL_CONFIG,
  AUDIO_SCENES,
  getAudioSceneConfig,
  buildGlMusicPrompt,
  buildAudioTaskData,
} from '../audioModels';

describe('音频模型配置（依据 VOD AIGC 接入指南 3.13）', () => {
  test('包含 Kling 音效 / MiniMaxMusic / GL 生音乐模型', () => {
    expect(Object.keys(AUDIO_MODEL_CONFIG).sort()).toEqual(['GL', 'Kling', 'MiniMaxMusic']);
    expect(AUDIO_MODEL_CONFIG.MiniMaxMusic.versions).toEqual(['3.0', '2.6', '2.5', '2.0']);
    expect(AUDIO_MODEL_CONFIG.GL.versions).toEqual(['3.0-pro', '3.0-clip']);
  });

  test('音频场景包含文生音效 / 视频生音效 / 文生音乐', () => {
    expect(AUDIO_SCENES.map((s) => s.value)).toEqual(['sfx_text', 'sfx_video', 'music']);
    expect(getAudioSceneConfig('sfx_video').requiresVideo).toBe(true);
    expect(getAudioSceneConfig('music').sceneType).toBe('music');
  });
});

describe('buildGlMusicPrompt（GL 拼接规则）', () => {
  test('有歌词 + 有风格', () => {
    expect(buildGlMusicPrompt({ style: '欢快的电子舞曲', lyrics: '大海啊，全是水' })).toBe(
      '欢快的电子舞曲\n\nLyrics:\n大海啊，全是水'
    );
  });

  test('无歌词 + 有风格（自动写词）', () => {
    expect(buildGlMusicPrompt({ style: '治愈系钢琴曲' })).toBe('治愈系钢琴曲');
  });

  test('纯音乐 + 有风格', () => {
    expect(buildGlMusicPrompt({ style: '治愈系钢琴曲', instrumental: true })).toBe(
      '治愈系钢琴曲, instrumental, no vocals.'
    );
  });
});

describe('buildAudioTaskData', () => {
  test('文生音效：SceneType=sfx，携带 Duration', () => {
    const taskData = buildAudioTaskData({
      modelName: 'Kling',
      mode: 'sfx_text',
      prompt: '春节庆祝时的烟花声',
      duration: 6,
      storageMode: 'Temporary',
      outputFormat: 'wav',
    });
    expect(taskData).toEqual({
      ModelName: 'Kling',
      SceneType: 'sfx',
      Prompt: '春节庆祝时的烟花声',
      OutputConfig: { StorageMode: 'Temporary', Duration: 6, OutputAudioFormat: 'wav' },
    });
  });

  test('视频生音效：携带 VideoInfos，且不下发 Duration', () => {
    const taskData = buildAudioTaskData({
      modelName: 'Kling',
      mode: 'sfx_video',
      prompt: '温柔的风声',
      duration: 6,
      videoFile: { url: 'https://x/v.mp4' },
      storageMode: 'Temporary',
    });
    expect(taskData.SceneType).toBe('sfx');
    expect(taskData.VideoInfos).toEqual([{ Type: 'Url', Url: 'https://x/v.mp4' }]);
    expect(taskData.OutputConfig.Duration).toBeUndefined();
  });

  test('MiniMaxMusic：歌词通过 AdditionalParameters.lyrics 传递', () => {
    const taskData = buildAudioTaskData({
      modelName: 'MiniMaxMusic',
      version: '3.0',
      mode: 'music',
      prompt: '一首欢乐的歌',
      lyrics: '大海啊，全是水',
      outputFormat: 'mp3',
      audioFile: { url: 'https://x/ref.mp3' },
    });
    expect(taskData.ModelVersion).toBe('3.0');
    expect(taskData.SceneType).toBe('music');
    expect(taskData.AudioInfos).toEqual([{ Type: 'Url', Url: 'https://x/ref.mp3' }]);
    expect(JSON.parse(taskData.AdditionalParameters)).toEqual({ lyrics: '大海啊，全是水' });
  });

  test('GL：风格 + 歌词拼接进 Prompt', () => {
    const taskData = buildAudioTaskData({
      modelName: 'GL',
      version: '3.0-clip',
      mode: 'music',
      style: '欢快的电子舞曲',
      lyrics: '大海啊，全是水',
    });
    expect(taskData.Prompt).toBe('欢快的电子舞曲\n\nLyrics:\n大海啊，全是水');
    expect(taskData.SceneType).toBe('music');
  });

  test('AdditionalParameters 非法 JSON 抛错', () => {
    expect(() =>
      buildAudioTaskData({ modelName: 'Kling', mode: 'sfx_text', prompt: 'x', additionalParameters: '{bad}' })
    ).toThrow();
  });
});
