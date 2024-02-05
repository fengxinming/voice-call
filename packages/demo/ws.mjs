import { WebSocketServer } from 'ws';

const ws = new WebSocketServer({ port: 1024 }, (() => {
  console.info('服务已启动');
}));

ws.on('connection', () => {
  console.info('客户端已连接');
});
