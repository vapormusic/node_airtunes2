var AirTunes = require('../lib/'),
    spawn = require('child_process').spawn,
    argv = require('optimist')
      .usage('Usage: $0 --host [host] --port [num] --ffmpeg [path] --file [path] --volume [num] --password [string] --mode [mode]')
      .default('port', 5002)
      .default('volume', 50)
      .default('ffmpeg', 'C:\\ffmpeg-4.4-essentials_build\\bin\\ffmpeg.exe')
      .default('file', './wakeup.mp3')
      .demand(['host'])
      .argv;

console.log('adding device: ' + argv.host + ':' + argv.port);
var airtunes = new AirTunes();
var device = airtunes.add(argv.host, argv, 0,  [
  'cn=0,1,2,3',
  'da=true',
  'et=0,3,5',
  'ft=0x4A7FCA00,0xBC354BD0',
  'sf=0x98484',
  'md=0,1,2',
  'am=AudioAccessory5,1',
  'pk=lolno',
  'tp=UDP',
  'vn=65537',
  'vs=610.20.41',
  'ov=15.4.1',
  'vv=2'
]);

// when the device is online, spawn ffmpeg to transcode the file
device.on('status', function(status) {
  console.log('status: ' + status);

  if(status !== 'ready')
    return;

  var ffmpeg = spawn(argv.ffmpeg, [
    '-i', argv.file,
    '-acodec', 'pcm_s16le',
    '-f', 's16le',        // PCM 16bits, little-endian
    '-ar', '44100',       // Sampling rate
    '-ac', 2,             // Stereo
    'pipe:1'              // Output on stdout
  ]);

  // pipe data to AirTunes
  ffmpeg.stdout.pipe(airtunes);

  // detect if ffmpeg was not spawned correctly
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', function(data) {
    if(/^execvp\(\)/.test(data)) {
      console.log('failed to start ' + argv.ffmpeg);
      process.exit(1);
    }
  });
});

// monitor buffer events
airtunes.on('buffer', function(status) {
  console.log('buffer ' + status);

  // after the playback ends, give some time to AirTunes devices
  if(status === 'end') {
    console.log('playback ended, waiting for AirTunes devices');
    setTimeout(function() {
      airtunes.stopAll(function() {
        console.log('end');
        process.exit();
      });
    }, 2000);
  }
});
