// If your extension doesn't need a background script, just leave this file empty
const { createFFmpeg } = require('@ffmpeg/ffmpeg');

const corePath = global.chrome.runtime.getURL('./vendor/ffmpeg-core/ffmpeg-core.js');
const ffmpeg = createFFmpeg({ corePath, log: true });

const playlists = new Map();

global.chrome.webRequest.onCompleted.addListener(
    function (info) {
        console.log('m3u8 playlist intercepted: ' + info.url, { info });
        const videoId = info.url.match(/(?:amplify|ext_tw)_video\/(\d+?)\//)[1];

        // TODO: work out good removal strategy to avoid this growing infinitely
        playlists.set(videoId, info.url);
        console.log(playlists);
    },
    {
        urls: ['https://video.twimg.com/*.m3u8?tag=*'],
    }
);

global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.greeting === 'hello') {
        const filename = `${request.videoId}.mp4`;
        transcode(request.videoId, filename)
            .then((url) => {
                if (url) {
                    global.chrome.downloads.download({
                        url: url,
                        filename,
                    });
                    sendResponse('done!');
                } else {
                    sendResponse('failed :(');
                }
            })
            .catch((err) => sendResponse(err));

        return true;
    } else if (request.event === 'contextmenu') {
        if (!playlists.has(request.videoId)) {
            sendResponse({error: 'missing_video_id'});
        } else {
            ffmpeg.load().then(() => sendResponse('loaded'));
        }
    }
});

export const getLastValueInMap = (map) => Array.from(map)[map.size - 1][1];

function getUrlFromData(data) {
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    console.log({ url });
    return url;
}

const transcode = async (videoId, filename) => {
    console.log('Loading ffmpeg-core.js');
    // TODO: find good way to preload this - seems like background.js still janks up
    // the main thread when we run this
    await ffmpeg.load();

    try {
        // Short-circuit in case we already have it
        const data = ffmpeg.read(filename);
        console.log('No need to transcode, already done:', filename)
        return getUrlFromData(data);
    } catch (e) {
        // nada
    }

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
    try {
        await ffmpeg.run(
            `-protocol_whitelist file,http,https,tcp,tls -i input.m3u8 -bsf:a aac_adtstoasc -vcodec copy -c copy -crf 50 ${filename}`
        );
    } catch (e) {
        console.error(e);
        return null;
    }

    console.log('Complete transcoding');
    const data = ffmpeg.read(filename);
    return getUrlFromData(data);
};
