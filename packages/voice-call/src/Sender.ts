import { Emitter } from 'eemitt';
import { Recorder } from './Recorder';
import { Client } from './Client';
import { RUNNING, START, STOP } from './constants';
import { Options } from './typings';
import { SenderError } from './Error';

export type TSenderPlugin = (sender: Sender, ...opts: any[]) => void;

export class Sender extends Emitter {
  recorder: Recorder;
  client: Client;
  opts: Options;

  private readonly _installedPlugins: TSenderPlugin[] = [];
  /** 状态 */
  private _state: number = 0;

  constructor(opts?: any) {
    super();
    opts = Object.assign({
      bufferSize: 4096, // 暂时未处理
      sampleRate: 8000, // 采样率 - 8000
      formatFlag: 7, // 音频格式标记 - g711a
      sampleBitsFlag: 1, // 采样位标记 - 16bit
      sampleRateFlag: 3, // 采样率标记 - 44100
      channelsFlag: 0 // 通道标记 - 单声道
    }, opts);
    this.opts = opts;

    const recorder = new Recorder(opts);
    const client = new Client();

    this.recorder = recorder;
    this.client = client;

    // 连接中断后关闭麦克风
    client.onDisconnect = () => {
      this._state = STOP;
      recorder.stop().then(() => {
        this._state = 0;
        this.emit('disconnect');
      });
    };
  }

  get state(): number {
    return this._state;
  }

  get audioContext(): AudioContext | null {
    return this.recorder.audioContext;
  }

  get inputSource(): MediaStreamAudioSourceNode | null {
    return this.recorder.inputSource;
  }

  /** 开始语音对讲 */
  start(url?: string | URL | (() => Promise<string | URL>), protocols?: string | string[]): Promise<void> {
    switch (this._state) {
      case START:
        return Promise.reject(new SenderError('Sender is starting.'));
      case RUNNING:
        // 已启动
        return Promise.reject(new SenderError('Sender is running.'));
      case STOP:
        // 正在停止
        return new Promise((resolve, reject) => {
          this.once('stop', () => {
            this.start(url, protocols).then(resolve, reject);
          });
        });
    }

    this._state = START;

    const { opts, client, recorder } = this;

    url = url || opts.url;
    protocols = protocols || opts.protocols;

    const resolveUrl: string | URL | Promise<string | URL> = typeof url === 'function' ? url() : url as string;

    return Promise.resolve(resolveUrl).then((resolvedUrl) => {
      if (resolvedUrl) {
        return client.connect(resolvedUrl, protocols).then(() => {
          // 连接成功后接收数据并发送
          recorder.onData = (data: Uint8Array): void => {
            client.send(data);
            this.emit({ type: 'data', data });
          };
        });
      }

      recorder.onData = (data: Uint8Array): void => {
        this.emit({ type: 'data', data });
      };
    }).then(() => {
      // 服务连接后开始采集
      return recorder.start();
    }).then(() => {
      this._state = RUNNING;
      this.emit('start');
    }).catch((e) => {
      this._state = 0;
      this.emit({ type: 'error', error: e });
      throw e;
    });
  }

  /** 停止语音对讲 */
  stop(): Promise<void> {
    switch (this._state) {
      case STOP:
        return Promise.reject(new SenderError('Sender is stopping.'));
      case 0:
        // 已停止
        console.info('Sender is not running.');
        return Promise.resolve();
    }

    this._state = STOP;
    const { client } = this;

    return Promise.all([
      client.socket && client.disconnect(),
      this.recorder.stop()
    ]).then(() => {
      this._state = 0;
      this.emit('stop');
    });
  }

  /** 销毁实例 */
  dispose(): Promise<void> {
    return this.stop().then(() => {
      this.emit('dispose');
    });
  }

  /** 使用插件 */
  use(plugin: TSenderPlugin, ...args: any[]): this {
    const plugins = this._installedPlugins;
    if (plugins.indexOf(plugin) > -1) {
      console.warn('Plugin has already been applied to target sender.');
    }
    else if (typeof plugin === 'function') {
      plugins.push(plugin);
      plugin(this, ...args);
    }
    else {
      console.warn(
        'A plugin must be a function.'
      );
    }
    return this;
  }
}
