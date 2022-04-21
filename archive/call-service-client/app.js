const decoder = new TextDecoder('utf8');
let inboundAudioContext = null;
let outboundAudioContext = null;
let socket = null;

async function handleConnectAsnyc(event) {
    let jobId = $("#jobId")[0].value;
    let url = "ws://localhost:5001/api/v1/jobs/" + jobId + "/browser"

    await createInboundAudioContextAsync();
    // await createOutboundAudioContextAsync();

    socket = new WebSocket(url);
    socket.onopen = handleWebSocketOpen;
    socket.onerror = handleWebSocketError;
    socket.onclose = handleWebSocketClose;
    socket.onmessage = handleWebSocketMessage;
}

function handleDisconnect() {
    if (socket != null) {
        socket.close(1000, "normal closure");
        socket = null;    
    }

    if (inboundAudioContext != null) {
        inboundAudioContext.close();
        inboundAudioContext = null;
    }

    if (outboundAudioContext != null) {
        outboundAudioContext.close();
        outboundAudioContext = null;
    }

    $("#connect").show();
    $("#disconnect").hide();
}

function handleWebSocketOpen() {
    appendMessage("system: socket opened");
    $("#disconnect").show();
    $("#connect").hide();
}

function handleWebSocketError() {
    appendMessage("system: there was an error");
    handleDisconnect();
}

function handleWebSocketClose() {
    appendMessage("system: socket closed");
    handleDisconnect();
    $("#connect").show();
    $("#disconnect").hide();
}

function handleWebSocketMessage(message) {
    let parsed = JSON.parse(message.data);

    if (parsed.type === "InboundText" || parsed.type === "OutboundText") {
        appendMessage(parsed.type + ": " + parsed.payload);
    }
    else if (parsed.type == "InboundAudio") {
        const sequenceNumber = parsed.sequenceNumber;
        const bytes = decodeBase64(parsed.payload); 
        workletNode.port.postMessage({ bytes, sequenceNumber });
    }
}

// Convert a base64 string to an array of bytes.
function decodeBase64(string) {
    const binaryString = window.atob(string);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes; // This will always be in big-endian byte order.
}

// Convert an array of bytes to a base64 string.
function encodeBase64(bytes) {
    let binaryString = "";

    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binaryString);
}

async function createInboundAudioContextAsync() {
    if (inboundAudioContext != null) {
        inboundAudioContext.close();
        inboundAudioContext = null;
    }

    inboundAudioContext = new AudioContext({ sampleRate: 8000 });

    const gainNode = inboundAudioContext.createGain();
    gainNode.connect(inboundAudioContext.destination);
    gainNode.gain.value = 15 / 20.0;

    await inboundAudioContext.audioWorklet.addModule("inbound-audio-processor.js");
    workletNode = new AudioWorkletNode(inboundAudioContext, 'inbound-audio-processor');
    workletNode.port.onmessage = handleWorkletNodeMessage;
    workletNode.connect(gainNode);

    return inboundAudioContext;
}

function handleWorkletNodeMessage(event) {
    console.log(event.data);
}

function appendMessage(message) {
    let div = document.createElement("div");
    div.innerText = message;
    $(div).addClass("message");
    $("#transcript").prepend(div);
}

function handleMessageChanged(event) {
    console.log(event.target);
}

function handleSendMessageClicked(event) {
    console.log(event.target);
}

async function createOutboundAudioContextAsync() {
    if (outboundAudioContext != null) {
        outboundAudioContext.close();
        outboundAudioContext = null;
    }
    
    outboundAudioContext = new AudioContext({ sampleRate: 8000, channels: 1 });

    await outboundAudioContext.audioWorklet.addModule("outbound-audio-processor.js");
    workletNode = new AudioWorkletNode(outboundAudioContext, 'outbound-audio-processor');
    workletNode.port.onmessage = handleOutboundMessageAsync;
    
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const sourceNode = outboundAudioContext.createMediaStreamSource(mediaStream);
    sourceNode.connect(workletNode);
}

async function handleOutboundMessageAsync(event) {
    const message = {
        type: "OutboundAudio",
        payload: encodeBase64(event.data.buffer),
        sequenceNumber: event.data.sequenceNumber
    };

    if (socket.readyState === 1) {
        socket.send(JSON.stringify(message));
    }
}

$(document).ready(async function () {
    $("#connect").show();
});