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
    
    // const connectionAuthorizerHandler = new lambda.Function(this, 'ConnectionAuthorizerFunction', {
    //   code: lambda.Code.fromAsset('../handlers/connection-authorizer'),
    //   handler: 'handler',
    //   runtime: lambda.Runtime.NODEJS_12_X,
    //   environment: {
    //     TABLE_NAME: table.tableName
    //   }
    // });

    const handlerDir = 'handlers';
    
    const connectionHandlerCode = lambda.Code.fromAsset(`${handlerDir}/connection`);
    
    const connectFn = new lambda.Function(this, 'ConnectFunction', {
      code: connectionHandlerCode,
      handler: 'index.connectHandler',
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: table.tableName,
        API_ID: socketApi.ref,
        STAGE: stage
      }
    });
    
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
      handler: 'index.disconnectHandler',
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        TABLE_NAME: table.tableName,
        API_ID: socketApi.ref,
        STAGE: stage
      }
    });
    
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

    // Stage
    new ag2.CfnStage(this, 'SocketStage', {
      stageName: stage,
      apiId: socketApi.ref,
      autoDeploy: true
    });
  }
}