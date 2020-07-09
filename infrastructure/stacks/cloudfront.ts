import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';

export class CloudfrontStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const appName = 'am-i-alone';
    
  }
}