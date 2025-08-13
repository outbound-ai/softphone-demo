// Buffer from network stream containing signed 16-bit integers in big-endian byte order.
const bytes = new Uint8Array(16);
bytes[0] = 251;
bytes[1] = 164;
bytes[2] = 252;
bytes[3] = 100;
bytes[4] = 253;
bytes[5] = 148;
bytes[6] = 254;
bytes[7] = 236;
bytes[8] = 0;
bytes[9] = 32;
bytes[10] = 0;
bytes[11] = 180;
bytes[12] = 0;
bytes[13] = 244;
bytes[14] = 1;
bytes[15] = 84;

// Array of signed integer audio samples in the platform byte order. 
const samples16 = new Int16Array(bytes.length /2);

for (let i = 0; i < bytes.length; i += 2)
{
    const lowOrderByte = bytes[i + 1];
    const highOrderByte = bytes[i];
    const sample16 = getInt16(lowOrderByte, highOrderByte);
    samples16[i / 2] = sample16;
}

function getInt16(lowOrderByte, highOrderByte) {
    var sign = highOrderByte & (1 << 7);
    var x = (((highOrderByte & 0xFF) << 8) | (lowOrderByte & 0xFF));
    return sign ? 0xFFFF0000 | x : x;
}

console.log(samples16[0], samples16[0] === -1116);
console.log(samples16[1], samples16[1] === -924);
console.log(samples16[2], samples16[2] === -620);
console.log(samples16[3], samples16[3] === -276);
console.log(samples16[4], samples16[4] === 32);
console.log(samples16[5], samples16[5] === 180);
console.log(samples16[6], samples16[6] === 244);
console.log(samples16[7], samples16[7] === 340);