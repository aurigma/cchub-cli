import { container } from "tsyringe";
import { emptyState } from "./chalks";
import Table from 'cli-table3';
import { Logger } from "winston";

export function dtoAsTable<T extends object>(dtos: T[], head: Array<keyof T>, entityNamePlural: string, valueProcessorFunc?: Function): string {
    const logger: Logger = container.resolve("Logger");
    logger.debug("Entered dtoAsTable");

    if (!dtos || dtos.length === 0) {
        logger.debug("Returning empty state");
        return emptyState(`No ${entityNamePlural} match your request`);
    }

    const table = new Table({ head: head.map(String) });
    dtos.forEach(dto => {
        const formatValue = (headTitle: keyof T) => {
            const value = dto[headTitle];
            if (value == null) return 'N/A';
            switch (headTitle) {
                case "created":
                case "lastModified":
                    return new Date(value.toString()).toLocaleString();
                default:
                    return valueProcessorFunc != null ? valueProcessorFunc(headTitle, value) : value;
            }
        };
        const row = head.map(formatValue);
        table.push(row);
    });

    return table.toString();
}
