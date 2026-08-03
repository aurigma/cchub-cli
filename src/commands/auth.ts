import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import { AuthView } from "../views/auth";
import { TokenStore } from "../services/token-store";
import { CCHubConfiguration } from "../services/cchub-configuration";
import { AuthorizationCodeAuth } from "../services/authorization-code-auth";

@injectable()
export class AuthCommands {
    constructor(
        @inject(TokenStore) private readonly tokenStore: TokenStore,
        @inject(AuthorizationCodeAuth) private readonly authorizationCodeAuth: AuthorizationCodeAuth,
        @inject(AuthView) private readonly authView: AuthView,
        @inject(CCHubConfiguration) private readonly config: CCHubConfiguration,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.tokenStore = tokenStore;
        this.authorizationCodeAuth = authorizationCodeAuth;
        this.authView = authView;
        this.config = config;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("auth")
            .description("Allows to inspect and manage authentication session");

        command
            .command("login")
            .description("Starts interactive Authorization Code login with PKCE")
            .action(() => this.handleLogin());

        command
            .command("status")
            .description("Shows the persisted authentication session status")
            .action(() => this.handleStatus());

        command
            .command("logout")
            .description("Clears the persisted authentication session")
            .action(() => this.handleLogout());

        return command;
    }

    private async handleLogin() {
        let pendingLogin: Awaited<ReturnType<AuthorizationCodeAuth["prepareLogin"]>> | null = null;

        try {
            this.logger.debug("Entered AuthCommands.handleLogin.");
            pendingLogin = await this.authorizationCodeAuth.prepareLogin();
            const browserOpened = await pendingLogin.openBrowser();

            this.authView.renderLoginStart(pendingLogin.authorizationUrl, browserOpened);
            const session = await pendingLogin.complete();
            await this.tokenStore.save(session);
            this.authView.renderLoginSuccess(this.tokenStore.getAuthFilePath());
        } catch (error) {
            if (pendingLogin != null) {
                await pendingLogin.cancel();
            }
            this.logger.error("Failed to complete interactive authentication: %s", error);
            const message = error instanceof Error ? error.message : "Failed to complete interactive authentication.";
            this.authView.renderLoginError(message);
            process.exitCode = 1;
        }
    }

    private async handleStatus() {
        try {
            this.logger.debug("Entered AuthCommands.handleStatus.");
            const session = await this.tokenStore.load();

            this.authView.renderStatus(
                session,
                this.tokenStore.getAuthFilePath(),
                this.config.tokenRefreshTimeBeforeExpirationSec
            );
        } catch (error) {
            this.logger.error("Failed to get authentication status: %s", error);
            this.authView.renderError("Failed to get authentication status.");
            process.exitCode = 1;
        }
    }

    private async handleLogout() {
        try {
            this.logger.debug("Entered AuthCommands.handleLogout.");
            const authFilePath = this.tokenStore.getAuthFilePath();

            await this.tokenStore.clear();
            this.authView.renderLogout(authFilePath);
        } catch (error) {
            this.logger.error("Failed to clear authentication session: %s", error);
            this.authView.renderError("Failed to clear authentication session.");
            process.exitCode = 1;
        }
    }
}
