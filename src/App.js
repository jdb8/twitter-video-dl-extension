import * as React from 'react';
import logo from './logo.svg';
import './App.css';

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

  return (
    <div className="App">
      <button disabled={isLoading} onClick={() => {
        setIsLoading(true);
        global.chrome.runtime.sendMessage({ greeting: 'hello' }, function(response) {
          console.log('got response!');
          setValue(JSON.stringify(response, null, 2));
          setIsLoading(false);
        });
      }}>Click me</button>
      <div style={{width: 200, height: 200}}>{value}</div>
    </div>
  );
}

export default App;
