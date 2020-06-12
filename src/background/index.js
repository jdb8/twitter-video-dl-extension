const { createFFmpeg } = require('@ffmpeg/ffmpeg');

const corePath = global.chrome.runtime.getURL('./vendor/ffmpeg-core/ffmpeg-core.js');
const ffmpeg = createFFmpeg({ corePath, log: true });

const playlists = new Map();
const twitterVideoTabs = new Set();

const loadFfmpeg = async (tabId) => {
    await ffmpeg.load();
    global.chrome.browserAction.setIcon({ path: 'twitter_128.png', tabId });
}

const resetView = (data) => {
    const tabObject = playlists.get(data.tabId);
    if (tabObject) {
        console.log('clearing!');
        tabObject.viewSpecificVideoIds.clear();
    }

    syncBadge(data.tabId);
};

const syncBadge = (tabId) => {
    console.log('sync', { tabId }, {ffmpeg});
    const tabObject = playlists.get(tabId);
    let badgeText = '';
    if (tabObject) {
        const viewSpecificVideoIds = tabObject.viewSpecificVideoIds;
        badgeText = viewSpecificVideoIds.size > 0 ? '' + viewSpecificVideoIds.size : '';
    }

    console.log('syncing badge', { tabId, tabObj: playlists.get(tabId), badgeText });
    global.chrome.browserAction.setBadgeText({ text: badgeText, tabId });
};

global.chrome.webNavigation.onHistoryStateUpdated.addListener(resetView);
global.chrome.webNavigation.onBeforeNavigate.addListener(resetView);

global.chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (twitterVideoTabs.has(tabId)) {
        console.log('unloading twitter tab video', tabId);
        playlists.delete(tabId);
        twitterVideoTabs.delete(tabId);
        console.log({ playlists });
    }
});

global.chrome.webRequest.onCompleted.addListener(
    function (info) {
        loadFfmpeg(info.tabId);

        console.log('m3u8 playlist intercepted: ' + info.url, { info });
        const videoId = info.url.match(/(?:amplify|ext_tw)_video\/(\d+?)\//)[1];

        twitterVideoTabs.add(info.tabId);
        console.log(global.chrome.browserAction);

        let tabObject = playlists.get(info.tabId);
        if (!tabObject) {
            tabObject = { id: info.tabId, urlMap: new Map(), viewSpecificVideoIds: new Set() };
            playlists.set(info.tabId, tabObject);
        }

        tabObject.urlMap.set(videoId, info.url);
        tabObject.viewSpecificVideoIds.add(videoId);
        syncBadge(info.tabId);
        console.log(playlists);
    },
    {
        urls: ['https://video.twimg.com/*.m3u8?tag=*'],
    }
);

global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log({ request, sender });
    if (request.greeting === 'hello') {
        const filename = `${request.videoId}.mp4`;
        transcode(sender.tab.id, request.videoId, filename)
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
        if (!playlists.has(sender.tab.id) || !playlists.get(sender.tab.id).urlMap.has(request.videoId)) {
            sendResponse({ error: 'missing_video_id' });
        } else {
            // still kinda jank
            ffmpeg.load().then(() => {
                sendResponse('loaded');
                global.chrome.browserAction.setIcon({ path: 'twitter_128.png', tabId: sender.tab.id });
            });
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

const transcode = async (tabId, videoId, filename) => {
    console.log('Loading ffmpeg-core.js');
    // TODO: find good way to preload this - seems like background.js still janks up
    // the main thread when we run this
    await ffmpeg.load();

    try {
        // Short-circuit in case we already have it
        const data = ffmpeg.read(filename);
        console.log('No need to transcode, already done:', filename);
        return getUrlFromData(data);
    } catch (e) {
        // nada
    }

    console.log('Start transcoding');

    const masterPlaylist = playlists.get(tabId).urlMap.get(videoId);
    const masterPlaylistResp = await fetch(masterPlaylist);
    const playlistUrls = (await masterPlaylistResp.text())
        .split('\n')
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => new URL(masterPlaylist).origin + line);
    console.log({ playlistUrls });
    const highestQualityUrl = playlistUrls[playlistUrls.length - 1];

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
