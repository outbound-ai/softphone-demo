
const decodeTable = [0,132,396,924,1980,4092,8316,16764];

function decodeSample8(sample8) {
    let sign;
    let exponent;
    let mantissa;
    let sample;
    sample8 = ~sample8;
    sign = (sample8 & 0x80);
    exponent = (sample8 >> 4) & 0x07;
    mantissa = sample8 & 0x0F;
    sample = decodeTable[exponent] + (mantissa << (exponent+3));
    if (sign != 0) sample = -sample;
    return sample;
}

function getSample32(sample16) {
    if (sample16 > 0) {
        return sample16 / 32767.0;
    }
    else {
        return sample16 / 32768.0;
    }
}

class InboundAudioProcessor extends AudioWorkletProcessor {
    _queue = [];        // A queue containing all recieved buffers.
    _buffer = null;     // The buffer that is currently being read.
    _index = 0;         // The index into the current buffer.

    constructor (...args) {
        super(...args);
        this.port.onmessage = this.handleMessage.bind(this);
        this.process = this.process.bind(this);
    }

    handleMessage(event) {
        const bytes = event.data.bytes;

        // WebAudio runs on 32-bit IEEE floating point samples, so
        // some bit twiddling is required to get things right.
        const sampleCount = bytes.length;

        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
            const sample16 = decodeSample8(bytes[sampleIndex]); // Decode from 8-bit uLaw sample to 16-bit signed integer sample.
            const sample32 = getSample32(sample16);             // Encode 16-bit signed integer sample as 32-bit IEEE float sample.
            this._queue.push(sample32);
        }
    }

    process(_, outputs, __) {
        const output = outputs[0];
        let requestedSampleCount = output[0].length;

        // Read a buffer of the requested size from the queue.
        for (let i = 0; i < requestedSampleCount; i++) {
            if (this._queue[0] != undefined) {
                output[0][i] = this._queue.shift() || 0;
            }
            else {
                output[0][i] = 0;
            }
        }

        return true;
    }
}
  
registerProcessor('inbound-audio-processor', InboundAudioProcessor);