let audioContext;
let workletNode;

function handleStart() {
    audioContext = new AudioContext();

    audioContext.audioWorklet.addModule("worker.js")
        .then(() => {
            const gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0.5 / 20.0;

            workletNode = new AudioWorkletNode(audioContext, 'white-noise-processor');
            workletNode.port.onmessage = handleMessage;
            workletNode.connect(gainNode);
        });
}

function handleMessage(event) {
    console.log(event.data);
}

function handleStop() {
    if (audioContext != null) {
        audioContext.close();
        audioContext = null;
    }
}

function handlePostMessage() {
    if (workletNode != null) {
        workletNode.port.postMessage("ping");
    }
}