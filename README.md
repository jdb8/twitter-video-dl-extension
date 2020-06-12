# twitter-video-dl

**Super early alpha status: lots of bugs** - see [Troubleshooting](#Troubleshooting) if you run into problems.

<img src="./example.png" width="500" alt="how it looks" />

## Install

Until this is on the Chrome store, you'll need to download the extension from github and installed it unpacked:

1. Download the extension (as a zip file + unpack, or via `git clone git@github.com:jdb8/twitter-video-dl-extension.git`)
1. `cd twitter-video-dl-extension && yarn build`. This should create a `build` folder
1. Visit chrome://extensions (via omnibox or menu -> Tools -> Extensions)
1. Enable Developer mode by ticking the checkbox in the upper-right corner
1. Click on the "Load unpacked extension..." button
1. Select the `build`  directory that was generated earlier

Unfortunately Google seems to have disabled the ability to install local .crx files, so this is the only way to install it before it's on the store.

## Usage

Once installed, you should be able to right-click on any Twitter video and see a 'Download video' link. Clicking it should download the video as an mp4.

## Why

I couldn't find any existing extensions/user scripts that would allow me to download Twitter videos entirely client-side. Most existing services appear to use the Twitter API on the backend, and request your tweet remotely to grab the raw video files.

This extension doesn't require a Twitter API key as it uses the data that your browser already downloaded in order to play the video, powered by the [wasm port of ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm) to transcode in the background.

## Troubleshooting

There are a bunch of bugs right now, so if you run into problems the following steps are suggested:

* Try refreshing the page
* If that doesn't work, try reloading the extension in `chrome://extensions`
* If you still get problems, please file an issue with any console output from the background view (inspect-able from `chrome://extensions`) as well as the console of the page you're viewing on Twitter
