import { App } from '@aws-cdk/core';
import { ConnectionApi } from './stacks/api';

const app = new App();

new ConnectionApi(app, 'am-i-alone-connection-api');