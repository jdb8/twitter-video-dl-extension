document.addEventListener('contextmenu', (e) => {
    const placementTracking = e.target.closest('[data-testid="placementTracking"]');
    if (placementTracking) {
        const video = placementTracking.querySelector('video');
        if (video) {
            console.log({ video, placementTracking });
            handleVideoRightClick(video, placementTracking);
        }
    }
});

function stop(e) {
    console.log('stopping', e);
    e.preventDefault();
    e.stopPropagation();
}

function handleVideoRightClick(video, placementTracking) {
    if (video.dataset.dlButtonDone) {
        return;
    }

    if (video.src.endsWith('.mp4')) {
        // it's a gif, funnily enough
        // TODO: support gifs
        return;
    }

    console.log({ video, poster: video.poster });
    const videoId = video.poster.match(/\/(?:ext_tw|amplify)_video_thumb\/(\d+?)\//)[1];
    console.log({ videoId, video });

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

            console.log('adding button');

            const clone = menuItem.cloneNode(true);
            clone.tabIndex = 1;
            clone.dataset.dlButton = 'true';
            const textSpan = clone.querySelector('span');
            textSpan.innerText = 'Download video';
            textSpan.style.opacity = 0.2;

            clone.addEventListener('click', stop);

            menuItem.insertAdjacentElement('afterend', clone);

            global.chrome.runtime.sendMessage({ videoId, event: 'contextmenu' }, (request, sender, sendResponse) => {
                console.log({ request });

                if (!request) {
                    return;
                }

                if (request.error === 'missing_video_id') {
                    textSpan.style.color = 'red';
                    console.error(
                        request.error,
                        'No video id found in background script data - try reloading the page'
                    );
                    return;
                }

                textSpan.style.opacity = 1;

                clone.addEventListener('mouseover', (e) => {
                    clone.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                });

                clone.addEventListener('mouseout', (e) => {
                    clone.style.backgroundColor = 'transparent';
                });

                clone.removeEventListener('click', stop);
                clone.addEventListener('click', (e) => {
                    console.log('clicked download ' + videoId);
                    global.chrome.runtime.sendMessage({ videoId, greeting: 'hello' }, function (response) {
                        console.log('got response!');
                        console.log({ response });
                    });
                });
            });

            me.disconnect();
            return;
        }
    });

    menuItemObserver.observe(placementTracking, {
        childList: true,
        subtree: true,
    });
}
