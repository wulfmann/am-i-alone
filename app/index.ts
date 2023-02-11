#! /usr/bin/env node

import * as path from 'path';

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
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

    // Monitoring
    new cloudwatch.Alarm(this, 'ConsumedReadCapacityAlarm', {
      metric: table.metricConsumedReadCapacityUnits(),
      threshold: 4,
      evaluationPeriods: 3,
    });

    new cloudwatch.Alarm(this, 'ConsumedWriteCapacityAlarm', {
      metric: table.metricConsumedWriteCapacityUnits(),
      threshold: 4,
      evaluationPeriods: 3,
    });

    new cloudwatch.Alarm(this, 'QueryThrottledAlarm', {
      metric: table.metricThrottledRequestsForOperation('Query'),
      threshold: 1,
      evaluationPeriods: 2,
    });

    new cloudwatch.Alarm(this, 'PutItemThrottledAlarm', {
      metric: table.metricThrottledRequestsForOperation('PutItem'),
      threshold: 1,
      evaluationPeriods: 2,
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

    const role = new iam.Role(this, `${name}-api-role`, {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
    });

    const managementArn = `arn:${this.partition}:execute-api:${this.region}:${this.account}:${api.ref}/${stageName}/POST/@connections/*`;
    const manageApiPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [managementArn],
      actions: ['execute-api:ManageConnections']
    })

    // Functions
    const environment = {
      TABLE_NAME: name
    }

    const basePath = path.join(__dirname, 'functions');

    const functions: {[key: string]: { handler: string, routeKey: string }} = {
      Connect: {
        handler: 'connect',
        routeKey: '$connect'
      },
      Disconnect: {
        handler: 'disconnect',
        routeKey: '$disconnect'
      },
      GetConnections: {
        handler: 'getConnectionCount',
        routeKey: 'getConnections'
      },
      Message: {
        handler: 'message',
        routeKey: 'message'
      }
    }

    const functionArns = [];
    for (const functionName in functions) {
      const fn = new nodeLambda.NodejsFunction(this, `${functionName}Function`, {
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: path.join(basePath, 'connections.ts'),
        memorySize: 1024,
        handler: functions[functionName].handler,
        bundling: {
          minify: true,
          externalModules: ['aws-sdk'],
        },
        environment
      });

      table.grantReadWriteData(fn);
      functionArns.push(fn.functionArn)

      fn.addToRolePolicy(manageApiPolicy)

      // Monitoring
      new cloudwatch.Alarm(this, `${functionName}FunctionErrorsAlarm`, {
        metric: fn.metricErrors(),
        threshold: 5,
        evaluationPeriods: 3,
      });

      const integration = new apigateway.CfnIntegration(this, `ApiIntegration-${functionName}`, {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${fn.functionArn}/invocations`,
        credentialsArn: role.roleArn,
      });

      const route = new apigateway.CfnRoute(this, `ApiRoute-${functionName}`, {
        apiId: api.ref,
        routeKey: functions[functionName].routeKey,
        authorizationType: "NONE",
        target: `integrations/${integration.ref}`
      });

      deployment.node.addDependency(route)
    }

    role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: functionArns,
      actions: ["lambda:InvokeFunction"]
    }));
  }
}

new Persistence(app, `${name}-persistence`, { env });
new Compute(app, `${name}-compute`, { env });