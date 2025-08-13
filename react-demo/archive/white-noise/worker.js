class WhiteNoiseProcessor extends AudioWorkletProcessor {
    constructor (...args) {
      super(...args);
      this.port.onmessage = this.#handleMessage;
    }

    process(inputs, outputs, parameters) {
      const output = outputs[0];

      output.forEach(channel => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = Math.random() * 1.0 - 0.5
        }
      });

      return true;
    }

    #handleMessage = (event) => {
      console.log(event.data)
      this.port.postMessage("pong");
    }
  }
  
  registerProcessor('white-noise-processor', WhiteNoiseProcessor);