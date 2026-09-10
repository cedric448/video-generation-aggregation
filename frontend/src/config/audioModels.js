// =====================================================================
// 音频生成模型能力配置（CreateAigcAudioTask）
// 依据《【通用】VOD AIGC服务接入指南》3.13 文生音效 / 视频生音效 / 生音乐
//   - 文生音效 / 视频生音效：ModelName=Kling，SceneType=sfx
//   - 文生音乐：MiniMaxMusic（2.0/2.5/2.6/3.0，2026.08.03 上新 3.0）、GL（3.0-clip/3.0-pro）
// =====================================================================

export const AUDIO_MODEL_CONFIG = {
  Kling: {
    label: '可灵 (Kling)',
    sceneType: 'sfx',
    supportsVersions: false,
    supportsVideoInput: true,
    supportsAudioInput: false,
    supportsLyrics: false,
    // 文生音效：Duration 取值 [3, 10]；视频生音效时长跟随输入视频（3-20 秒）
    duration: { min: 3, max: 10, default: 6 },
    outputFormats: ['mp3', 'wav'],
    versions: [],
    defaultVersion: '',
    note: '文生音效 / 视频生音效；视频生音效支持 AdditionalParameters 传 bgm_prompt、asmr_mode',
  },
  MiniMaxMusic: {
    label: 'MiniMax Music',
    sceneType: 'music',
    versions: ['3.0', '2.6', '2.5', '2.0'],
    defaultVersion: '3.0',
    supportsVideoInput: false,
    supportsAudioInput: true,
    supportsLyrics: true,
    outputFormats: ['mp3', 'wav'],
    note: '生音乐：lyrics / sample_rate / bitrate / is_instrumental 通过 AdditionalParameters 传递',
  },
  GL: {
    label: 'Google Lyria (GL)',
    sceneType: 'music',
    versions: ['3.0-pro', '3.0-clip'],
    defaultVersion: '3.0-pro',
    supportsVideoInput: false,
    supportsAudioInput: false,
    supportsLyrics: true,
    composePrompt: true,
    outputFormats: ['mp3', 'wav'],
    note: '生音乐：歌词与风格拼接后通过 Prompt 传入；纯音乐在风格后追加 instrumental, no vocals.',
  },
};

export const AUDIO_SCENES = [
  { value: 'sfx_text', label: '文生音效', sceneType: 'sfx', requiresVideo: false, models: ['Kling'] },
  { value: 'sfx_video', label: '视频生音效', sceneType: 'sfx', requiresVideo: true, models: ['Kling'] },
  { value: 'music', label: '文生音乐', sceneType: 'music', requiresVideo: false, models: ['MiniMaxMusic', 'GL'] },
];

export const getAudioSceneConfig = (mode) => AUDIO_SCENES.find((s) => s.value === mode);

/**
 * GL 生音乐 Prompt 拼接规则：
 *   场景 1：有歌词 + 有风格 → "{风格}\n\nLyrics:\n{歌词}"
 *   场景 2：无歌词 + 有风格 → "{风格}"
 *   场景 3：纯音乐 + 有风格 → "{风格}, instrumental, no vocals."
 */
export const buildGlMusicPrompt = ({ style, lyrics, instrumental } = {}) => {
  const styleText = (style || '').trim();
  if (!styleText) return '';
  if (instrumental) return `${styleText}, instrumental, no vocals.`;
  const lyricsText = (lyrics || '').trim();
  if (!lyricsText) return styleText;
  return `${styleText}\n\nLyrics:\n${lyricsText}`;
};

/**
 * 构建音频任务请求体
 */
export const buildAudioTaskData = ({
  modelName,
  version,
  mode,
  prompt,
  lyrics,
  style,
  instrumental,
  duration,
  videoFile,
  audioFile,
  outputFormat,
  storageMode,
  additionalParameters,
} = {}) => {
  const scene = getAudioSceneConfig(mode);
  if (!scene) throw new Error('未知的音频生成场景');

  let finalPrompt = prompt || '';
  if (modelName === 'GL') {
    finalPrompt = buildGlMusicPrompt({ style, lyrics, instrumental });
  }

  const outputConfig = {
    StorageMode: storageMode || 'Permanent',
    ...(outputFormat ? { OutputAudioFormat: outputFormat } : {}),
  };
  // 文生音效有效；视频生音效时长跟随输入视频
  if (scene.sceneType === 'sfx' && !scene.requiresVideo && duration) {
    outputConfig.Duration = Number(duration);
  }

  const task = {
    ModelName: modelName,
    ...(version ? { ModelVersion: version } : {}),
    SceneType: scene.sceneType,
    ...(finalPrompt ? { Prompt: finalPrompt } : {}),
    ...(scene.requiresVideo && videoFile ? { VideoInfos: [{ Type: 'Url', Url: videoFile.url }] } : {}),
    ...(audioFile ? { AudioInfos: [{ Type: 'Url', Url: audioFile.url }] } : {}),
    OutputConfig: outputConfig,
  };

  // MiniMaxMusic 歌词单独通过 AdditionalParameters.lyrics 传递；其他模型直接透传
  const extra = {};
  if (modelName === 'MiniMaxMusic' && (lyrics || '').trim()) {
    extra.lyrics = lyrics.trim();
  }
  if (additionalParameters) {
    try {
      const parsed = typeof additionalParameters === 'string' ? JSON.parse(additionalParameters) : additionalParameters;
      Object.assign(extra, parsed);
    } catch (e) {
      throw new Error('AdditionalParameters 必须是合法的 JSON 字符串');
    }
  }
  if (Object.keys(extra).length > 0) {
    task.AdditionalParameters = JSON.stringify(extra);
  }

  return task;
};
