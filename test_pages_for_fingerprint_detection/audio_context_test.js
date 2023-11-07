if (
  ((context = new (window.OfflineAudioContext ||
    window.webkitOfflineAudioContext)(1, 44100, 44100)),
  !context)
) {
  set_result("no_fp", "pxi_result");
  pxi_output = 0;
}

// Create oscillator
pxi_oscillator = context.createOscillator();
pxi_oscillator.type = "triangle";
pxi_oscillator.frequency.value = 1e4;

// Create and configure compressor
pxi_compressor = context.createDynamicsCompressor();
pxi_compressor.threshold && (pxi_compressor.threshold.value = -50);
pxi_compressor.knee && (pxi_compressor.knee.value = 40);
pxi_compressor.ratio && (pxi_compressor.ratio.value = 12);
pxi_compressor.reduction && (pxi_compressor.reduction.value = -20);
pxi_compressor.attack && (pxi_compressor.attack.value = 0);
pxi_compressor.release && (pxi_compressor.release.value = 0.25);

// Connect nodes
pxi_oscillator.connect(pxi_compressor);
pxi_compressor.connect(context.destination);

// Start audio processing
pxi_oscillator.start(0);
context.startRendering();
context.oncomplete = function (evnt) {
  pxi_output = 0;
  var sha = sha1.create();
  for (var i = 0; i < evnt.renderedBuffer.length; i++) {
    sha1.update(evnt.renderedBuffer.getChannelData(0)[i].toString());
  }
  pxi_full_buffer_hash = sha.h1;
  set_result(pxi_full_buffer_hash, "pxi_full_buffer_result");
  console.log(pxi_full_buffer_hash);
  for (var i = 4500; 5e3 > i; i++) {
    pxi_output += Math.abs(evnt.renderedBuffer.getChannelData(0)[i]);
  }
  set_result(pxi_output.toString(), "pxi_result");
  pxi_compressor.disconnect();
};

function set_result(result, element_id) {
  console.log("AudioContext Property FP:", result);
}

// const AudioContext =
//   window.OfflineAudioContext || window.webkitOfflineAudioContex;

// const context = new AudioContext(1, 5000, 44100);

// const oscillator = context.createOscillator();
// oscillator.type = "triangle";
// oscillator.frequency.value = 1000;

// const compressor = context.createDynamicsCompressor();
// compressor.threshold.value = -50;
// compressor.knee.value = 40;
// compressor.ratio.value = 12;
// compressor.reduction.value = 20;
// compressor.attack.value = 0;
// compressor.release.value = 0.2;

// oscillator.connect(compressor);
// compressor.connect(context.destination);

// oscillator.start();
// context.oncomplete = event => {
//   // We have only one channel, so we get it by index
//     const samples = event.renderedBuffer.getChannelData(0);
//     console.log(samples);
// };
// context.startRendering().then(renderedBuffer => {
//     console.log('Rendering completed successfully');
// });
