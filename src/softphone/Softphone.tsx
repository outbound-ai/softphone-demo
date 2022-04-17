import './softphone.css';
import { useState, useEffect, MouseEvent } from 'react';
import CallService, { Conversation } from "outbound-calls-softphone";

const callService = new CallService("ws://localhost:5001");

callService.onLog = (message: string) => {
  console.log('softphone', message);
};

function App() {
  const [_conversation, _setConversation] = useState<Conversation | null>(null);

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
    unmute();
  }

  function handleClickMute(event: MouseEvent) {
    if (_conversation && _conversation.muted) {
      unmute()
    }
    else {
      mute();
    }
  }

  function unmute() {
  }

  function mute() {
  }

  function handleClickSendMessage() {
    const input = document.getElementById("message") as HTMLInputElement;
    console.log(input.value);
    input.value = "";
  }

  function handleClickSendDtmfCode(event: MouseEvent) {
    const target = event.target as HTMLButtonElement;
    const digit = target.dataset.digit;
    console.log(digit);
  }

  return (
    <div id="softphone">
      <div id="controls">
        <label>JobId
          <input id="jobid" />
        </label>
        <button onClick={handleClickConnectAsync}>{_conversation && _conversation.connected ? "disconnect" : "connect"}</button>
        <button onClick={handleClickTakeOver}>takeover</button>
        <button onClick={handleClickMute}>{_conversation && _conversation.muted ? "unmute" : "mute"}</button>
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
