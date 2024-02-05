import './index.css';
import { useEffect, useRef, useState } from 'react';
import { Sender } from 'voice-call';
import visualizer from 'voice-call/plugins/visualizer';
import helper from 'voice-call/plugins/helper';

function App() {
  const [url, setUrl] = useState('ws://11.164.31.247:8088/talk/1.flv?token=encrypt&session=success');
  const ref = useRef();
  useEffect(() => {
    const sender = new Sender();
    sender.on('start', () => {
      console.info('启动服务');
    });
    sender.on('stop', () => {
      console.info('停止服务');
    });
    sender.on('disconnect', () => {
      console.info('连接中断');
    });
    sender.use(visualizer, {
      container: '#visualizer'
    });
    sender.use(helper);
    ref.current = sender;

    return () => {
      sender.dispose();
    };
  }, []);

  const start = () => {
    ref.current.start(url);
  };

  const stop = () => {
    ref.current.stop();
  };

  return (
    <>
      <div>
        地址: <input
          id="url"
          type="text"
          value={url}
          onChange={(evt) => {
            setUrl(evt.target.value);
          }}
        />
      </div>
      <div id="visualizer" />
      <div>
        <button onClick={start}>开始</button>&nbsp;&nbsp;
        <button onClick={stop}>停止</button>
      </div>
    </>
  );
}

export default App;
