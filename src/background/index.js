// If your extension doesn't need a background script, just leave this file empty
const { createFFmpeg } = require('@ffmpeg/ffmpeg');

const corePath = global.chrome.runtime.getURL('./vendor/ffmpeg-core/ffmpeg-core.js');
console.log('hmmm', { corePath });

// const corePath = require.resolve('@ffmpeg/core');
// console.log({corePath});

const ffmpeg = createFFmpeg({ corePath, log: true });

const playlists = new Map();

// global.chrome.webNavigation.onHistoryStateUpdated.addListener((data) => {
//     console.log('wooo', { data });
//     playlists.clear();
//     console.log('cleared playlists map', playlists);
//     global.chrome.tabs.sendMessage(data.tabId, { event: 'changed_tab', url: data.url });
// });

global.chrome.webRequest.onCompleted.addListener(
    function (info) {
        ffmpeg.load();
        console.log('Cat intercepted: ' + info.url, { info });
        if (info.tabId > 0) {
            // the request might be from our own extension
            global.chrome.tabs.sendMessage(info.tabId, { event: 'got_playlist', url: info.url });
        }
        // const urlParts = info.url.split('/');
        // const quality = urlParts[urlParts.length - 2];
        const videoId = info.url.match(/ext_tw_video\/(\d+?)\//)[1];

        // let qualityMap = playlists.get(videoId);
        // if (!qualityMap) {
        //     qualityMap = new Map();
        //     playlists.set(videoId, qualityMap);
        // }

        playlists.set(videoId, info.url);
        console.log(playlists);
    },
    // filters
    {
        urls: ['https://video.twimg.com/*.m3u8?tag=*'],
    }
);

global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.greeting === 'hello') {
        const filename = `${request.tweetId}.mp4`;
        transcode(request.videoId, filename)
            .then((url) => {
                global.chrome.downloads.download({
                    url: url,
                    filename, // Optional
                });
                sendResponse('done!');
            })
            .catch((err) => sendResponse(err));

        return true;
    }
});

export const getLastValueInMap = (map) => Array.from(map)[map.size - 1][1];

const transcode = async (videoId, filename) => {
    console.log('Loading ffmpeg-core.js');
    await ffmpeg.load();
    console.log('Start transcoding');

    const masterPlaylist = playlists.get(videoId);
    const masterPlaylistResp = await fetch(masterPlaylist);
    const playlistUrls = (await masterPlaylistResp.text())
        .split('\n')
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => new URL(masterPlaylist).origin + line);
    console.log({ playlistUrls });
    const highestQualityUrl = playlistUrls[playlistUrls.length - 1];

    // const qualityMap = playlists.get(videoId);
    // const playlistUrl = getLastValueInMap(qualityMap);
    console.log({ highestQualityUrl });
    const resp = await fetch(highestQualityUrl);
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
        `-protocol_whitelist file,http,https,tcp,tls -i input.m3u8 -bsf:a aac_adtstoasc -vcodec copy -c copy -crf 50 ${filename}`
    );
    console.log('Complete transcoding');
    const data = ffmpeg.read(filename);

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    console.log({ url });
    return url;
};
