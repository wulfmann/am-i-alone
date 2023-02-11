const AWS = require('aws-sdk');

const CONNECTION = 'connection';
let mgmt = null;
let ddb = null;

function setup(event) {
    if (mgmt === null) {
        mgmt = new AWS.ApiGatewayManagementApi({
            apiVersion: '2018-11-29',
            endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
        });
    }

    if (ddb === null) {
        ddb = new AWS.DynamoDB.DocumentClient({
            apiVersion: '2012-08-10',
            region: process.env.AWS_REGION
        });
    }
}

const getKey = (connectionId) => {
    return {
        pk: CONNECTION,
        sk: `${CONNECTION}#${connectionId}`
    }
}

async function putConnection(connectionId) {
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: getKey(connectionId)
    };

    return ddb.put(params).promise();
}

async function deleteConnection(connectionId) {
    return ddb.delete({
        TableName: process.env.TABLE_NAME,
        Key: getKey(connectionId)
    }).promise();
}

async function getConnections(excludeList=[]): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
        try {
            const rawConnections = await ddb.query({
                TableName: process.env.TABLE_NAME,
                ExpressionAttributeNames: {
                    '#pk': 'pk',
                    '#sk': 'sk'
                },
                ExpressionAttributeValues: {
                    ':connection': CONNECTION,
                    ':connection_prefix': `${CONNECTION}#`,
                },
                KeyConditionExpression: '#pk = :connection AND begins_with(#sk, :connection_prefix)',
            }).promise();
        
            resolve(
                rawConnections.Items
                    .map(item => item.sk.split('#')[1])
                    .filter(item => !excludeList.includes(item))
            )
        } catch (e) {
            reject(e)
        }
    })
}

async function sendMessage(connectionId, message): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        const withConnectionId = JSON.stringify(Object.assign({ connectionId }, message))
        try {
            console.log(`sending message to: ${connectionId}, ${withConnectionId}`)
            await mgmt.postToConnection({
                ConnectionId: connectionId,
                Data: withConnectionId
            }).promise();
            resolve()
        } catch (e) {
            if (e.statusCode === 410) {
                console.log(`Found stale connection, removing connection: ${connectionId}`);
                await deleteConnection(connectionId)
                resolve()
            } else {
                console.log(`error occurred while sending message to connection ${connectionId}: ${e}`)
                reject()
            }
        }
    })
}

async function sendMessageToConnections(connections, message) {
    console.log(`broadcasting message to ${connections.length} connection(s).`)
    return Promise.all(connections.map(async (connectionId) => {
        return sendMessage(connectionId, message)
    }))
}

function createMessage(connectionCount) {
    return { type: "connection", body: { connectionCount }}
}

export async function connect(event) {
    try {
        const connectionId = event.requestContext.connectionId;
        console.log(`received new connection: ${connectionId}`)

        setup(event)

        // persist new connection
        await putConnection(connectionId);

        // get all other connections
        const connections = await getConnections();
        console.log(`Found connections: ${connections}`)

        // send connection update to all connections
        const message = createMessage(connections.length)

        await sendMessageToConnections(connections.filter(c=>c!=connectionId), message)
        return { statusCode: 200, body: 'success' };
    } catch (e) {
        console.log(e)
        return { statusCode: 500, body: e.stack };
    }
};

export async function disconnect(event) {
    try {
        const connectionId = event.requestContext.connectionId;
        console.log(`received discconect for connection: ${connectionId}`)

        setup(event)

        // persist new connection
        await deleteConnection(event.requestContext.connectionId);

        // get all other connections
        const connections = await getConnections();
        console.log(`Found connections: ${connections}`)

        // send connection update to all connections
        const message = createMessage(connections.length)
        await sendMessageToConnections(connections, message)
        return { statusCode: 200, body: 'success' };
    } catch (e) {
        console.log(e)
        return { statusCode: 500, body: e.stack };
    }
};

export async function getConnectionCount(event) {
    try {
        const connectionId = event.requestContext.connectionId;
        console.log(`fetching all connections...`)

        setup(event)

        // get all connections including this one
        const connections = await getConnections();
        console.log(`Found connections: ${connections}`)

        // send connection update to all connections
        const message = createMessage(connections.length)
        await sendMessage(connectionId, message);

        return { statusCode: 200, body: 'success' };
    } catch (e) {
        console.log(e)
        return { statusCode: 500, body: e.stack };
    }
};

export async function message(event) {
    try {
        console.log(event)
        const connectionId = event.requestContext.connectionId;
        console.log(`fetching all connections...`)

        setup(event)

        // get all connections excluding this one
        const connections = await getConnections([connectionId]);
        console.log(`Found connections: ${connections}`)

        // send connection update to all connections
        const message = Object.assign({ from: connectionId }, { ...JSON.parse(event.body) })
        await sendMessageToConnections(connections, message)

        return { statusCode: 200, body: 'success' };
    } catch (e) {
        console.log(e)
        return { statusCode: 500, body: e.stack };
    }
};