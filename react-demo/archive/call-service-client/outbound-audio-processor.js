const BIAS = 0x84;
const CLIP = 32635;

const encodeTable = [
    0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
    4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
    5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
    5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
    6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
    6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
    6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
    6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
    7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7
];

const decodeTable = [0,132,396,924,1980,4092,8316,16764];

function encodeSample16(sample16) {
    let sign;
    let exponent;
    let mantissa;
    let muLawSample;
    sign = (sample16 >> 8) & 0x80;
    if (sign != 0) sample16 = -sample16;
    sample16 = sample16 + BIAS;
    if (sample16 > CLIP) sample16 = CLIP;
    exponent = encodeTable[(sample16>>7) & 0xFF];
    mantissa = (sample16 >> (exponent+3)) & 0x0F;
    muLawSample = ~(sign | (exponent << 4) | mantissa);
    return muLawSample;
}

function getSample16(sample32) {
    const buffer = new Int16Array(1);

    if (sample32 > 0) {
        buffer[0] = sample32 * 32767.0;
    }
    else {
        buffer[0] = sample32 * 32768.0;
    }

    return buffer[0];
}

class OutboundAudioProcessor extends AudioWorkletProcessor {
    constructor (...args) {
        super(...args);
        this._sequenceNumber = 0;
        this.process = this.process.bind(this);
    }

    process(inputs, _, __) {
        const samples32 = inputs[0][0] // There's one microphone but two channels WTF?

        if (!samples32) {
            return true;
        }

        const buffer = new Uint8Array(samples32.length * 2);
        const samples16 = new Int16Array(samples32.length);
            
        for (let sampleIndex = 0; sampleIndex < samples32.length; sampleIndex++) {
            const byteIndex = sampleIndex * 2;

            // Convert from 32-bit float to 16-bit signed integer.
            const sample16 = getSample16(samples32[sampleIndex]);
            samples16[sampleIndex] = sample16;

            // Write to buffer in big-endian byte order for network transmission.
            buffer[byteIndex] = getHighOrderByte(sample16);
            buffer[byteIndex + 1] = getLowOrderByte(sample16);
        }

        if (this._sequenceNumber % 1000 === 0){
            console.log(this._sequenceNumber, "out", "bytes    ", buffer.join(","));
            console.log(this._sequenceNumber, "out", "samples16", samples16.join(","));
        }

        this.port.postMessage({ buffer, sequenceNumber: this._sequenceNumber });
        this._sequenceNumber += 1;
        return true;
    }
}

registerProcessor('outbound-audio-processor', OutboundAudioProcessor);