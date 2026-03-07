import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import VideoGenForm from './components/VideoGenForm';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="App">
        <header className="App-header">
          <h1>AI 视频生成工具</h1>
        </header>
        <main className="App-main">
          <VideoGenForm />
        </main>
      </div>
    </ConfigProvider>
  );
}

export default App;
