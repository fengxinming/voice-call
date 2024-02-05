import { Sender } from '../index';

export type TShape = 'sineWave' | 'frequencyBars';

export interface VisualizerPluginConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  shape?: TShape;
}

export interface VisualizerPluginOptions extends VisualizerPluginConfig{
  shape: TShape;
}

class Visualizer {
  canvas: HTMLCanvasElement;
  canvasContext: CanvasRenderingContext2D;
  opts: VisualizerPluginOptions;
  analyser: AnalyserNode | null = null;
  state: number = 0;

  constructor(opts: VisualizerPluginConfig) {
    this.opts = Object.assign({
      shape: 'frequencyBars'
    }, opts);

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    if (opts.width) {
      canvas.width = opts.width;
    }
    if (opts.height) {
      canvas.height = opts.height;
    }
    this.canvas = canvas;
    this.canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.mount(opts.container);
  }

  mount(el: string | HTMLElement): void {
    let parentNode = el as HTMLElement;
    if (typeof el === 'string') {
      parentNode = document.querySelector(el) as HTMLElement;
    }
    if (!parentNode) {
      console.error('Could not mount non-el');
      return;
    }
    const { canvas } = this;
    if (!canvas.width) {
      const width = parentNode.clientWidth;
      if (width) {
        canvas.width = width;
      }
    }
    if (!canvas.height) {
      const height = parentNode.clientHeight;
      if (height) {
        canvas.height = height;
      }
    }
    parentNode.appendChild(this.canvas);
  }

  start({ inputSource, audioContext }: Sender): void {
    // 录音分析节点
    const analyser = audioContext!.createAnalyser();
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;

    inputSource!.connect(analyser);
    // analyser.connect(audioContext!.destination);

    this.analyser = analyser;
    this.state = 1;

    this.draw();
  }

  stop(): void {
    this.state = 0;
    this.analyser = null;
  }

  dispose(): void {
    this.stop();
    this.canvas.remove();
  }

  sineWaveRender(): void {
    const { analyser } = this;
    if (!analyser) {
      return;
    }

    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;

    // We can use Float32Array instead of Uint8Array if we want higher precision
    // const dataArray = new Float32Array(bufferLength);
    const dataArray = new Uint8Array(bufferLength);

    const { canvasContext, canvas } = this;
    const { width, height } = canvas;
    canvasContext.clearRect(0, 0, width, height);

    const draw = () => {
      if (!this.state) {
        this.clean();
        return;
      }
      requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasContext.fillStyle = 'rgb(200, 200, 200)';
      canvasContext.fillRect(0, 0, width, height);

      canvasContext.lineWidth = 2;
      canvasContext.strokeStyle = 'rgb(0, 0, 0)';

      canvasContext.beginPath();

      const sliceWidth = (width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        }
        else {
          canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasContext.lineTo(canvas.width, canvas.height / 2);
      canvasContext.stroke();
    };

    draw();
  }

  frequencyBarsRender(): void {
    const { analyser } = this;
    if (!analyser) {
      return;
    }

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;

    // We can use Float32Array instead of Uint8Array if we want higher precision
    const dataArray = new Uint8Array(bufferLength);

    const { canvasContext } = this;
    const { width, height } = this.canvas;
    canvasContext.clearRect(0, 0, width, height);

    const draw = () => {
      if (!this.state) {
        this.clean();
        return;
      }
      requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasContext.fillStyle = 'rgb(0, 0, 0)';
      canvasContext.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight: number;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasContext.fillStyle = `rgb(${barHeight + 100},50,50)`;
        canvasContext.fillRect(
          x,
          height - barHeight / 2,
          barWidth,
          barHeight / 2
        );

        x += barWidth + 1;
      }
    };

    draw();
  }

  draw(): void {
    this[`${this.opts.shape}Render`]();
  }

  clean(): void {
    const { canvasContext } = this;
    const { width, height } = this.canvas;
    canvasContext.clearRect(0, 0, width, height);
  }
}

export default function (sender: Sender, opts: VisualizerPluginOptions) {
  const visualizer = new Visualizer(opts);
  sender.on('start', () => {
    visualizer.start(sender);
  });
  sender.on('stop', () => {
    visualizer.stop();
  });
  sender.on('dispose', () => {
    visualizer.dispose();
  });
}
