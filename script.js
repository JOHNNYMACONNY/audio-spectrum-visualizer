const canvas = document.getElementById('analyserCanvas');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');

let audioCtx = null;
let analyser = null;
let source = null;
let rafID = null;
let isPlaying = false;

// Initialize audio context and analyser
function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    return { analyser, bufferLength, dataArray, audioCtx };
}

function draw() {
    const state = drawState;
    if (!state) return;
    const { analyser, bufferLength, dataArray } = state;
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
let stream = null;

// Request microphone and set up source
async function setupMicrophone() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        sourceNode.connect(analyser);
        // Volume control
        const gainNode = audioCtx.createGain();
        sourceNode.disconnect(); // disconnect from analyser to insert gain
        sourceNode.connect(gainNode);
        gainNode.connect(analyser);
        gainNode.gain.value = volumeSlider.value;
        volumeSlider.addEventListener('input', () => {
            gainNode.gain.value = volumeSlider.value;
        });
        drawState = { analyser, bufferLength: analyser.frequencyBinCount, dataArray: new Uint8Array(analyser.frequencyBinCount), audioCtx };
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please grant permission and try again.');
    }
}

playBtn.addEventListener('click', async () => {
    if (!isPlaying) {
        if (!audioCtx) {
            const init = initAudio();
            drawState = { analyser: init.analyser, bufferLength: init.bufferLength, dataArray: new Uint8Array(init.bufferLength), audioCtx: init.audioCtx };
            analyser = init.analyser;
            audioCtx = init.audioCtx;
        }
        await setupMicrophone();
        if (drawState) {
            draw();
            playBtn.textContent = 'Pause';
            isPlaying = true;
        }
    } else {
        // Stop
        if (rafID) cancelAnimationFrame(rafID);
        if (source) source.disconnect();
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        playBtn.textContent = 'Play';
        isPlaying = false;
        // Optionally close audio context to free resources
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close().then(() => {
                audioCtx = null;
                drawState = null;
                analyser = null;
            });
        }
    }
});