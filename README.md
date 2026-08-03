# Customer's Canvas Hub CLI Application

This is a simple command-line interface (CLI) application built with Node.js and TypeScript to work with Customer's Canvas Hub API. It demonstrates how to construct Customer's Canvas designs programmatically (through Design Atoms SDK) and submit it to the Customer's Canvas backend.

## Installation

To install the project, clone the repository and run the following command:

```bash
npm install
```

## Configuration

Create a `.env` file. There are two supported authentication modes, and you can configure either one or both.

Common settings:

```sh
CCHUB_BASEURL=https://customerscanvashub.com
CCHUB_TENANTID=xxx  # Tenant ID from the Settings > Tenant
CCHUB_TOKENREFRESTIMEBEFOREEXPIRATIONSEC=60
APP_LOGLEVEL=info
```

### Option 1. Client Credentials

Use this mode for non-interactive CLI usage when the app can authenticate directly with `client_id` and `client_secret`.

```sh
CCHUB_CLIENT_CREDENTIALS_CLIENTID=xxxxxxxxxx
CCHUB_CLIENT_CREDENTIALS_CLIENTSECRET=xxxxxxxxxxx
```

### Option 2. Interactive Authorization Code Login

Use this mode when you want to sign in through the browser and let the CLI keep a local session.

```sh
CCHUB_AUTHORIZATION_CODE_CLIENTID=xxxxxxxxxx
CCHUB_AUTHORIZATION_CODE_SCOPE=Assets_full Private_assets_update Projects_full Storefronts_read Templates_full StorefrontUsers_full Tenants_read TenantUsers_read Artifacts_full RenderingJobs_full
CCHUB_AUTHORIZATION_CODE_CALLBACK_HOST=127.0.0.1
CCHUB_AUTHORIZATION_CODE_CALLBACK_PORT=53682
CCHUB_AUTHORIZATION_CODE_CALLBACK_PATH=/oauth/callback
```

Notes:

- `CCHUB_AUTHORIZATION_CODE_SCOPE` should contain only resource scopes required by Customer's Canvas Hub.
- The CLI automatically adds `openid profile email offline_access` to the interactive login request.
- See supported scope through the discovery endpoint <https://customerscanvashub.com/.well-known/openid-configuration> (see `scopes_supported`).
- If your identity provider requires an exact redirect URI, use a fixed callback port and register a URI like `http://127.0.0.1:53682/oauth/callback`.
- If `CCHUB_AUTHORIZATION_CODE_CALLBACK_PORT` is omitted, the CLI uses a random free port.

### If Both Modes Are Configured

The CLI uses authentication in this order:

- If a persisted interactive session exists and is still valid, it is used.
- If the interactive session exists but the access token is expired, the CLI tries to refresh it.
- If there is no usable interactive session, the CLI falls back to Client Credentials if they are configured.

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
