# Sonic Organism — Audio Visualizer

A generative audio visualizer that grows a living bioluminescent specimen from sound.

Instead of drawing normal EQ bars, **Sonic Organism** treats audio like biological fuel:

- **Bass** grows the root body and thickens branches.
- **Kicks** fire membrane pulses from the nucleus.
- **Mids** bend and warp the organism's branches.
- **Highs** release glowing spores and microscopic sparks.
- **Silence** lets fog and decay creep back in.
- **Time** matters: a full track leaves a final visual fossil you can export as PNG.

## Live Demo

GitHub Pages:

https://johnnymaconny.github.io/audio-spectrum-visualizer/

## Features

- Live microphone input via `navigator.mediaDevices.getUserMedia`.
- Audio file input for feeding the visualizer full songs.
- Vanilla Web Audio API frequency + waveform analysis.
- Canvas-based organic growth simulation: branches, spores, pulses, fog, and membrane waves.
- Persistent trails so each track creates a unique accumulated visual artifact.
- Adjustable input gain, growth memory, and mutation.
- Save the current specimen/fossil as a PNG.
- No framework and no build step.

## How to Run Locally

Because browsers often block microphone access on `file://`, serve the folder over HTTP:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

To test:

1. Click **Start Mic Growth** and grant microphone permission.
2. Or click **Feed Audio File** and choose a local track.
3. Let the audio play and watch the organism grow.
4. Click **Save PNG** when you want to export the final specimen.

## Controls

- **Start Mic Growth:** captures live microphone audio.
- **Feed Audio File:** loads and plays a local audio file.
- **New Specimen:** resets the organism with a fresh seed.
- **Save PNG:** downloads the current canvas.
- **Input gain:** controls audio input strength before analysis.
- **Growth memory:** controls how long trails and fossil marks remain.
- **Mutation:** controls branching turbulence and organic instability.

## Implementation Notes

The visualizer uses:

- `AudioContext`
- `AnalyserNode`
- `MediaStreamAudioSourceNode`
- `MediaElementAudioSourceNode`
- `CanvasRenderingContext2D`
- Seeded pseudo-random growth for reproducible specimen behavior per reset

No audio is uploaded anywhere. File playback and microphone analysis happen locally in the browser.

## License

MIT — use it, remix it, mutate it.
