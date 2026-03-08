import React from 'react';
import { ConfigProvider, Tabs } from 'antd';
import { VideoCameraOutlined, PictureOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import VideoGenForm from './components/VideoGenForm';
import ImageGenForm from './components/ImageGenForm';
import './App.css';

function App() {
  const tabItems = [
    {
      key: 'video',
      label: (
        <span style={{ fontSize: 15, padding: '0 4px' }}>
          <VideoCameraOutlined style={{ marginRight: 6 }} />
          视频生成
        </span>
      ),
      children: <VideoGenForm />,
    },
    {
      key: 'image',
      label: (
        <span style={{ fontSize: 15, padding: '0 4px' }}>
          <PictureOutlined style={{ marginRight: 6 }} />
          图片生成
        </span>
      ),
      children: <ImageGenForm />,
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <div className="App">
        <header className="App-header">
          <h1>AI 视频 / 图片生成工具</h1>
        </header>
        <main className="App-main">
          <Tabs
            defaultActiveKey="video"
            items={tabItems}
            size="large"
            className="app-tabs"
            destroyInactiveTabPane={false}
          />
        </main>
      </div>
    </ConfigProvider>
  );
}

export default App;
