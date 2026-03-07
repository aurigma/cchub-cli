import chalk from "chalk";

export const emptyState = (text: string) => chalk.blue(`\n🤷 ${text}\n`);
export const msg = (text: string) => chalk.blue.bold(`\n${text}\n`);
export const error = (text: string) => chalk.red.bold(`\n❌ ${text}\n`);
export const warning = (text: string) => chalk.yellow.bold(`\n⚠ ${text}\n`);
export const success = (text: string) => chalk.green.bold(`\n✔ ${text}\n`);
export const info = (text: string) => chalk.blue(`\nℹ ${text}\n`);
