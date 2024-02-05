import { RecorderError } from './Error';
import collectionProcessorURL from './collectionProcessor.js?url';

import { Options } from './typings';

const AudioContext = window.AudioContext || window.webkitAudioContext;

/** 采样率列表 */
const sampleRates = [
  96000,
  88200,
  64000,
  48000,
  44100,
  32000,
  24000,
  22050,
  16000,
  12000,
  11025,
  8000,
  7350
];

/** 打开麦克风 */
function getUserMedia(constraints?: MediaStreamConstraints | undefined): Promise<MediaStream> {
  if (!navigator.mediaDevices) {
    return Promise.reject(new RecorderError('您的浏览器不支持获取用户设备，无法使用对讲功能，建议使用 Chrome 浏览器 ( 版本 >= 74 )'));
  }

  return navigator.mediaDevices.getUserMedia(constraints)
    .catch(() => {
      throw new RecorderError('请确保录音设备正常，并允许浏览器获取录音权限，否则无法使用对讲功能');
    });
}

/** 构建 flv header */
function flvHeader(flv: Uint8Array, offset: number): number {
  // ==== start flv header
  // 设置FLV文件类型
  flv[offset++] = 0x46; // 'F'
  flv[offset++] = 0x4C; // 'L'
  flv[offset++] = 0x56; // 'V'

  // 设置版本号
  flv[offset++] = 0x01;

  // 设置Flags，只包含音频；Audio(0x04) Video(0x01)
  flv[offset++] = 0x04;

  // 设置数据偏移，通常为9；高8位为0，低8位为9
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;
  flv[offset++] = 0x09;
  // ==== end flv header

  return offset;
}

/** 计算音频格式 */
function calcAudioFormat(
  formatFlag: number,
  sampleRateFlag: number,
  sampleBitsFlag: number,
  channelsFlag: number
) {
  // 0 = Linear PCM, platform endian
  // 1 = ADPCM
  // 2 = MP3
  // 3 = Linear PCM, little endian
  // 4 = Nellymoser 16-kHz mono
  // 5 = Nellymoser 8-kHz mono
  // 6 = Nellymoser
  // 7 = G.711 A-law logarithmic PCM
  // 8 = G.711 mu-law logarithmic PCM 9 = reserved
  // 10 = AAC
  // 11 = Speex
  // 14 = MP3 8-Khz
  // 15 = Device-specific sound
  let af = formatFlag << 4;

  // For AAC: always 3
  // 0 = 5.5-kHz
  // 1 = 11-kHz
  // 2 = 22-kHz
  // 3 = 44-kHz
  af |= sampleRateFlag << 2;

  // 0 = snd8Bit
  // 1 = snd16Bit
  af |= sampleBitsFlag << 1;

  // 0=单声道
  // 1=立体声,双声道。AAC永远是1
  af |= channelsFlag << 1;

  return af;
}

function firstAudioTag(flv: Uint8Array, offset: number, formatValue: number, inputSampleRateFlag: number): number {
  // ==== start audio tag header
  // 音频Tag类型，0x08表示音频
  flv[offset++] = 0x08;

  // 数据大小
  flv[offset++] = (4 >> 16) & 0xFF;
  flv[offset++] = (4 >> 8) & 0xFF;
  flv[offset++] = 4 & 0xFF;

  flv[offset++] = 0x00; // 时间戳低8位
  flv[offset++] = 0x00; // 时间戳中8位
  flv[offset++] = 0x00; // 时间戳高8位

  // 时间戳扩展
  flv[offset++] = 0x00;

  // StreamID，始终为0
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;

  // 音频格式 1000 1110 or 0111 1110
  flv[offset++] = formatValue & 0xFF;

  // 0: header; 1: body
  flv[offset++] = 0x00;

  // 8k 采样率
  flv[offset++] = (inputSampleRateFlag << 4 | 0 << 4) & 0xFF;
  flv[offset++] = 0x00;
  // ==== end audio tag header

  return offset;
}

// 创建FLV文件头
export function createFlvFirst(formatValue: number, inputSampleRateFlag: number) {
  // HeaderSize 9
  // + PreviousTagSize 4
  // + FirstAudioTag 11 + 1 + 1 + 2
  // + PreviousTagSize 4
  const flv = new Uint8Array(32);

  let offset = flvHeader(flv, 0);

  // 设置 PreviousTagSize 0
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;
  flv[offset++] = 0x00;

  offset = firstAudioTag(flv, offset, formatValue, inputSampleRateFlag);

  // PreviousTagSize 1
  flv[offset++] = (15 >> 24) & 0xFF;
  flv[offset++] = (15 >> 16) & 0xFF;
  flv[offset++] = (15 >> 8) & 0xFF;
  flv[offset++] = 15 & 0xFF;

  return flv;
}

export class Recorder {
  opts: Options;
  audioContext: AudioContext | null = null;
  /** 音频源节点 */
  inputSource: MediaStreamAudioSourceNode | null = null;
  /** 麦克风输入流 */
  inputStream: MediaStream | null = null;

  constructor(opts: any) {
    this.opts = opts;
  }

  start(): Promise<void> {
    const { opts } = this;

    const { sampleRate } = opts;
    const inputSampleRateFlag = sampleRates.indexOf(sampleRate);
    if (inputSampleRateFlag === -1) {
      return Promise.reject(new RecorderError(`采样率应为 ${sampleRates.join(', ')} 其中之一`));
    }

    return getUserMedia({
      audio: {
        sampleRate,
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: true
      }
    }).then((stream) => {
      const audioContext = new AudioContext({ sampleRate });

      const inputSource = audioContext.createMediaStreamSource(stream);

      this.inputStream = stream;
      this.audioContext = audioContext;
      this.inputSource = inputSource;

      const { formatFlag } = opts;
      const formatValue = calcAudioFormat(
        formatFlag,
        opts.sampleRateFlag,
        opts.sampleBitsFlag,
        opts.channelsFlag
      );

      // 采集音频
      return audioContext.audioWorklet.addModule(collectionProcessorURL).then(() => {
        const audioCollectionNode = new AudioWorkletNode(audioContext, 'collectionProcessor', {
          processorOptions: {
            formatValue, // 音频格式
            formatFlag, // 音频格式标记
            sampleRate, // 采样率
            sampleType: 'flv' // pcm or g711x or flv
          }
        });
        audioCollectionNode.port.onmessage = (evt: MessageEvent<Uint8Array>) => {
          this.onData(evt.data);
        };
        inputSource.connect(audioCollectionNode);
        audioCollectionNode.connect(audioContext.destination);

        this.onData(createFlvFirst(formatValue, inputSampleRateFlag));
      });
    }).catch((e) => {
      const passthroughError = () => {
        throw e;
      };
      return this.stop().then(passthroughError, passthroughError);
    });
  }

  stop(): Promise<void> {
    const { inputStream, inputSource, audioContext } = this;
    if (inputSource) {
      inputSource.disconnect();
      this.inputSource = null;
    }

    if (inputStream) {
      inputStream.getAudioTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      this.inputStream = null;
    }

    if (audioContext) {
      const empty = () => {
        this.audioContext = null;
      };
      return audioContext.close().then(empty, empty);
    }

    return Promise.resolve();
  }

  onData(data: Uint8Array) {
    console.info('receive data:', data);
  }
}
