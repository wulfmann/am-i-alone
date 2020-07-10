const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

exports.connect = async event => {
  const encodedPathname = '';
  const pageId = `page#${encodedPathname}`;
  const connectionId = `connection#${event.requestContext.connectionId}`;

  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: pageId,
      sk: connectionId
    }
  };

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
  const encodedPathname = '';
  const pageId = `page#${encodedPathname}`;
  const connectionId = `connection#${event.requestContext.connectionId}`;
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: pageId,
      sk: connectionId
    }
  };

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

