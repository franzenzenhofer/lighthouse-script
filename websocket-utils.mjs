import WebSocket from 'ws';

export function createWebSocketServer() {
  const wss = new WebSocket.Server({ noServer: true });

  let runningTests = false;

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');
    
    ws.on('message', (message) => {
      console.log('WebSocket message received:', message);
      if (message === 'getStatus') {
        const response = JSON.stringify({ runningTests });
        console.log('Sending WebSocket message:', response);
        ws.send(response);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  function handleUpgrade(request, socket, head) {
    console.log('WebSocket upgrade request received');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }

  function broadcast(message) {
    // Check if the message is an object and stringify it if necessary
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
  
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  

  function setRunningTests(status) {
    runningTests = status;
    console.log('Running tests status set to:', status);
    const message = JSON.stringify({ runningTests });
    console.log('Broadcasting test status to all clients:', message);
    broadcast(message);
  }

  function sendTestStart(url) {
    const message = JSON.stringify({ event: 'testStart', url });
    console.log('Broadcasting test start to all clients:', message);
    broadcast(message);
  }
  
  function sendTestEnd(url, duration) {
    const message = JSON.stringify({ event: 'testEnd', url, duration });
    console.log('Broadcasting test end to all clients:', message);
    broadcast(message);
  }
  
  function sendTestError(url, error) {
    const message = JSON.stringify({ event: 'testError', url, error });
    console.log('Broadcasting test error to all clients:', message);
    broadcast(message);
  }
  
  return {
    wss,
    setRunningTests,
    handleUpgrade,
    sendTestStart,
    sendTestEnd,
    sendTestError,
    broadcast, // Add this line to export the broadcast function
  };
}
