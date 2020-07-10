const WebSocket = require('ws');

const DOMAIN = `wss://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/${process.env.STAGE}`;
const ws = new WebSocket(DOMAIN);

// ws.onopen((d) => {
//   console.log(d, 'connected')
// })

// ws.onerror((e) => {
//   console.log('error')
//   console.log(e)
// })

// ws.onclose(()=>console.log('closed'))

const connectHandler = (event, context) => {
  console.log(event, ws);
  return {
    statusCode: 200
  }
};

const disconnectHandler = (event, context) => {
  console.log(event);
  return {
    statusCode: 200
  }
};

const getConnections = (event, context) => {
  console.log(event);
  return {
    statusCode: 200
  }
};
