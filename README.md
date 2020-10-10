## Playground Project

Install: `yarn`
Run: `yarn start`

## Editor Setup

Use vscode with eslint plugin.

## Tests

You need to have docker installed, if you have docker and access to the docker socket from your user you can run:

`yarn test`

It will bootstrap a `PostgreSQL` via `testcontainers` and will perform some `migrations` and `queries`
