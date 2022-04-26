import './softphone.css';
import { useState, useEffect, MouseEvent } from 'react';
import CallService, { Conversation } from "@outbound-ai/softphone";

const callService = new CallService("ws://localhost:5001");

callService.onLog = (message: string) => {
  console.log('softphone', message);
};

function App() {
  const [_conversation, _setConversation] = useState<Conversation | null>(null);
  const [_connected, _setConnected] = useState(false);
  const [_muted, _setMuted] = useState(true);

  // The call can be disconnected at any time. We need to observe this
  // property of the conversation and bind it into the React component 
  // state.
  useEffect(() => {
    if (_conversation) {
      const interval = setInterval(() => {
        if (_conversation.connected !== _connected) {
          _setConnected(_conversation.connected);
        }
      }, 100);

      return () => {
        clearInterval(interval);
      }
    }
  }, [_conversation, _connected]);

  // New messages can arrive at any time.
  useEffect(() => {
    if (_conversation) {
      _conversation.onTranscriptAvailable = (participant, text) => {
        const transcript = document.getElementById("transcript");

        if (transcript) {
          const container = document.createElement("div");
          transcript.appendChild(container);
          const message = document.createElement("div");
          message.innerText = `${participant}: ${text}`;
          container.appendChild(message);
        }
      };
    }
  }, [_conversation]);

  async function handleClickConnectAsync(event: MouseEvent) {
    if (_conversation == null) {
      const input = document.getElementById("jobid") as HTMLInputElement;
      const jobId = input.value;
      const conversation = await callService.getConversationAsync(jobId);
      _setConversation(conversation);
    }
    else {
      _conversation.disconnect();
      _setConversation(null);
    }
  }

  function handleClickTakeOver(event: MouseEvent) {
    const element = event.target as HTMLInputElement;
    element.hidden = true;

    if (_conversation) {
      _conversation.unmute();
    }
  }

  function handleClickMute(event: MouseEvent) {
    if (_conversation) {
      if (_conversation.muted) {
        _conversation.unmute();
      }
      else {
        _conversation.mute();
      }
      _setMuted(_conversation.muted);
    }
  }

  function handleClickSendMessage() {
    const input = document.getElementById("message") as HTMLInputElement;

    if (_conversation) {
      _conversation.sendSynthesizedSpeech(input.value);
    }

    input.value = "";
  }

  function handleClickSendDtmfCode(event: MouseEvent) {
    const target = event.target as HTMLButtonElement;
    const digit = target.dataset.digit;

    if (digit && _conversation) {
      _conversation.sendDtmfCode(digit);
    }
  }

  return (
    <div id="softphone">
      <div id="controls">
        <label>JobId
          <input id="jobid" />
        </label>
        <button onClick={handleClickConnectAsync}>{_conversation && _connected ? "disconnect" : "connect"}</button>
        <button onClick={handleClickTakeOver}>takeover</button>
        <button onClick={handleClickMute}>{_conversation && _muted ? "unmute" : "mute"}</button>
      </div>

      <div id="transcript"></div>

      <div id="controls">
        <label>Message
          <input id="message" />
        </label>
        <button onClick={handleClickSendMessage}>send</button>
      </div>

      <div id="controls">
        <div>
          <button className="dtmf" data-digit="0" onClick={handleClickSendDtmfCode}>0</button>
          <button className="dtmf" data-digit="1" onClick={handleClickSendDtmfCode}>1</button>
          <button className="dtmf" data-digit="2" onClick={handleClickSendDtmfCode}>2</button>
          <button className="dtmf" data-digit="3" onClick={handleClickSendDtmfCode}>3</button>
          <button className="dtmf" data-digit="4" onClick={handleClickSendDtmfCode}>4</button>
        </div>
        <div>
          <button className="dtmf" data-digit="5" onClick={handleClickSendDtmfCode}>5</button>
          <button className="dtmf" data-digit="6" onClick={handleClickSendDtmfCode}>6</button>
          <button className="dtmf" data-digit="7" onClick={handleClickSendDtmfCode}>7</button>
          <button className="dtmf" data-digit="8" onClick={handleClickSendDtmfCode}>8</button>
          <button className="dtmf" data-digit="9" onClick={handleClickSendDtmfCode}>9</button>
        </div>
      </div>
    </div>
  );
}

export default App;
