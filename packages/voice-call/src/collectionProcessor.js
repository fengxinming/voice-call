function search(val, table) {
  const size = table.length;
  for (let i = 0; i < size; i++) {
    if (val <= table[i]) {
      return i;
    }
  }
  return size;
}

const SEG_END = [0xFF, 0x1FF, 0x3FF, 0x7FF, 0xFFF, 0x1FFF, 0x3FFF, 0x7FFF];

/* 2's complement (16-bit range) */
function linear2alaw(pcm_val) {
  let mask;
  let aval;

  if (pcm_val >= 0) {
    /* sign (7th) bit = 1 */
    mask = 0xD5;
  }
  else {
    /* sign bit = 0 */
    mask = 0x55;
    pcm_val = -pcm_val - 8;
  }

  /* Convert the scaled magnitude to segment number. */
  const seg = search(pcm_val, SEG_END);

  /* Combine the sign, segment, and quantization bits. */

  if (seg >= 8) { /* out of range, return maximum value. */
    return 0x7F ^ mask;
  }

  aval = seg << 4;
  if (seg < 2) {
    aval |= (pcm_val >> 4) & 0x0f;
  }
  else {
    aval |= (pcm_val >> (seg + 3)) & 0x0f;
  }

  return aval ^ mask;
}

/* 2's complement (16-bit range) */
function linear2ulaw(pcm_val) {
  let mask;

  /* Get the sign and the magnitude of the value. */
  if (pcm_val < 0) {
    pcm_val = 0x84 - pcm_val;
    mask = 0x7F;
  }
  else {
    pcm_val += 0x84;
    mask = 0xFF;
  }

  /* Convert the scaled magnitude to segment number. */
  const seg = search(pcm_val, SEG_END);

  /*
  * Combine the sign, segment, quantization bits;
  * and complement the code word.
  */
  if (seg >= 8) { /* out of range, return maximum value. */
    return (0x7F ^ mask);
  }

  const uval = (seg << 4) | ((pcm_val >> (seg + 3)) & 0x0f);
  return uval ^ mask;
}

function f32ToU8(f32) {
  return f32 < 0 ? f32 * 0x8000 : f32 * 0x7FFF;
}

function float32ToUint8(float32Array, cb) {
  const len = float32Array.length;
  const uint8Array = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    uint8Array[i] = cb(f32ToU8(Math.max(-1, Math.min(1, float32Array[i]))));
  }

  return uint8Array;
}

function encodePCM(float32Array, type) {
  switch (type) {
    case 7: // g711a
      return float32ToUint8(float32Array, linear2alaw);

    case 8: // g711u
      return float32ToUint8(float32Array, linear2ulaw);
  }
}

// 创建音频Tag
function createFlvAudioTag(audioData, timestamp, formatValue) {
  // 音频数据大小 + 固定音频格式 1 + 音频头类型 1
  const dataSize = audioData.length + 2;

  // Tag大小：header + data
  const tagSize = 11 + dataSize;

  // tagSize + PreviousTagSize
  const tag = new Uint8Array(tagSize + 4);

  // ==== start audio tag header
  // 音频Tag类型，0x08表示音频
  tag[0] = 0x08;

  // 数据大小
  tag[1] = (dataSize >> 16) & 0xFF;
  tag[2] = (dataSize >> 8) & 0xFF;
  tag[3] = dataSize & 0xFF;

  tag[4] = (timestamp >> 16) & 0xFF; // 时间戳低8位
  tag[5] = (timestamp >> 8) & 0xFF; // 时间戳中8位
  tag[6] = timestamp & 0xFF; // 时间戳高8位

  // 时间戳扩展
  tag[7] = (timestamp >> 24) & 0xFF;

  // StreamID，始终为0
  tag[8] = 0x00;
  tag[9] = 0x00;
  tag[10] = 0x00;
  // ==== end audio tag header

  // 音频格式 1000 1110 or 0111 1110
  tag[11] = formatValue & 0xFF;

  // 0: header; 1: body
  tag[12] = 0x01;
  tag.set(audioData, 13);

  let offset = 13 + audioData.length;

  // PreviousTagSize
  tag[offset++] = (tagSize >> 24) & 0xFF;
  tag[offset++] = (tagSize >> 16) & 0xFF;
  tag[offset++] = (tagSize >> 8) & 0xFF;
  tag[offset++] = tagSize & 0xFF;

  return tag;
}

function mergeChannels(float32Inputs) {
  const inputChannels = float32Inputs[0];

  const numChannels = inputChannels.length;
  if (!numChannels) {
    return null;
  }

  const numSamples = inputChannels[0].length;
  const mergedChannel = new Float32Array(numSamples);

  for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
    let mergedSample = 0;

    // 多声道数据合并
    for (let channelIdx = 0; channelIdx < numChannels; channelIdx++) {
      mergedSample += inputChannels[channelIdx][sampleIdx];
    }
    mergedChannel[sampleIdx] = mergedSample / numChannels;
  }

  return mergedChannel;
}

class MyProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    Object.assign(this, options.processorOptions);
    this.timestamp = 0;
    this.post = this[this.sampleType];
  }

  process(inputs, outputs) {
    // let data = inputs[0][0];
    const data = mergeChannels(inputs, outputs);
    if (!data) {
      return true;
    }

    this.post(data);
    return true;
  }

  pcm(data) {
    this.port.postMessage(data, [data.buffer]);
  }

  g711x(data) {
    data = encodePCM(data, this.formatFlag);
    this.port.postMessage(data, [data.buffer]);
  }

  flv(data) {
    const audioDuration = data.length / (2 * this.sampleRate);
    const { timestamp } = this;

    data = createFlvAudioTag(
      encodePCM(data, this.formatFlag),
      timestamp,
      this.formatValue
    );

    this.port.postMessage(data, [data.buffer]);

    this.timestamp = timestamp + Math.floor(audioDuration * 1000);
  }
}

registerProcessor('collectionProcessor', MyProcessor);
