# Audio Spectrum Visualizer

A real-time audio frequency visualizer built with the Web Audio API and HTML5 Canvas. This project demonstrates:

- Audio context creation and manipulation
- Real-time frequency data analysis with AnalyserNode
- Dynamic canvas drawing based on audio spectra
- Interactive controls (play/pause, volume)
- Modern vanilla JavaScript (no frameworks)

## Features

- Generates a continuous sine tone (A4) as the audio source
- Visualizes frequency bins as a colorful bar graph
- Volume slider controls output gain
- Play/Pause button to start and stop audio and visualization
- Responsive design centered on the page

## How to Run

1. Clone or download this repository.
2. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge).
3. Click the **Play** button to start the visualization.
4. Adjust the volume slider as desired.

## Implementation Details

- Uses `AudioContext` to generate an oscillator node.
- Connects oscillator → GainNode (volume) → AnalyserNode → destination.
- The AnalyserNode provides frequency domain data via `getByteFrequencyData`.
- The canvas is animated with `requestAnimationFrame`, drawing each frequency bin as a vertical bar.
- No external audio files are required; the tone is generated programmatically.

## Customization

- Change `source.type` to `'square'`, `'sawtooth'`, or `'triangle'` for different waveforms.
- Adjust `source.frequency.value` to change the base pitch.
- Modify `analyser.fftSize` for higher/lower resolution (powers of two).
- Replace the oscillator with an audio file source using `fetch` and `decodeAudioData` for real music visualization.

## License

MIT – feel free to use and modify for your portfolio or learning.
