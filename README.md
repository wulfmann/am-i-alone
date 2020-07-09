# Am I Alone?

This project is heavily inspired by [turven](https://turven.xyz).

> Ever wondered if you're the only person in the whole world reading a web page?

> Chances are, in a wonderful moment of serendipity, there may be another soul, somewhere on this planet, also reading the same page as you are, at the very same moment.

> [Maxime Vaillancourt](https://maximevaillancourt.com)

## Quickstart

## Overview

This project is broken up into three parts:

* [Package](#package)
* [Infrastructure](#infrastructure)
* [Site](#site)

### <a id="package"></a> Package

The [package directory](https://github.com/wulfmann/am-i-alone/blob/master/package) contains the source code for the [NPM package]() that clients use to connect to the am-i-alone API.

### <a id="infrastructure"></a> Infrastructure

The [infrastructure directory](https://github.com/wulfmann/am-i-alone/blob/master/infrastructure) contains the source code for the AWS infrastructure of the backend. It is a [CDK App](https://aws.amazon.com/cdk/) that deploys into an AWS account. You can read more in [it's readme](https://github.com/wulfmann/am-i-alone/blob/master/infrastructure/README.md).

### <a id="site"></a> Site

The [site directory](https://github.com/wulfmann/am-i-alone/blob/master/site) contains the source code for the [demo site](https://amialone.snell.im). You can reference this to see a working example to implement on your own site.