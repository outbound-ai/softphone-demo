import './softphone.css';
import { useState, useEffect, MouseEvent, FormEvent, ChangeEvent } from 'react';
import CallService, { Conversation } from "@outbound-ai/softphone";

const callService = new CallService("ws://localhost:5001");

callService.onLog = (message: string) => {
  console.log('softphone', message);
};

interface IMessage {
  participant: string,
  text: string
}

function App() {
  const [_conversation, _setConversation] = useState<Conversation | null>(null);
  const [_connected, _setConnected] = useState(false);
  const [_muted, _setMuted] = useState(true);
  const [_speechMessage, _setSpeechMessage] = useState("");
  const [_touchToneSequence, _setTouchToneSequence] = useState("");
  const [_transcript, _setTranscript] = useState(new Array<IMessage>());

  // The call can be disconnected at any time. We need to observe this
  // property of the conversation and bind it into the React component 
  // state.
  useEffect(() => {
    if (_conversation) {
      const interval = setInterval(() => {
        if (_conversation.connected !== _connected) {
          _setConnected(_conversation.connected);
          _setTranscript([]);
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
        const message = { participant, text }
        const transcript = _transcript.concat([message]);
        _setTranscript(transcript);
      };
    }
  }, [_conversation, _transcript]);

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

  function handleSpeechMessageChanged(event: ChangeEvent<HTMLInputElement>) {
    _setSpeechMessage(event.target.value);
  }

  function handleSubmitSynthesizedSpeech(event: FormEvent) {
    event.preventDefault()

    if (_conversation) {
      _conversation.sendSynthesizedSpeech(_speechMessage);
    }

    _setSpeechMessage("");
  }

  function handleTouchToneSequenceChanged(event: ChangeEvent<HTMLInputElement>) {
    _setTouchToneSequence(event.target.value);
  }

  function handleSubmitTouchToneSequence(event: FormEvent) {
    event.preventDefault()

    if (_conversation) {
      _conversation.sendTouchToneSequence(_touchToneSequence);
    }

    _setTouchToneSequence("");
  }

  function handleClickSendDtmfCode(event: MouseEvent) {
    const element = event.target as HTMLButtonElement;
    const code = element.dataset.code;

    if (code && _conversation) {
      _conversation.sendDtmfCodes(code);
    }
  }

  function handleHangup() {
    if (_connected) {
      _conversation?.hangup();
    }
  }

  return (
    <div id="softphone">
      <div className="controls">
        <label>JobId
          <input id="jobid" />
        </label>
        <button onClick={handleClickConnectAsync}>{_conversation && _connected ? "disconnect" : "connect"}</button>
        <button onClick={handleClickTakeOver} disabled={!(_conversation && _connected)}>takeover</button>
        <button onClick={handleClickMute} disabled={!(_conversation && _connected)}>{_conversation && _connected && _muted ? "unmute" : "mute"}</button>
        <button onClick={handleHangup} disabled={!(_conversation && _connected)}>hangup</button>
      </div>

      <div id="transcript">
        {_transcript.map(function (message, i) {
          return <div className="transcript" key={i}>
            <div className="bold">{message.participant}</div>
            <div> {message.text}</div>
          </div>;
        })}
      </div>

      <form className="controls" onSubmit={handleSubmitSynthesizedSpeech}>
        <label>Speech
          <input type="text" value={_speechMessage} onChange={handleSpeechMessageChanged} />
        </label>
        <input type="submit" value="Submit" />
      </form>

      <div className="dialpad">
        <div className="row">
          <button className="dtmf green" data-code="1" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">1</div>
          </button>
          <button className="dtmf green" data-code="2" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">2</div>
            <div>(abc)</div>
          </button>
          <button className="dtmf green" data-code="3" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">3</div>
            <div>(def)</div>
          </button>
          <button className="dtmf blue" data-code="A" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">A</div>
          </button>
        </div>
        <div className="row">
          <button className="dtmf green" data-code="4" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">4</div>
            <div>(ghi)</div>
          </button>
          <button className="dtmf green" data-code="5" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">5</div>
            <div>(jkl)</div>
          </button>
          <button className="dtmf green" data-code="6" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">6</div>
            <div>(mno)</div>
          </button>
          <button className="dtmf blue" data-code="B" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">B</div>
          </button>
        </div>
        <div className="row">
          <button className="dtmf green" data-code="7" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">7</div>
            <div>(prs)</div>
          </button>
          <button className="dtmf green" data-code="8" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">8</div>
            <div>(tuv)</div>
          </button>
          <button className="dtmf green" data-code="9" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">9</div>
            <div>(wxy)</div>
          </button>
          <button className="dtmf blue" data-code="C" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">C</div>
          </button>
        </div>
        <div className="row">
          <button className="dtmf yellow" data-code="*" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">*</div>
          </button>
          <button className="dtmf green" data-code="0" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">0</div>
            <div>(operator)</div>
          </button>
          <button className="dtmf yellow" data-code="#" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">#</div>
          </button>
          <button className="dtmf blue" data-code="D" onClickCapture={handleClickSendDtmfCode}>
            <div className="bold">D</div>
          </button>
        </div>
      </div>

      <form className="controls" onSubmit={handleSubmitTouchToneSequence}>
        <label>Touch Tone Sequence
          <input value={_touchToneSequence} onChange={handleTouchToneSequenceChanged} />
        </label>
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}

export default App;
