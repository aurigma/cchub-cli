import os from "node:os";
import path from "node:path";

export function getAppDataDir(appName: string): string {
    const homeDir = os.homedir();

    switch (process.platform) {
        case "win32":
            return path.join(
                process.env["APPDATA"] ?? path.join(homeDir, "AppData", "Roaming"),
                appName
            );
        case "darwin":
            return path.join(homeDir, "Library", "Application Support", appName);
        default:
            return path.join(
                process.env["XDG_CONFIG_HOME"] ?? path.join(homeDir, ".config"),
                appName
            );
    }
}
