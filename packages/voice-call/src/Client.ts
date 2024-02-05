import { ClientError } from './Error';

export class Client {
  socket: WebSocket | null = null;

  connect(url: string | URL, protocols?: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(url, protocols);
      console.info(`Connecting: ${url}.`);

      client.onopen = () => {
        console.info(`Connected WebSocket server, readyState is ${client.readyState}.`);
        this.socket = client;

        const onclose = () => {
          console.info('WebSocket connection closed.');
          this.socket = null;
          this.onDisconnect();
        };

        const onDisconnect = () => {
          const { readyState } = client;
          console.error(`WebSocket disconnected, readyState is ${readyState}.`);

          switch (readyState) {
            case 0: // CONNECTING
            case 1: // OPEN
              this.disconnect();
              break;
            case 2: // CLOSING
            case 3: // CLOSED
              onclose();
              break;
          }
        };

        client.onerror = onDisconnect;
        resolve();
      };

      client.onerror = (evt) => {
        const err = new ClientError('Could not connect WebSocket server.');
        console.error(err, evt);
        this.socket = null;
        reject(err);
      };
    });
  }

  send(data: Uint8Array): void {
    const { socket } = this;
    // open 状态下才发数据
    if (socket && socket.readyState === 1) {
      socket.send(data);
    }
  }

  disconnect(): Promise<void> {
    const { socket } = this;

    return new Promise((resolve) => {
      if (!socket) {
        console.warn('WebSocket has been closed.');
        resolve();
        return;
      }

      const onClose = () => {
        socket.removeEventListener('close', onClose);
        resolve();
      };
      switch (socket.readyState) {
        case 0: // CONNECTING
        case 1: // OPEN
          socket.addEventListener('close', onClose);
          socket.close();
          break;
        case 2: // CLOSING
          socket.addEventListener('close', onClose);
          break;
        case 3: // CLOSED
          resolve();
          break;
      }
    });
  }

  onDisconnect(): any {}
}
