import WebSocket from 'ws';

export function createWebSocketServer() {
  const wss = new WebSocket.Server({ noServer: true });

  let runningTests = false;

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');
    ws.on('message', (message) => {
      console.log('WebSocket message received:', message);
      if (message === 'getStatus') {
        ws.send(JSON.stringify({ runningTests }));
      }
    });
  });

  return {
    wss,
    setRunningTests(status) {
      runningTests = status;
      console.log('Running tests status set to:', status);
    },
  };
}
