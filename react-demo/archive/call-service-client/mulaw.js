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
     7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7];

 const decodeTable = [0,132,396,924,1980,4092,8316,16764];
 
 function encodeSample(sample) {
   let sign;
   let exponent;
   let mantissa;
   let muLawSample;
   sign = (sample >> 8) & 0x80;
   if (sign != 0) sample = -sample;
   sample = sample + BIAS;
   if (sample > CLIP) sample = CLIP;
   exponent = encodeTable[(sample>>7) & 0xFF];
   mantissa = (sample >> (exponent+3)) & 0x0F;
   muLawSample = ~(sign | (exponent << 4) | mantissa);
   return muLawSample;
 }
 
 function decodeSample(muLawSample) {
   let sign;
   let exponent;
   let mantissa;
   let sample;
   muLawSample = ~muLawSample;
   sign = (muLawSample & 0x80);
   exponent = (muLawSample >> 4) & 0x07;
   mantissa = muLawSample & 0x0F;
   sample = decodeTable[exponent] + (mantissa << (exponent+3));
   if (sign != 0) sample = -sample;
   return sample;
 }
