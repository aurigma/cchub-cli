# Hello World CLI Application

This is a simple command-line interface (CLI) application built with Node.js and TypeScript to work with Customer's Canvas Hub API.
It demonstrates how to construct Customer's Canvas designs programmatically (through Design Atoms SDK) and submit it to the
Customer's Canvas backend.

## Installation

To install the project, clone the repository and run the following command:

```bash
npm install
```

## Configuration

You need to create the .env file:

```sh
CCHUB_BASEURL=https://customerscanvashub.com
CCHUB_CLIENTID=xxxxxxxxxx # Client ID from the Settings > External Apps
CCHUB_CLIENTSECRET=xxxxxxxxxxx # Client Secret from the Settings > External Apps
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

## Development

To build the project, run:

```bash
npm run build
```

This command produces a single distributable CLI file:

```text
dist/cchub-cli.js
```

## Distribution

For distribution, you can ship only:

- `dist/cchub-cli.js`

No `node_modules` folder is required for runtime, because dependencies are bundled into this file.

Runtime requirements:

- Node.js 18+.
- Environment variables from `.env` (or system environment variables), as described in the Configuration section.

To run tests, use:

```bash
npm test
```

## License

This project is licensed under the MIT License.
