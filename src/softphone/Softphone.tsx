import CallService, { Conversation } from "@outbound-ai/softphone";
import {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { authApi } from "../AuthApi";
import { fetchPreferedTenant } from "./api";
import "./softphone.css";

const serviceUri = process.env.REACT_APP_SERVICE_URI ?? "ws://localhost:5001";
const callService = new CallService(serviceUri);

callService.onLog = (message: string) => {
  console.log("softphone", message);
};

interface IMessage {
  participantId: string;
  participantType: string;
  text: string;
}

enum TakeOverTypeEnum {
  none = "none",
  browser = "browser",
  dialed = "dialed",
}

enum CallParticipantTypeEnum {
  foreignPhoneParticipant = "ForeignPhoneParticipant",
  browserParticipant = "BrowserParticipant",
  browserHeadsetParticipant = "BrowserHeadsetParticipant",
  AIAgentParticipant = "AIAgentParticipant",
}

/**
 * The main Softphone application component.
 *
 * This component manages the state and UI for a softphone demo, including conversation management,
 * participant handling, transcript display, dialpad interactions, mute/unmute controls, agent takeover,
 * and synthesized speech functionality.
 *
 * State Variables:
 * - _conversation: The current active conversation instance.
 * - _connected: Indicates if the softphone is connected to a conversation.
 * - _muted: Indicates if the output (speaker) is muted.
 * - _speechMessage: The current text input for speech synthesis.
 * - _transcript: Array of transcript messages exchanged in the conversation.
 * - _takeOverType: The current agent takeover type.
 * - _participants: A record of participant IDs and their display names.
 * - _hasTakenOver: Indicates if the agent has taken over the conversation.
 * - _payerAgentReady: Indicates if the payer agent is ready to take over.
 *
 * Effects:
 * - Sets up conversation event handlers for connection state, transcript updates, and agent hold events.
 * - Handles agent takeover confirmation when the payer agent is ready.
 *
 * Event Handlers:
 * - handleClickConnectAsync: Connects or disconnects the softphone from a conversation.
 * - handleClickMute: Toggles speaker mute state.
 * - handleClickMuteInput: Toggles microphone mute state.
 * - createHandleClickRemoveParticipant: Removes a participant from the conversation.
 * - handleSpeechMessageChanged: Updates the speech message input.
 * - handleSubmitSynthesizedSpeech: Submits text for speech synthesis.
 * - createHandleClickSendDtmfCode: Sends DTMF codes via the dialpad.
 * - handleHangup: Hangs up the current conversation.
 * - handleTakeOver: Initiates the agent takeover process for the current conversation.
 * 
 *
 * UI Elements:
 * - Claim ID input field for starting a call.
 * - Mute/unmute speaker and microphone buttons.
 * - Agent takeover and hangup buttons.
 * - Transcript panel displaying exchanged messages.
 * - Dialpad for sending DTMF codes.
 * - Synthesized speech input and submit form.
 * - Participant list with remove buttons.
 *
 * @component
 */
function App() {
  const [_conversation, _setConversation] = useState<Conversation | null>(null);
  const [_connected, _setConnected] = useState(false);
  const [_muted, _setMuted] = useState(true);
  const [_speechMessage, _setSpeechMessage] = useState("");
  const [_transcript, _setTranscript] = useState<IMessage[]>([]);
  const [_takeOverType, _setTakeOverType] = useState<TakeOverTypeEnum>(
    TakeOverTypeEnum.none
  );
  const [_hasTakenOver, _setHasTakenOver] = useState(false);
  const [_payerAgentReady, _setPayerAgentReady] = useState(false);
  const [jobStatus, setJobStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (_conversation) {
      _conversation.onConnectionStateChanged = (connected) => {
        _setConnected(connected);
        _setTranscript([]);
        if (!connected) {
          _setHasTakenOver(false);
        }
      };

      _conversation.onTranscriptAvailable = (
        participantId,
        participantType,
        text
      ) => {
        const message = { participantId, participantType, text };
        const transcript = [message].concat(_transcript);
        _setTranscript(transcript);
      };

      _conversation.onHoldForHumanEvent = async (message: string) => {
        if (message === "stop" && _takeOverType === TakeOverTypeEnum.none) {
          console.log("Hold for human event:", message);
          _setPayerAgentReady(true);
        }
      };
    }
  }, [_conversation, _transcript, _takeOverType]);

  /**
   * Handles the agent take over process for the current conversation.
   * - Invokes the agentTakeOver method on the active conversation.
   * - Sets the take over type to browser.
   * - Marks the conversation as taken over.
   * - Unmutes the input for the conversation.
   * - If the payer agent is ready, resets its ready state.
   *
   * Dependencies:
   * - _conversation: The current conversation object.
   * - _payerAgentReady: Boolean indicating if the payer agent is ready.
   */

  const handleTakeOver = useCallback(() => {
    if (_conversation) {
      _conversation.agentTakeOver();
      _setTakeOverType(TakeOverTypeEnum.browser);
      _setHasTakenOver(true);
      _conversation.unmuteInput();
      if (_payerAgentReady) {
        _setPayerAgentReady(false);
      }
    }
  }, [_conversation, _payerAgentReady]);

  useEffect(() => {
    if (_payerAgentReady) {
      window.confirm(
        "Payer agent is ready to take over. Do you want to take over?"
      ) && handleTakeOver();
    }
  }, [_payerAgentReady, handleTakeOver]);

  /**
   * Starts a new payer representative call for the given claim ID.
   * Sends a POST request to the claims API to initiate the call.
   * Returns the response data containing the job ID.
   *
   * @param claimId - The ID of the claim to start the call for.
   * @returns A promise that resolves to the response data containing the job ID.
   */

  const startPayerRepCall = async (claimId: string) => {
    const token = await authApi.getAuthToken();
    try {
      const response = await fetch(
        `${process.env.REACT_APP_CLAIMS_URL}/api/v1/claims/${claimId}/calls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            currentUser: localStorage.getItem("currentUser") || "",
            "outbound-ai-preferred-tenant": await fetchPreferedTenant(),
            refresh_token: localStorage.getItem("refreshToken") || "",
          },
          body: JSON.stringify({
            type: "HumanAgent",
            useCase: "CSI",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch claim details");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching claim details:", error);
      throw error;
    }
  };
  
  /**
   * Checks the progress of a job by its ID.
   * Sends a GET request to the claims API to retrieve the job status.
   * Returns the response data containing the job status.
   *
   * @param jobId - The ID of the job to check progress for.
   * @returns A promise that resolves to the response data containing the job status.
   */
  const checkforJobProgress = useCallback(async (jobId: string) => {
    const token = await authApi.getAuthToken();
    try {
      const response = await fetch(
        `${process.env.REACT_APP_CLAIMS_URL}/api/v1/calls/${jobId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            currentUser: localStorage.getItem("currentUser") || "",
            "outbound-ai-preferred-tenant": await fetchPreferedTenant(),
            refresh_token: localStorage.getItem("refreshToken") || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check job progress");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error checking job progress:", error);
      throw error;
    }
  }, []);

  /**
   * Handles the click event for connecting or disconnecting the softphone.
   * If there is no active conversation, it starts a new payer representative call
   * using the claim ID from the input field. If a conversation exists, it disconnects it.
   * It also checks the job status periodically until the job is in progress.
   *
   * @param event - The mouse event triggered by clicking the connect button.
   */
  async function handleClickConnectAsync(event: MouseEvent) {
    setJobStatus(false);
    setIsLoading(true);
    event.stopPropagation();

    if (_conversation == null) {
      _setPayerAgentReady(false);
      _setHasTakenOver(false);
      _setMuted(true);
      _setTranscript([]);
      const input = document.getElementById("claimid") as HTMLInputElement;
      const claimId = input.value.split("/").pop() as string;
      const callJob = await startPayerRepCall(claimId);
      const jobId = callJob.jobId;
      const authTokn = await authApi.getAuthToken();
      if (!jobStatus) {
        const interval = setInterval(async () => {
          const jobStatus = await checkforJobProgress(jobId);
          if (jobStatus.status === 2) {
            setJobStatus(true);
            clearInterval(interval);
            const conversation = await callService.getConversationAsync(
              jobId,
              authTokn
            );
            _setConversation(conversation);
            _setConnected(true);
            setIsLoading(false);
          } else {
            console.error("Job is not in progress", jobStatus);
          }
        }, 1000);
        return;
      }
    } else {
      _conversation.disconnect();
      _setConversation(null);
      _setHasTakenOver(false);
      setIsLoading(false);
    }
  }

  /**
   * Handles the mute/unmute button click event for the softphone conversation speaker.
   *
   * Stops the event from propagating further, then toggles the mute state of the conversation's output.
   * If the conversation is currently muted, it will be unmuted; otherwise, it will be muted.
   * Updates the local muted state accordingly.
   *
   * @param event - The mouse event triggered by clicking the mute button.
   */
  function handleClickMute(event: MouseEvent) {
    event.stopPropagation();

    if (_conversation) {
      if (_muted) {
        _conversation.unmuteOutput();
      } else {
        _conversation.muteOutput();
      }
      _setMuted(!_muted);
    }
  }

  /**
   * Handles the click event for muting or unmuting the input audio stream microphone.
   *
   * Stops the event from propagating further, then toggles the mute state
   * of the current conversation's input. Updates the local muted state accordingly.
   *
   * @param event - The mouse event triggered by clicking the mute input control.
   */
  function handleClickMuteInput(event: MouseEvent) {
    event.stopPropagation();

    if (_conversation) {
      if (_muted) {
        _conversation.unmuteInput();
      } else {
        _conversation.muteInput();
      }
      _setMuted(!_muted);
    }
  }

  function handleSpeechMessageChanged(event: ChangeEvent<HTMLInputElement>) {
    _setSpeechMessage(event.target.value);
  }

  /**
   * Handles the form submission for synthesizing speech.
   * Prevents the default form submission behavior, then triggers speech synthesis
   * on the current conversation using the provided speech message.
   * After synthesizing, resets the speech message input.
   *
   * @param event - The form submission event.
   */
  function handleSubmitSynthesizedSpeech(event: FormEvent) {
    event.preventDefault();

    if (_conversation) {
      _conversation.synthesizeSpeech(_speechMessage);
    }

    _setSpeechMessage("");
  }

  /**
   * Creates a click handler for sending DTMF codes.
   * Returns a function that, when called, sends the specified DTMF code
   * to the current conversation if it exists.
   *
   * @param code - The DTMF code to send.
   * @returns A function that handles the click event to send the DTMF code.
   */

  function createHandleClickSendDtmfCode(code: string) {
    return function handleClickSendDtmfCode(event: MouseEvent) {
      if (code && _conversation) {
        _conversation.synthesizeTouchTones(code);
      }
    };
  }

  /**
   * Handles the hangup action for the current conversation.
   * If the conversation is connected, it calls the hangup method on the conversation instance.
   */

  function handleHangup() {
    if (_connected) {
      _conversation?.hangup();
    }
  }

  const dialpadRows = [
    [
      { code: "1", label: "1" },
      { code: "2", label: "2", sub: "(abc)" },
      { code: "3", label: "3", sub: "(def)" },
      { code: "A", label: "A" },
    ],
    [
      { code: "4", label: "4", sub: "(ghi)" },
      { code: "5", label: "5", sub: "(jkl)" },
      { code: "6", label: "6", sub: "(mno)" },
      { code: "B", label: "B" },
    ],
    [
      { code: "7", label: "7", sub: "(prs)" },
      { code: "8", label: "8", sub: "(tuv)" },
      { code: "9", label: "9", sub: "(wxy)" },
      { code: "C", label: "C" },
    ],
    [
      { code: "*", label: "*" },
      { code: "0", label: "0", sub: "(operator)" },
      { code: "#", label: "#" },
      { code: "D", label: "D" },
    ],
  ];

  // Mapping participant types to titles for display in the transcript
  // This mapping is used to display a user-friendly title for each participant type in the transcript

  const participantTypeToTitleMapping = {
    [CallParticipantTypeEnum.foreignPhoneParticipant]: "Foreign Phone",
    [CallParticipantTypeEnum.browserParticipant]:
      authApi.getCurrentUser()?.username || "Browser",
    [CallParticipantTypeEnum.AIAgentParticipant]: "AI Agent",
  };

  return (
    <div id="softphone">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Call Starting...</div>
        </div>
      )}
      {/* Header with connection status and title */}
      <div className="header">
        <h1>
          {_conversation && _conversation.connected ? (
            <span className="connected"></span>
          ) : (
            <span className="disconnected"></span>
          )}{" "}
          Softphone Demo{" "}
        </h1>
      </div>
      {/* Connection Controls */}
      <div className="controls">
        <>
          <label>ClaimId</label>
          <input id="claimid" />
        </>
        {/* Connect/Disconnect Button */}
        {!_conversation?.connected && (
          <button onClick={handleClickConnectAsync}>Start Call</button>
        )}
        {/* Mute/Unmute Speaker Button */}
        <button
          onClick={handleClickMute}
          disabled={!(_conversation && _connected)}
        >
          {_conversation?.outputMuted ? "Unmute Speaker" : "Mute Speaker"}
        </button>
        {/* Mute/Unmute Mic Button */}
        {_hasTakenOver && (
          <button
            onClick={handleClickMuteInput}
            disabled={!(_conversation && _connected)}
          >
            {_conversation?.inputMuted ? "Unmute Mic" : "Mute Mic"}
          </button>
        )}
        {/* Agent Takeover Button */}
        {!_hasTakenOver && (
          <button
            onClick={handleTakeOver}
            disabled={!(_conversation && _connected)}
          >
            Take Over
          </button>
        )}
        {_conversation?.connected && (
          <button
            onClick={handleHangup}
            disabled={!(_conversation && _connected)}
          >
            End Call
          </button>
        )}
      </div>

      {/* Transcript and Dialpad Panels */}
      <div className="content">
        <div className="transcript-panel">
          <div id="transcript">
            {_transcript.map((message, index) => (
              <div className="transcript" key={index}>
                <div>
                  <span className="bold">
                    {participantTypeToTitleMapping[
                      message.participantType as keyof typeof participantTypeToTitleMapping
                    ] ?? message.participantType}
                  </span>{" "}
                </div>
                <div>{message.text}</div>
              </div>
            ))}
          </div>
        </div>
        {/** Dialpad Panel */}
        <div className="dialpad-panel">
          <h4 style={{ marginBottom: "10px" }}>Dialpad</h4>
          <div className="dialpad">
            {dialpadRows.map((row, i) => (
              <div className="row" key={i}>
                {row.map((btn) => (
                  <button
                    className="dtmf"
                    key={btn.code}
                    onClick={createHandleClickSendDtmfCode(btn.code)}
                  >
                    <div className="bold">{btn.label}</div>
                    {btn.sub && <div>{btn.sub}</div>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synthesized Speech Input and Submit Form */}
      <form
        className="controls"
        onSubmit={handleSubmitSynthesizedSpeech}
        style={{
          display: "flex",
          flexDirection: "row",
          marginTop: "10px",
          gap: "10px",
        }}
      >
        <input
          type="text"
          style={{ width: "40%" }}
          placeholder="text to speech"
          value={_speechMessage}
          onChange={handleSpeechMessageChanged}
        />
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}

export default App;
