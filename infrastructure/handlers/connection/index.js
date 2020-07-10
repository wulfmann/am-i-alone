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

