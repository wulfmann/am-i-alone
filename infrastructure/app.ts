import { App } from '@aws-cdk/core';
import { ConnectionApi } from './stacks/api';
import { CloudfrontStack } from './stacks/cloudfront';

const app = new App();

new ConnectionApi(app, 'am-i-alone-connection-api');

new CloudfrontStack(app, 'am-i-alone-cloudfront');
