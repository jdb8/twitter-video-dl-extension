// If your extension doesn't need a content script, just leave this file empty

// This is an example of a script that will run on every page. This can alter pages
// Don't forget to change `matches` in manifest.json if you want to only change specific webpages
// printAllPageLinks();

// // This needs to be an export due to typescript implementation limitation of needing '--isolatedModules' tsconfig
// export function printAllPageLinks() {
//   const allLinks = Array.from(document.querySelectorAll('a')).map(
//     link => link.href
//   );

//   console.log('-'.repeat(30));
//   console.log(
//     `These are all ${allLinks.length} links on the current page that have been printed by the Sample Create React Extension`
//   );
//   console.log(allLinks);
//   console.log('-'.repeat(30));
// }

// console.log('hi!!!! lol');
// document.querySelector('video').addEventListener('click', (e) => {
//     console.log('lol', {e});
// });

// import downloadSvg from '../zondicons/download.svg';

global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(request.event, { request, sender });
    const urlPieces = window.location.href.split('/');
    if (urlPieces[urlPieces.length - 2] === 'status') {
        addDownloadButton();
    }
});

// console.log(downloadSvg);

let attempts = 0;

function addDownloadButton() {
    if (attempts >= 5) {
        return;
    }

    console.log('trying', { attempts });

    const group = document.querySelector('[role="group"]');
    if (group) {
        // const row = document.querySelector('article > div > div:nth-child(3) > div:nth-child(3)');
        const row = document.querySelector(
            'a[href="https://help.twitter.com/using-twitter/how-to-tweet#source-labels"]'
        ).parentElement.parentElement.parentElement;
        console.log({ row });


        const video = document.querySelector('video');
        const videoId = video.poster.match(/\/ext_tw_video_thumb\/(\d+?)\//)[1];
        console.log({ videoId, video });
        const placementTracking = video.closest('[data-testid="placementTracking"]');

        placementTracking.addEventListener('contextmenu', (e) => {
            var menuItemObserver = new MutationObserver(function (mutations, me) {
                console.log({ mutations });
                const menuItem = placementTracking.querySelector('[role=menuitem]');
                console.log({ menuItem });
                if (menuItem) {
                    const menuItemWrapper = menuItem.parentElement;
                    if (menuItemWrapper.querySelector('[data-dl-button]')) {
                        console.warn('already added button');
                        me.disconnect();
                        return;
                    }

                    const clone = menuItem.cloneNode(true);
                    clone.tabIndex = 1;
                    clone.dataset.dlButton = 'true';
                    const textSpan = clone.querySelector('span');
                    textSpan.innerText = 'Download video';

                    clone.addEventListener('mouseover', (e) => {
                        clone.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    });

                    clone.addEventListener('mouseout', (e) => {
                        clone.style.backgroundColor = 'transparent';
                    });

                    clone.addEventListener('click', (e) => {
                        console.log('clicked download ' + videoId);
                        const urlPieces = window.location.href.split('/');
                        global.chrome.runtime.sendMessage(
                            { videoId, tweetId: urlPieces[urlPieces.length - 1], greeting: 'hello' },
                            function (response) {
                                console.log('got response!');
                                console.log({ response });
                                textSpan.innerText = 'Downloaded!';
                            }
                        );
                    });

                    menuItem.insertAdjacentElement('afterend', clone);

                    me.disconnect();
                    return;
                }
            });

            menuItemObserver.observe(placementTracking, {
                childList: true,
                subtree: true,
            });

            console.log({ menuItemObserver });
        });

        if (row.querySelector('[data-download-link]')) {
            console.warn('button already there');
            return;
        }

        const aTagClasses = row.querySelector('a').classList;
        const button = document.createElement('button');

        // const img = new Image();
        // img.src = downloadSvg;
        // button.appendChild(img);

        button.classList = aTagClasses;
        button.dataset.downloadLink = true;

        const span = document.createElement('span');
        span.innerText = 'Download video';
        button.appendChild(span);

        button.addEventListener('click', () => {
            span.innerText = 'Downloading...';
            button.disabled = true;

            const urlPieces = window.location.href.split('/');
            global.chrome.runtime.sendMessage(
                { tweetId: urlPieces[urlPieces.length - 1], greeting: 'hello' },
                function (response) {
                    console.log('got response!');
                    console.log({ response });
                    span.innerText = 'Downloaded!';
                }
            );

            // global.chrome.downloads.download(
            //     {
            //         url: '#',
            //         // filename: 'my-cool-video.mp4', // Optional
            //     },
            //     (downloadId) => {
            //         global.chrome.downloads.pause(downloadId, () => {
            //             console.log('paused!');
            //             global.chrome.runtime.sendMessage({ greeting: 'hello', downloadId }, function (response) {
            //                 console.log('got response!');
            //                 console.log({ response });
            //                 span.innerText = 'Downloaded!';
            //             });
            //         });
            //     }
            // );
        });

        const rowContents = row.children[0];
        const clone = rowContents.children[0].cloneNode();
        clone.appendChild(button);
        rowContents.appendChild(clone);
    } else {
        console.warn('no group, trying again');
        attempts++;
        setTimeout(addDownloadButton, 500);
    }
}
