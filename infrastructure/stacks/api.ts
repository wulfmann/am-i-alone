import * as cdk from '@aws-cdk/core';
import * as ag from '@aws-cdk/aws-apigateway';
import * as ag2 from '@aws-cdk/aws-apigatewayv2';
import * as lambda from '@aws-cdk/aws-lmabda';

export class ConnectionApi extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const appName = 'am-i-alone';
    
    // Socket API
    const socketApi = new ag2.HttpApi(this, 'SocketApi', {
      apiName: `${appName}-socket-api`
    });
    
    const connectionHandlerCode = lambda.Code.fromAsset('../handlers/connection');
    
    const connectFn = new lambda.Function(this, 'ConnectFunction', {
      code: connectionHandlerCode,
      handler: 'connectHandler'
    });
    
    const connectIntegration = new ag2.LambdaProxyIntegration({
      handler: connectFn,
    });
    
    socketApi.addRoutes({
      path: '$connect',
      integration: connectIntegration
    });
    
    const disconnectFn = new lambda.Function(this, 'ConnectFunction', {
      code: connectionHandlerCode,
      handler: 'disconnectHandler'
    });
    
    const disconnectIntegration = new ag2.LambdaProxyIntegration({
      handler: disconnectFn,
    });
    
    socketApi.addRoutes({
      path: '$disconnect',
      integration: disconnectIntegration
    });
    
    new ag2.HttpStage(stack, 'SocketApiStage', {
      httpApi: socketApi,
      stageName: 'prod',
    });
    
    // Core API
    const api = new ag.RestApi(this, 'Api', {
      restApiName: `${appName}-api`
    });
  }
}