let outboundAudioContext = null;
let buffers = [];

async function createOutboundAudioContextAsync() {
    if (outboundAudioContext != null) {
        outboundAudioContext.close();
        outboundAudioContext = null;
        download();
        buffers = [];
        return;
    }
    
    outboundAudioContext = new AudioContext({ sampleRate: 8000, channels: 1 });

    await outboundAudioContext.audioWorklet.addModule("outbound-audio-processor.js");
    workletNode = new AudioWorkletNode(outboundAudioContext, 'outbound-audio-processor');
    workletNode.port.onmessage = handleWorkletNodeMessage;
    
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const sourceNode = outboundAudioContext.createMediaStreamSource(mediaStream);
    const sampleRateParam = workletNode.parameters.get('sampleRate');
    sampleRateParam.setValueAtTime(mediaStream.getAudioTracks()[0].getSettings().sampleRate, outboundAudioContext.currentTime);
    sourceNode.connect(workletNode);
}

function handleWorkletNodeMessage(event) {
    const buffer = event.data.buffer;
    buffers.push(buffer);
}

function encodeBase64(bytes) {
    let binaryString = "";

    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binaryString);
}

function download() {
    let anchor = document.createElement("a");
    var blob = new Blob(buffers, { type: 'application/octet-stream' });
    anchor.setAttribute("href", URL.createObjectURL(blob));
    anchor.setAttribute("download", "raw_samples.bin");
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

$(document).ready(async function () {
    $("#connect").show();
});