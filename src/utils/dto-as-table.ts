import { container } from "tsyringe";
import { emptyState } from "./chalks";
import Table from 'cli-table3';
import { Logger } from "winston";

export function dtoAsTable<T>(dtos: T[], head: string[], entityNamePlural: string, valueProcessorFunc?: Function): string {
    const logger: Logger = container.resolve("Logger");
    logger.debug("Entered dtoAsTable");

    if (!dtos || dtos.length === 0) {
        logger.debug("Returning empty state");
        return emptyState(`No ${entityNamePlural} match your request`);
    }

    const table = new Table({ head });
    dtos.forEach(dto => {
        const formatValue = (headTitle: string) => {
            const value = dto[headTitle];
            if (value === null || value === undefined) return 'N/A';
            switch (headTitle) {
                case "created":
                case "lastModified":
                    return new Date(value).toLocaleString();
                default:
                    return valueProcessorFunc != null ? valueProcessorFunc(headTitle, value) : value;
            }
        };
        const row = head.map(formatValue);
        table.push(row);
    });

    return table.toString();
}
