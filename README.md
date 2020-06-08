# twitter-video-dl

**Super early alpha status: lots of bugs** - see [Troubleshooting](#Troubleshooting) if you run into problems.

![how it looks](./example.png)

## Install

For now, you'll need to download the extension from github and installed it unpacked:

1. Download the extension
1. `cd twitter-video-dl-extension && yarn build`
1. Visit chrome://extensions (via omnibox or menu -> Tools -> Extensions)
1. Enable Developer mode by ticking the checkbox in the upper-right corner
1. Click on the "Load unpacked extension..." button
1. Select the directory containing the downloaded extension code

I'll look into creating a CRX soon, I guess.

## Usage

Once installed, you should be able to right-click on any Twitter video and see a 'Download video' link. Clicking it should download the video as an mp4.

## Why

I couldn't find any existing extensions/user scripts that would allow me to download Twitter videos entirely client-side. Most existing services appear to use the Twitter API on the backend, and request your tweet remotely to grab the raw video files.

This extension doesn't require a Twitter API key as it uses the data that your browser already downloaded in order to play the video, powered by the [wasm port of ffmpeg] to transcode in the background.

## Troubleshooting

There are a bunch of bugs right now, so if you run into problems the following steps are suggested:

* Try refreshing the page
* If that doesn't work, try reloading the extension in `chrome://extensions`
* If you still get problems, please file an issue with any console output from the background view (inspect-able from `chrome://extensions`) as well as the console of the page you're viewing on Twitter
