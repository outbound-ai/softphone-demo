# Outbound.Calls.Softphone.Demo
A demonstration of using the [@outbound-ai/softphone] NPM package package with a [create-react-app](https://create-react-app.dev/) project template.

## Notes
- You will need to configure your ~/.npmrc file like this to access the [@outbound-ai/softphone] NPM package and run ```npm install```.

    ```
    //npm.pkg.github.com/:_authToken={YOUR_PAT_TOKEN_HERE}
    @outbound-ai:registry=https://npm.pkg.github.com
    ```

- You can then use  ```npm run start``` to launch this project against a local instance of the call service  See the package.json file for the environment variables if you want to run this against other deployments of the service.

- If you experience a problem, verify that the package.json is referencing the current version of the [@outbound-ai/softphone] NPM package and run ```npm update```. Sometimes a local reference gets checked in.

# Softphone Application Component (src/softphone/Softphone.tsx)

The main Softphone application component.

This component manages the state and UI for a softphone demo, including conversation management,
participant handling, transcript display, dialpad interactions, mute/unmute controls, agent takeover,
and synthesized speech functionality.

## State Variables
- _conversation: The current active conversation instance.
- _connected: Indicates if the softphone is connected to a conversation.
- _muted: Indicates if the output (speaker) is muted.
- _speechMessage: The current text input for speech synthesis.
- _transcript: Array of transcript messages exchanged in the conversation.
- _takeOverType: The current agent takeover type.
- _participants: A record of participant IDs and their display names.
- _hasTakenOver: Indicates if the agent has taken over the conversation.
- _payerAgentReady: Indicates if the payer agent is ready to take over.

## Effects
- Sets up conversation event handlers for connection state, transcript updates, and agent hold events.
- Handles agent takeover confirmation when the payer agent is ready.

## Event Handlers
- handleClickConnectAsync: Connects or disconnects the softphone from a conversation.
- handleClickMute: Toggles speaker mute state.
- handleClickMuteInput: Toggles microphone mute state.
- createHandleClickRemoveParticipant: Removes a participant from the conversation.
- handleSpeechMessageChanged: Updates the speech message input.
- handleSubmitSynthesizedSpeech: Submits text for speech synthesis.
- createHandleClickSendDtmfCode: Sends DTMF codes via the dialpad.
- handleHangup: Hangs up the current conversation.

## UI Elements
- Claim ID input field for starting a call.
- Mute/unmute speaker and microphone buttons.
- Agent takeover and hangup buttons.
- Transcript panel displaying exchanged messages.
- Dialpad for sending DTMF codes.
- Synthesized speech input and submit form.
- Participant list
- End call - Hangup