# Audio Spectrum Visualizer

A real-time audio frequency visualizer built with the Web Audio API and HTML5 Canvas. This project demonstrates:

- Audio context creation and manipulation
- Real-time frequency data analysis with AnalyserNode
- Dynamic canvas drawing based on audio spectra
- Interactive controls (play/pause, volume)
- Microphone input (device audio) via getUserMedia
- Modern vanilla JavaScript (no frameworks)

## Features

- Captures audio from the default microphone (or system audio if configured) using `navigator.mediaDevices.getUserMedia`.
- Visualizes frequency bins as a colorful bar graph.
- Volume slider controls input gain.
- Play/Pause button to start and stop audio capture and visualization.
- Responsive design centered on the page.

## How to Run

1. Clone or download this repository.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge) **served via HTTP** (file:// may block microphone in some browsers; consider using a local server like `python -m http.server` or VS Code Live Server).
3. Click the **Play** button.
4. Grant microphone permission when prompted.
5. Adjust the volume slider as desired.
6. Speak or play audio near the microphone to see the visualization react.

## Implementation Details

- Uses `AudioContext` to create an analyser node.
- Connects microphone stream → MediaStreamAudioSourceNode → GainNode (volume) → AnalyserNode → destination.
- The AnalyserNode provides frequency domain data via `getByteFrequencyData`.
- The canvas is animated with `requestAnimationFrame`, drawing each frequency bin as a vertical bar.
- No external audio files are required; uses live input.

## Customization

- Change `analyser.fftSize` for higher/lower resolution (powers of two).
- Adjust color mapping in the `fillStyle` calculation.
- Replace microphone source with an audio file source using `fetch` and `decodeAudioData` for pre‑recorded visualization.

## License

MIT – feel free to use and modify for your portfolio or learning.
