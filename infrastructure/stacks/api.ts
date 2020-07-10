import * as cdk from '@aws-cdk/core';
// import * as ag from '@aws-cdk/aws-apigateway';
import * as ag2 from '@aws-cdk/aws-apigatewayv2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamo from '@aws-cdk/aws-dynamodb';
// import * as iam from '@aws-cdk/aws-iam';

export class ConnectionApi extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appName = 'am-i-alone';
    
    // Database
    const table = new dynamo.Table(this, 'Table', {
      tableName: appName,
      partitionKey: {
        type: dynamo.AttributeType.STRING,
        name: 'pk'
      },
      sortKey: {
        type: dynamo.AttributeType.STRING,
        name: 'sk'
      }
    });
    
    // Socket API
    const socketApi = new ag2.CfnApi(this, 'SocketApi', {
      name: `${appName}-socket-api`,
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action'
    });

    const stage = 'prod';

    const handlerDir = 'handlers';
    
    const connectionHandlerCode = lambda.Code.fromAsset(`${handlerDir}/connection`);
    
    const connectFn = new lambda.Function(this, 'ConnectFunction', {
      code: connectionHandlerCode,
      handler: 'index.connect',
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });
    table.grantReadWrite(connectFn);
    
    const connectIntegration = new ag2.CfnIntegration(this, 'ConnectIntegration', {
      apiId: socketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectFn.functionArn}/invocations`,
      credentialsArn: socketApi.credentialsArn
    });

    new ag2.CfnRoute(this, 'ConnectRoute', {
      routeKey: '$connect',
      apiId: socketApi.ref,
      target: `integrations/${connectIntegration.ref}`
    });

    const disconnectFn = new lambda.Function(this, 'DisconnectFunction', {
      code: connectionHandlerCode,
      handler: 'index.disconnect',
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });
    table.grantReadWrite(disconnectFn);
    
    const disconnectIntegration = new ag2.CfnIntegration(this, 'DisconnectIntegration', {
      apiId: socketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${disconnectFn.functionArn}/invocations`,
      credentialsArn: socketApi.credentialsArn
    });

    new ag2.CfnRoute(this, 'DisconnectRoute', {
      routeKey: '$disconnect',
      apiId: socketApi.ref,
      target: `integrations/${disconnectIntegration.ref}`
    });
    
    // Wave
    const waveFn = new lambda.Function(this, 'WaveFunction', {
      code: connectionHandlerCode,
      handler: 'index.wave',
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: table.tableName
      }
    });
    table.grantReadWrite(waveFn);
    
    const waveIntegration = new ag2.CfnIntegration(this, 'WaveIntegration', {
      apiId: socketApi.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${waveFn.functionArn}/invocations`,
      credentialsArn: socketApi.credentialsArn
    });

    new ag2.CfnRoute(this, 'DisconnectRoute', {
      routeKey: 'wave',
      apiId: socketApi.ref,
      target: `integrations/${waveIntegration.ref}`
    });

    // Stage
    new ag2.CfnStage(this, 'SocketStage', {
      stageName: stage,
      apiId: socketApi.ref,
      autoDeploy: true
    });
  }
}