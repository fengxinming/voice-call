type TGetUserMedia = (
  constraints: MediaStreamConstraints | undefined,
  successCallback: (value?: any) => void,
  errorCallback: (err?: any) => void,
) => void;

declare global {
  interface Window {
    webkitAudioContext: AudioContext;
  }

  interface Navigator {
    getUserMedia: TGetUserMedia;
    webkitGetUserMedia: TGetUserMedia;
    mozGetUserMedia: TGetUserMedia;
  }

  abstract class AudioWorkletProcessor {
    readonly port: MessagePort;
    abstract process(inputs: Float32Array[][], outputs: Float32Array[], parameters: any): boolean;
  }

  type AudioWorkletProcessorConstructor = new () => AudioWorkletProcessor;

  const registerProcessor: (name: string, processorCtor: AudioWorkletProcessorConstructor) => void;
}

export {};
