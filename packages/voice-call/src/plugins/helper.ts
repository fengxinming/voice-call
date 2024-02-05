import { Sender } from '../index';

const extNames = {
  7: 'g711a',
  8: 'g711u'
};

class Helper {
  cache: Uint8Array[] = [];
  dataLength: number = 0;

  push(data: Uint8Array): void {
    this.cache.push(data);
    this.dataLength += data.length;
  }

  download(formatFlag: number): void {
    const { cache } = this;
    const data = new Uint8Array(this.dataLength);
    let offset = 0;
    cache.forEach((n) => {
      data.set(n, offset);
      offset += n.length;
    });

    const blob = new Blob([data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${Math.random().toString(32).slice(2)}.${extNames[formatFlag]}`;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 50);
  }

  // play({ sampleRate }: any) {
  //   const float32Array = new Float32Array(this.dataLength);
  //   this.cache.forEach((n, i) => {
  //     float32Array.set(n, i * n.length);
  //   });

  //   const newAudioContext = new AudioContext({ sampleRate });
  //   const audioBuffer = newAudioContext.createBuffer(1, float32Array.length, newAudioContext.sampleRate);
  //   const channelData = audioBuffer.getChannelData(0);
  //   channelData.set(float32Array);

  //   const sourceNode = newAudioContext.createBufferSource();
  //   sourceNode.buffer = audioBuffer;
  //   sourceNode.connect(newAudioContext.destination);

  //   sourceNode.start();
  // }

  clear() {
    this.cache.length = 0;
    this.dataLength = 0;
  }
}

export default function (sender: Sender) {
  const helper = new Helper();
  sender.on('data', (evt) => {
    helper.push(evt.data);
  });
  sender.on('stop', () => {
    helper.download(sender.opts.formatFlag);
    helper.clear();
  });
}
