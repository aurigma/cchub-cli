import { AddressInfo } from "node:net";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { injectable } from "tsyringe";

export interface OAuthLoopbackSession {
    redirectUri: string;
    waitForCode(): Promise<string>;
    close(): Promise<void>;
}

@injectable()
export class OAuthLoopbackServer {
    public async createSession(
        host: string,
        port: number | null,
        callbackPath: string,
        expectedState: string,
        timeoutMs = 180000
    ): Promise<OAuthLoopbackSession> {
        const normalizedCallbackPath = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
        const server = createServer();
        let resolved = false;
        let timeoutHandle: NodeJS.Timeout | null = null;

        const waitForCode = new Promise<string>((resolve, reject) => {
            server.on("request", (request: IncomingMessage, response: ServerResponse) => {
                const requestUrl = new URL(request.url ?? "/", `http://${host}`);

                if (requestUrl.pathname !== normalizedCallbackPath) {
                    response.statusCode = 404;
                    response.end("Not found.");
                    return;
                }

                const error = requestUrl.searchParams.get("error");
                if (error != null) {
                    this.respond(response, 400, "Authentication failed. You can return to the terminal.");
                    resolved = true;
                    reject(new Error(`Authorization server returned error: ${error}`));
                    return;
                }

                const state = requestUrl.searchParams.get("state");
                if (state !== expectedState) {
                    this.respond(response, 400, "State mismatch. You can return to the terminal.");
                    resolved = true;
                    reject(new Error("Authorization state mismatch."));
                    return;
                }

                const code = requestUrl.searchParams.get("code");
                if (code == null || code.trim().length === 0) {
                    this.respond(response, 400, "Authorization code is missing. You can return to the terminal.");
                    resolved = true;
                    reject(new Error("Authorization code is missing in the callback request."));
                    return;
                }

                this.respond(response, 200, "Authentication completed successfully. You can return to the terminal.");
                resolved = true;
                resolve(code);
            });

            server.on("error", (error) => {
                if (!resolved) {
                    reject(error);
                }
            });

            timeoutHandle = setTimeout(() => {
                if (!resolved) {
                    reject(new Error("Timed out while waiting for the authorization callback."));
                }
            }, timeoutMs);
        });

        await new Promise<void>((resolve, reject) => {
            server.listen(port ?? 0, () => {
                resolve();
            });
            server.once("error", reject);
        });

        const address = server.address() as AddressInfo | null;
        if (address == null) {
            await this.closeServer(server);
            throw new Error("Failed to determine loopback server address.");
        }

        const redirectUri = `http://${host}:${address.port}${normalizedCallbackPath}`;

        return {
            redirectUri,
            waitForCode: async () => {
                try {
                    return await waitForCode;
                } finally {
                    if (timeoutHandle != null) {
                        clearTimeout(timeoutHandle);
                    }
                    await this.closeServer(server);
                }
            },
            close: async () => {
                if (timeoutHandle != null) {
                    clearTimeout(timeoutHandle);
                }
                await this.closeServer(server);
            }
        };
    }

    private async closeServer(server: Server): Promise<void> {
        if (!server.listening) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error != null) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    private respond(response: ServerResponse, statusCode: number, message: string): void {
        response.statusCode = statusCode;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(message);
    }
}
