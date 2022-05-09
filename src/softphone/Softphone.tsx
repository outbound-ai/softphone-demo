import './softphone.css';
import { useState, useEffect, MouseEvent, FormEvent, ChangeEvent } from 'react';
import CallService, { Conversation } from "@outbound-ai/softphone";

const serviceUri = process.env.REACT_APP_SERVICE_URI ?? "ws://localhost:5001";
const callService = new CallService(serviceUri);

callService.onLog = (message: string) => {
  console.log('softphone', message);
};

interface IMessage {
  participantId: string,
  participantType: string,
  text: string
}

function App() {
  const [_conversation, _setConversation] = useState<Conversation | null>(null);
  const [_connected, _setConnected] = useState(false);
  const [_muted, _setMuted] = useState(true);
  const [_speechMessage, _setSpeechMessage] = useState("");
  const [_transcript, _setTranscript] = useState(new Array<IMessage>());
  const [_participants, _setParticipants] = useState({} as Record<string, string>);

  useEffect(() => {
    if (_conversation) {

      // The call can be disconnected at any time.
      _conversation.onParticipantStateChanged = (participants) => {
        _setParticipants(participants);
      };

      // Participants can change at any time.
      _conversation.onConnectionStateChanged = (connected) => {
        _setConnected(connected);
        _setTranscript([]);
        _setParticipants({});
      }

      // New messages can arrive at any time.
      _conversation.onTranscriptAvailable = (participantId, participantType, text) => {
        const message = { participantId, participantType, text }
        const transcript = [message].concat(_transcript);
        _setTranscript(transcript);
      };
    }
  }, [_conversation, _transcript]);

  async function handleClickConnectAsync(event: MouseEvent) {
    event.stopPropagation();

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
    event.stopPropagation();
    const element = event.target as HTMLInputElement;
    element.hidden = true;

    if (_conversation) {
      _conversation.unmute();
    }
  }

  function handleClickMute(event: MouseEvent) {
    event.stopPropagation();

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

  function createHandleClickRemoveParticipant(participantId: string) {
    return function handleClickSendDtmfCode(event: MouseEvent) {
      if (_conversation) {
        _conversation.removeParticipant(participantId);
      }
    }
  }

  function handleSpeechMessageChanged(event: ChangeEvent<HTMLInputElement>) {
    _setSpeechMessage(event.target.value);
  }

  function handleSubmitSynthesizedSpeech(event: FormEvent) {
    event.preventDefault()

    if (_conversation) {
      _conversation.synthesizeSpeech(_speechMessage);
    }

    _setSpeechMessage("");
  }

  function createHandleClickSendDtmfCode(code: string) {
    return function handleClickSendDtmfCode(event: MouseEvent) {
      if (code && _conversation) {
        _conversation.synthesizeTouchTones(code);
      }
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
        <button onClick={handleClickMute} disabled={!(_conversation && _connected)}>{_conversation && _connected && _muted ? "unmute" : "mute"}</button>
        <button onClick={handleHangup} disabled={!(_conversation && _connected)}>hangup</button>
      </div>

      <div id="transcript">
        {_transcript.map(function (message, index) {
          return <div className="transcript" key={index}>
            <div>
              <span className="bold">{message.participantType}</span>
              <span> </span>
              <span className="light">({message.participantId})</span>
            </div>
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
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("1")}>
            <div className="bold">1</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("2")}>
            <div className="bold">2</div>
            <div>(abc)</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("3")}>
            <div className="bold">3</div>
            <div>(def)</div>
          </button>
          <button className="dtmf blue" onClickCapture={createHandleClickSendDtmfCode("A")}>
            <div className="bold">A</div>
          </button>
        </div>
        <div className="row">
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("4")}>
            <div className="bold">4</div>
            <div>(ghi)</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("5")}>
            <div className="bold">5</div>
            <div>(jkl)</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("6")}>
            <div className="bold">6</div>
            <div>(mno)</div>
          </button>
          <button className="dtmf blue" onClickCapture={createHandleClickSendDtmfCode("B")}>
            <div className="bold">B</div>
          </button>
        </div>
        <div className="row">
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("7")}>
            <div className="bold">7</div>
            <div>(prs)</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("8")}>
            <div className="bold">8</div>
            <div>(tuv)</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("9")}>
            <div className="bold">9</div>
            <div>(wxy)</div>
          </button>
          <button className="dtmf blue" onClickCapture={createHandleClickSendDtmfCode("C")}>
            <div className="bold">C</div>
          </button>
        </div>
        <div className="row">
          <button className="dtmf yellow" onClickCapture={createHandleClickSendDtmfCode("*")}>
            <div className="bold">*</div>
          </button>
          <button className="dtmf green" onClickCapture={createHandleClickSendDtmfCode("0")}>
            <div className="bold">0</div>
            <div>(operator)</div>
          </button>
          <button className="dtmf yellow" onClickCapture={createHandleClickSendDtmfCode("#")}>
            <div className="bold">#</div>
          </button>
          <button className="dtmf blue" onClickCapture={createHandleClickSendDtmfCode("D")}>
            <div className="bold">D</div>
          </button>
        </div>
      </div>

      <div className="participants">
        {Object.keys(_participants).map(function (participantId, index) {
          return <div className="participant" key={index}>
            <button className="red" onClick={createHandleClickRemoveParticipant(participantId)}>X</button>
            <span className="bold">{_participants[participantId]}</span>
            <span className="light">({participantId})</span>
          </div>
        })}
      </div>
    </div>
  );
}

export default App;
