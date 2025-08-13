function handleFileReaderLoad(event) {
    const dataView = new DataView(event.target.result);
    const format = dataView.getInt32(8);

    if (format != 0x57415645) {
        throw new Error("File is not a WAV file.");
    }

    const channels = dataView.getInt16(22, true);
    const sampleRate = dataView.getInt32(24, true);
    const bitsPerSample = dataView.getInt16(34, true);

    console.log("sampleRate", sampleRate);
    console.log("bitsPerSample", bitsPerSample);
    console.log("channels", channels);

    if (bitsPerSample == 16) {
        const samples16 = new Int16Array(dataView.buffer.slice(44));
        console.log("samples", samples16.length);
        loadSample16(sampleRate, channels, samples16);
    }
    else if (bitsPerSample == 32) {
        const samples32 = new Float32Array(dataView.buffer.slice(44));
        console.log("samples", samples32.length);
        loadSample32(sampleRate, channels, samples32);
    }
    else {
        alert("Unsupported bit rate.");
    }
}

function loadSample16(sampleRate, channels, samples16) {
    console.log("samples16", samples16.slice(8448, 8548));

    const samples32 = new Float32Array(samples16.byteLength / 2);

    for (let i = 0; i < samples16.length; i++) {
        const integerSample = samples16[i];
        samples32[i] = integerSample > 0 ? integerSample / 32767.0 : integerSample / 32768.0;
    }
    
    loadSample32(sampleRate, channels, samples32);
}

function loadSample32(sampleRate, channels, samples32) {
    console.log("samples32", samples32.slice(8448, 8548));

    const audioContext = new AudioContext({ sampleRate: sampleRate });
    
    const audioBuffer = audioContext.createBuffer(channels, samples32.length, sampleRate);
    audioBuffer.copyToChannel(samples32, 0);

    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 10 / 20.0;

    const audioBufferSourceNode = audioContext.createBufferSource();
    audioBufferSourceNode.buffer = audioBuffer;
    audioBufferSourceNode.connect(gainNode);
    audioBufferSourceNode.start();
}

function handleFileChanged(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', handleFileReaderLoad);
    reader.readAsArrayBuffer(file);
}

function handleDocumentReadyStateChanged(event) {
    document.getElementById("file").addEventListener("change", handleFileChanged);
}

document.addEventListener("readystatechange", handleDocumentReadyStateChanged);