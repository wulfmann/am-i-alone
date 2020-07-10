import WebSocket from 'ws';

const DOMAIN = '';
const ws = new WebSocket(DOMAIN);

const connectHandler = (event, context) => {
  const count = 2;
  ws.send({
    type: 'count:update',
    data: count
  });
};

const disconnectHandler = (event, context) => {
  const count = 2;
  ws.send({
    type: 'count:update',
    data: count
  });
};

const getConnections = (event, context) => {

};
