// 构造函数参数格式
export interface Config {
  /** WebSocket 连接地址 */
  url?: string | URL | (() => Promise<string | URL>);

  /** WebSocket 连接协议 */
  protocols?: string | string[];

  /** 缓冲区大小 */
  bufferSize?: number;

  /** 采样率，默认 8000 */
  sampleRate?: number;

  /**
   * 音频格式
   *
   * 0 = Linear PCM, platform endian
   * 1 = ADPCM
   * 2 = MP3
   * 3 = Linear PCM, little endian
   * 4 = Nellymoser 16-kHz mono
   * 5 = Nellymoser 8-kHz mono
   * 6 = Nellymoser
   * 7 = G.711 A-law logarithmic PCM
   * 8 = G.711 mu-law logarithmic PCM 9 = reserved
   * 10 = AAC
   * 11 = Speex
   * 14 = MP3 8-Khz
   * 15 = Device-specific sound
   */
  formatFlag?: number;

  /**
   * 采样位数
   *
   * 0 = snd8Bit
   * 1 = snd16Bit
   */
  sampleBitsFlag?: number;

  /**
   * 用于服务端解析
   *
   * For AAC: always 3
   * 0 = 5.5-kHz
   * 1 = 11-kHz
   * 2 = 22-kHz
   * 3 = 44-kHz
   */
  sampleRateFlag?: number;

  /**
   * 用于服务端解析
   *
   * 0=单声道
   * 1=立体声,双声道。AAC永远是1
   */
  channelsFlag?: number;
}

// 实际参数
export interface Options extends Config {
  bufferSize: number;
  sampleRate: number;
  formatFlag: number;
  sampleBitsFlag: number;
  sampleRateFlag: number;
  channelsFlag: number;
}
