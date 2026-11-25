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

### List output formats

All `list` commands accept `--format table|json|yaml|csv`. The default is `table`. JSON and YAML each write a single list to stdout, including `[]` for an empty result. CSV uses field names as column headers and writes a header row even when there are no results. Product associations have separate `workflow.id`, `workflow.name`, `pipeline.id`, and `pipeline.name` columns. Within a CSV cell, array elements and object entries (`key=value`) are separated by commas. Missing or null values produce empty cells. Diagnostics and errors go to stderr.

```sh
npm start -- products list --tag seasonal --format json
npm start -- products list --tag seasonal --format yaml
npm start -- products list --tag seasonal --format csv
```

`projects search` supports the same formats.

```sh
npm start --silent -- projects search --storefrontId 42 --format csv
```

### Product list

```sh
npm start -- products list
npm start -- products list --tag apparel --tag seasonal --custom-field public=true --custom-field "collection=Winter 2026"
```

Lists matching products with their ID, name, Personalization Workflow, Pipeline, Tags, and Custom Fields. Each linked workflow or pipeline is shown as its name and ID when available. Tags and custom field pairs (`key=value`) are comma-separated. Missing values appear as `N/A`.

Repeat `--tag` for each required tag and `--custom-field key=value` for each custom field filter. Both options can be used together. Custom field values are strings, and each key can be specified once. Omitting both filters lists all products.

### Product details

```sh
npm start -- products get --product-id 301
npm start -- products get -p 301 --product-version-id 302
```

Calls `ProductsApiClient.getProduct` with the required positive product ID and an optional version ID, using the existing token authentication without a tenant parameter. Displays a field/value table containing `id`, `productVersionId`, `name`, `description`, `created`, `lastModified`, `storefrontId`, `storefrontProductId`, and `storefrontProductName`. Dates retain the API format and timezone; missing fields appear as `N/A`, and long descriptions wrap across lines.

### Product variants

```sh
npm start -- products variants list --product-id 301
npm start -- products variants list -p 301 --product-version-id 302 --skip 25 --take 25
```

The product ID is a required positive integer option: `-p, --product-id`. Calls `ProductsApiClient.getProductVariants` using the existing Storefront API client builder and token authentication; no tenant ID is passed. Optional `--product-version-id` selects a product version. Pagination defaults to `--skip 0 --take 25`.

The result is a table with `productVariantId`, `productUid`, and `options` columns. The identifiers are mapped from the variant DTO's `id` and `uid` respectively. Here `productUid` is the variant UID, not the parent product's UID. The `options` column joins option value titles with ` / ` (for example, `Large / Circle`), without option names. Options are ordered by ascending option ID consistently across rows; options without IDs follow in title order. Missing or blank values appear as `N/A` to preserve their positions. An empty result uses the standard CLI empty-list message.

Additional columns show `SKU`, `Price`, `Weight`, and `Available` (`Yes` / `No`). Missing data is displayed as `N/A`; zero prices and weights are preserved. The installed Storefront SDK does not declare `weight`, so that column shows a value only if the server includes a finite numeric `weight` field. No currency or weight unit is assumed.

### Price calculation

```sh
npm start -- products price calculate --base-price 12.50 --quantity 100 --sku BUSINESS-CARD --param paper=coated --param sides=2
npm start -- products price calculate --base-price 0 --product-id 301 --product-version-id 302 --product-variant-id 303 --json
```

Calls `CostCalculationApiClient.calculateLineItemCost` from `@aurigma/axios-price-calculator-api-client` using the existing Hub URL and authentication configuration through the shared API client builder, just like Asset Storage. The tenant is determined by the authorization token; no tenant ID is passed to the API. No new environment variables are needed.

The installed SDK 1.17.5 requires the request body, but marks every field of `LineItemCostCalculationModel` as optional. The CLI defaults quantity to one and resolves the base price explicitly or from a product variant.

When `--product-id` and `--product-variant-id` are supplied, omitted base price and SKU are loaded with `ProductsApiClient.getProductVariant` (respecting `--product-version-id`). Explicit values take precedence, including `--base-price 0`. The variant is fetched only once, and only when price or SKU needs a fallback. A missing SKU on the variant remains omitted.

When `--product-id` is supplied without `--product-version-id`, the command first calls `ProductsApiClient.getProduct` and uses its `productVersionId` for both variant lookup and price calculation. An explicit version skips this lookup. If product details contain no valid version ID, the command fails with exit code 1 and asks for `--product-version-id`.

```sh
npm start -- products price calculate --product-id 7863 --product-version-id 98216 --product-variant-id 2797766 --quantity 100 --param width=900 --param height=100
```

Without `--base-price`, both product and variant IDs are required (usage error, exit code 2). If the variant has no valid non-negative price, calculation stops with an explicit message requesting `--base-price` (operation error, exit code 1). A zero variant price is valid.

| Option | CLI requirement | API field |
| --- | --- | --- |
| `--base-price <number>` | Optional with product and variant IDs; otherwise required. Finite non-negative decimal (zero allowed) | `basePrice` |
| `-q, --quantity <number>` | Optional, positive integer; default `1` | `quantity` |
| `--sku <string>` | Optional, non-empty; falls back to variant SKU when product and variant IDs are supplied | `sku` |
| `--param <key=value>` | Optional, repeatable; unique non-empty keys | `customParameters` |
| `--product-id <number>` | Optional, positive integer | `productSpecifier.productId` |
| `--product-version-id <number>` | Optional, positive integer | `productSpecifier.productVersionId` |
| `--product-variant-id <number>` | Optional, positive integer | `productSpecifier.productVariantId` |
| `--json` | Optional; default output is tables | Full response JSON |

Custom parameter values remain strings, including numbers such as `sides=2`. Quote the whole pair if it contains spaces: `--param "paper=coated stock"`. Empty values and additional equals signs in values are supported. Required SKU, custom parameters, and product context depend on the configured pricing rules; the CLI does not invent requirements absent from the SDK. Product specifier fields are sent only when supplied, and the server validates their combination.

Output includes unit price and discount, quantity, total price, total discount, final `totalCost`, and applied price/discount rules. The response has no currency field, so the CLI does not add a currency symbol or round the returned numbers. `--json` selects JSON for result output; existing startup/authentication diagnostics may still appear, as with other commands.

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
