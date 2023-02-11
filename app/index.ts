#! /usr/bin/env node

import * as path from 'path';

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';

import { Construct } from 'constructs';

const app = new cdk.App();
const env = { region: 'us-east-1' };

const name = `am-i-alone`;

class Persistence extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamo.Table(this, 'Table', {
      tableName: name,
      partitionKey: {
        type: dynamo.AttributeType.STRING,
        name: 'pk'
      },
      sortKey: {
        type: dynamo.AttributeType.STRING,
        name: 'sk'
      }
    });
  }
}

class Compute extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // Imports
    const table = dynamo.Table.fromTableName(this, `Table`, name);

    // API
    const api = new apigateway.CfnApi(this, name, {
      name: `${name}-api`,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    // Functions
    const environment = {
      TABLE_NAME: name
    }

    const basePath = path.join(__dirname, 'functions');

    const connectFunction = new nodeLambda.NodejsFunction(this, 'ConnectFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(basePath, 'connections.ts'),
      memorySize: 1024,
      handler: 'connect',
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment
    });
    table.grantReadWriteData(connectFunction)

    const disconnectFunction = new nodeLambda.NodejsFunction(this, 'DisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(basePath, 'connections.ts'),
      memorySize: 1024,
      handler: 'disconnect',
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment
    });
    table.grantReadWriteData(disconnectFunction)

    const getConnectionsFunction = new nodeLambda.NodejsFunction(this, 'GetConnectionsFunction', {
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: path.join(basePath, 'connections.ts'),
      memorySize: 1024,
      handler: 'getConnectionCount',
      bundling: {
        minify: true,
        externalModules: ['aws-sdk'],
      },
      environment
    });
    table.grantReadWriteData(getConnectionsFunction)

    // API Gateway Permissions
    const role = new iam.Role(this, `${name}-iam-role`, {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
    });

    role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [
        connectFunction.functionArn,
        disconnectFunction.functionArn,
        getConnectionsFunction.functionArn
      ],
      actions: ["lambda:InvokeFunction"]
    }));

    // API Routes
    const connectIntegration = new apigateway.CfnIntegration(this, "ApiIntegration-Connect", {
      apiId: api.ref,
      integrationType: "AWS_PROXY",
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectFunction.functionArn}/invocations`,
      credentialsArn: role.roleArn,
    });

    const disconnectIntegration = new apigateway.CfnIntegration(this, "ApiIntegration-Disconnect", {
      apiId: api.ref,
      integrationType: "AWS_PROXY",
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${disconnectFunction.functionArn}/invocations`,
      credentialsArn: role.roleArn
    })

    const getConnectionsIntegration = new apigateway.CfnIntegration(this, "ApiIntegration-GetConnections", {
      apiId: api.ref,
      integrationType: "AWS_PROXY",
      integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${getConnectionsFunction.functionArn}/invocations`,
      credentialsArn: role.roleArn
    })

    const connectRoute = new apigateway.CfnRoute(this, "ApiRoute-Connect", {
      apiId: api.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      target: `integrations/${connectIntegration.ref}`
    });

    const disconnectRoute = new apigateway.CfnRoute(this, "ApiRoute-Disconnect", {
      apiId: api.ref,
      routeKey: "$disconnect",
      authorizationType: "NONE",
      target: `integrations/${disconnectIntegration.ref}`
    });

    const getConnectionsRoute = new apigateway.CfnRoute(this, "ApiRoute-GetConnections", {
      apiId: api.ref,
      routeKey: "getConnections",
      authorizationType: "NONE",
      target: `integrations/${getConnectionsIntegration.ref}`
    });

    const deployment = new apigateway.CfnDeployment(this, `ApiDeployment`, {
      apiId: api.ref
    });

    const stageName = 'production'
    new apigateway.CfnStage(this, `ApiStage`, {
      apiId: api.ref,
      autoDeploy: true,
      deploymentId: deployment.ref,
      stageName
    });

    deployment.node.addDependency(connectRoute)
    deployment.node.addDependency(disconnectRoute)
    deployment.node.addDependency(getConnectionsRoute)

    // Lambda Permissions
    // arn:aws:execute-api:us-east-1:********8602:55f7qip0yf/production/POST/@connections/{connectionId}
    const managementArn = `arn:${this.partition}:execute-api:${this.region}:${this.account}:${api.ref}/${stageName}/POST/@connections/*`;
    const manageApiPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [managementArn],
      actions: ['execute-api:ManageConnections']
    })
    connectFunction.addToRolePolicy(manageApiPolicy)
    disconnectFunction.addToRolePolicy(manageApiPolicy)
    getConnectionsFunction.addToRolePolicy(manageApiPolicy)
  }
}

new Persistence(app, `${name}-persistence`, { env });
new Compute(app, `${name}-compute`, { env });