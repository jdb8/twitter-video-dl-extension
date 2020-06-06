// If your extension doesn't need a background script, just leave this file empty
const { createFFmpeg } = require('@ffmpeg/ffmpeg');

const corePath = global.chrome.runtime.getURL('./vendor/ffmpeg-core/ffmpeg-core.js');
console.log('hmmm', { corePath });

// const corePath = require.resolve('@ffmpeg/core');
// console.log({corePath});

const ffmpeg = createFFmpeg({ corePath, log: true });

const playlists = new Map();

global.chrome.webRequest.onCompleted.addListener(
    function (info) {
        console.log('Cat intercepted: ' + info.url);
        const urlParts = info.url.split('/');
        const quality = urlParts[urlParts.length - 2];
        playlists.set(quality, info.url);
        console.log(playlists);
        // Redirect the lolcal request to a random loldog URL.
        // var i = Math.round(Math.random() * loldogs.length);
        // return { redirectUrl: loldogs[i] };
    },
    // filters
    {
        urls: ['https://video.twimg.com/*.m3u8'],
    }
);

global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(sender.tab ? 'from a content script:' + sender.tab.url : 'from the extension');
    if (request.greeting == 'hello') {
        transcode().then((url) => {
            global.chrome.downloads.download({
                url: url,
                filename: 'my-cool-video.mp4', // Optional
            });
            sendResponse('done!');
        }).catch(err => sendResponse(err));
        return true;
    }
});

export const getLastValueInMap = (map) => Array.from(map)[map.size - 1][1];

// const playlistUrl = 'https://video.twimg.com/ext_tw_video/1255378027409739776/pr/pl/1280x720/2cDdtdfrTVszP4xt.m3u8';

// This needs to be an export due to typescript implementation limitation of needing '--isolatedModules' tsconfig
const transcode = async () => {
    console.log('Loading ffmpeg-core.js');
    await ffmpeg.load();
    console.log('Start transcoding');

    const playlistUrl = getLastValueInMap(playlists);
    const resp = await fetch(playlistUrl);
    const playList = await resp.text();
    const playListLines = playList.split('\n');
    const tsFiles = playListLines.filter((line) => line.endsWith('.ts'));
    const playListData = playListLines
        .map((line) => {
            if (line.endsWith('.ts')) {
                const fileNamePieces = line.split('/');
                const basename = fileNamePieces[fileNamePieces.length - 1];
                return basename;
            }
            return line;
        })
        .join('\n');
    console.log({ tsFiles });

    console.log(playListData);

    await Promise.all(
        tsFiles.map(async (fileName) => {
            const fileNamePieces = fileName.split('/');
            const basename = fileNamePieces[fileNamePieces.length - 1];
            const resp = await fetch(`https://video.twimg.com${fileName}`);
            const data = await resp.blob();
            return ffmpeg.write(basename, data);
        })
    );

    await ffmpeg.writeText('input.m3u8', playListData);
    await ffmpeg.run(
        '-protocol_whitelist file,http,https,tcp,tls -i input.m3u8 -bsf:a aac_adtstoasc -vcodec copy -c copy -crf 50 output.mp4'
    );
    console.log('Complete transcoding');
    const data = ffmpeg.read('output.mp4');

    // const video = document.getElementById('output-video');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    console.log({ url });
    return url;
    // video.src = url;

    // var a = document.createElement('a');
    // document.body.appendChild(a);
    // a.style = 'display: none';
    // a.href = url;
    // a.download = 'video.mp4';
    // a.click();
};
