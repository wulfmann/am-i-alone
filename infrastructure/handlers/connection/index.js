const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

function getItemParame(pathName, connectionId) {
  const encodedPathname = '';

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `page#${encodedPathname}`,
      sk: `connection#${connectionId}`
    }
  };
  
  return params;
}

exports.connect = async event => {
  const params = getItemParame('', event.requestContext.connectionId);

  try {
    await ddb.put(params).promise();
  } catch (err) {
    return {
     statusCode: 500,
     body: 'Failed to connect: ' + JSON.stringify(err);
    };
  }

  return {
    statusCode: 200,
    body: 'Connected.'
  };
};

exports.disconnect = async event => {
  const params = getItemParame('', event.requestContext.connectionId);

  try {
    await ddb.delete(params).promise();
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Failed to disconnect: ' + JSON.stringify(err);
    };
  }

  return {
    statusCode: 200,
    body: 'Disconnected.'
  };
};

exports.wave = async event => {
  let connectionData;
  
  try {
    connectionData = await ddb.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });
  
  const postData = JSON.parse(event.body).data;
  
  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }
  });
  
  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
