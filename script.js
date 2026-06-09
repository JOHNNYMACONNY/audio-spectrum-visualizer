const canvas = document.getElementById('analyserCanvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');

let audioCtx = null;
let analyser = null;
let source = null;
let rafID = null;
let isPlaying = false;

// Initialize audio context
function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Create an oscillator source
    source = audioCtx.createOscillator();
    source.type = 'sine';
    source.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    // Volume control
    const gainNode = audioCtx.createGain();
    source.disconnect();
    source.connect(gainNode);
    gainNode.connect(analyser);
    gainNode.gain.value = volumeSlider.value;

    volumeSlider.addEventListener('input', () => {
        gainNode.gain.value = volumeSlider.value;
    });

    return { analyser, bufferLength, dataArray };
}

function draw() {
    const { analyser, bufferLength, dataArray } = drawState || initDrawState();
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${Math.floor(barHeight + 100)}, 50, ${Math.floor(255 - barHeight)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }

    rafID = requestAnimationFrame(draw);
}

let drawState = null;
function initDrawState() {
    const state = initAudio();
    drawState = state;
    return state;
}

playBtn.addEventListener('click', () => {
    if (!isPlaying) {
        source.start(0);
        draw();
        playBtn.textContent = 'Pause';
        isPlaying = true;
    } else {
        source.stop();
        cancelAnimationFrame(rafID);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        playBtn.textContent = 'Play';
        isPlaying = false;
    }
});

// Initialize but not start until play
initDrawState();