# Am I Alone?

>Loneliness is the child of plurality
>
> \- *Jacob "Julius Wellhausen" Snell*

## Development

This project is composed of a frontend and a backend. The front end is a single HTML file with minimal styles / scripts. It can be found in `site/index.html`. The backend is an AWS websocket api gateway with three lambdas. The handler code can be found in `app/functions/connections.ts`. The infrastructure is deployed via CDK and the stack can be found in `app/index.ts`.

### Install Dependencies

```
npm install
```

### Run Locally

To run the frontend:

```
npm run site
```

To deploy the backend:

```
npm run deploy
```
