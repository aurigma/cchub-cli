# Customer's Canvas Hub CLI Application

This is a simple command-line interface (CLI) application built with Node.js and TypeScript to work with Customer's Canvas Hub API. It demonstrates how to construct Customer's Canvas designs programmatically (through Design Atoms SDK) and submit it to the Customer's Canvas backend.

## Installation

To install the project, clone the repository and run the following command:

```bash
npm install
```

## Configuration

You need to create the .env file:

```sh
CCHUB_BASEURL=https://customerscanvashub.com
CCHUB_AUTHORIZATION_CODE_CLIENTID=xxxxxxxxxx # Client ID for interactive Authorization Code flow
CCHUB_AUTHORIZATION_CODE_SCOPE=Assets_read Private_assets_update # Resource scopes for interactive login; openid profile offline_access are added automatically
CCHUB_AUTHORIZATION_CODE_CALLBACK_HOST=127.0.0.1 # Optional, loopback host for interactive login
CCHUB_AUTHORIZATION_CODE_CALLBACK_PORT=53682 # Optional, fixed loopback port; omit to use a random free port
CCHUB_AUTHORIZATION_CODE_CALLBACK_PATH=/oauth/callback # Optional, loopback callback path for interactive login
CCHUB_CLIENT_CREDENTIALS_CLIENTID=xxxxxxxxxx # Client ID from the Settings > External Apps
CCHUB_CLIENT_CREDENTIALS_CLIENTSECRET=xxxxxxxxxxx # Client Secret from the Settings > External Apps
CCHUB_TENANTID=xxx  # Tenant ID from the Settings > Tenant
CCHUB_TOKENREFRESTIMEBEFOREEXPIRATIONSEC=60
APP_LOGLEVEL=info
```

## Usage

To run the CLI application, use the following command:

```bash
npm start -- <command> <subcommand> <args>
```

By running `npm starts` without arguments, you will get a list of all suported commands.

### Help

Get help by:

```bash
npm start -- help
```

or

```bash
npm start -- help <command>
```

or (for options of specific subcommands):

```bash
npm start -- help <command> <subcommand> --help
```

For interactive browser-based login:

```bash
npm start -- auth login
```

If your identity provider requires an exact redirect URI, set a fixed callback port and register a URI like `http://127.0.0.1:53682/oauth/callback`.

To inspect or clear the persisted session:

```bash
npm start -- auth status
npm start -- auth logout
```

## Development

To build the project, run:

```bash
npm run build
```

This command produces a single distributable CLI file:

```text
dist/cchub-cli.js
```

## Debug in VS Code

Open **package.json** and modify the **debug** script to specify which command you would like to test:

```json
{
    ...
  "scripts": {
    ...
    "debug": "npm run dev --  projects create through-pipeline -s 1306 -d 0d4e1cf0-7755-4350-a46e-aa3d11b446f1 -o test -p 301",
    ...
  },
}
```

Then just add a breakpoint, hit F5. Choose **cchub-cli: Launch** configuration.

## Distribution

For distribution, you can ship only:

- `dist/cchub-cli.js`

No `node_modules` folder is required for runtime, because dependencies are bundled into this file.

Runtime requirements:

- Node.js 18+.
- Environment variables from `.env` (or system environment variables), as described in the Configuration section.
