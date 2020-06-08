/** @jsx jsx */
import * as React from 'react';
import { jsx } from '@emotion/core';
import tw from 'twin.macro';
import './App.css';

function Button({children, ...props}) {
  return (
      <button {...props} tw="w-full block bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow">
          {children}
      </button>
  );
}

function VideoList() {
    return (
        <div>
            <Button>hi</Button>
            <Button>hello</Button>
            <Button>bye</Button>
        </div>
    );
}

function App() {
    // console.log('render app');
    // React.useEffect(() => {
    //   console.log('useEffect addListener');
    //   global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    //       console.log(sender.tab ? 'from a content script:' + sender.tab.url : 'from the extension');
    //       if (request.greeting == 'hello') sendResponse({ farewell: 'goodbye' });
    //       return true;
    //   });
    // }, []);

    const [value, setValue] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    React.useEffect(() => {
      global.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.log('set value', JSON.stringify(request));
        setValue(JSON.stringify(request));
      });
    }, [])

    return (
        <div tw="m-5">
            <VideoList videos={[
              {}
            ]}></VideoList>
            <Button
                disabled={isLoading}
                onClick={() => {
                    setIsLoading(true);
                    global.chrome.runtime.sendMessage({ greeting: 'hello' }, function (response) {
                        console.log('got response!');
                        setValue(JSON.stringify(response, null, 2));
                        setIsLoading(false);
                    });
                }}
            >
                Click me!
            </Button>
            <div css={{ width: 200, height: 200 }}>{value}</div>
        </div>
    );
}

export default App;
