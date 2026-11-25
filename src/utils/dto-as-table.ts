import { container } from "tsyringe";
import { emptyState } from "./chalks";
import Table from 'cli-table3';
import { Logger } from "winston";

export type TableColumn<T> = keyof T | {
    header: string;
    value: (row: T) => Table.Cell;
};

export function dtoAsTable<T extends object>(
    dtos: readonly T[],
    columns: readonly TableColumn<T>[],
    entityNamePlural: string
): string {
    const logger: Logger = container.resolve("Logger");
    logger.debug("Entered dtoAsTable");

    if (!dtos || dtos.length === 0) {
        logger.debug("Returning empty state");
        return emptyState(`No ${entityNamePlural} match your request`);
    }

    const table = new Table({
        head: columns.map(column => typeof column === "object" ? column.header : String(column))
    });
    dtos.forEach(dto => {
        const row = columns.map(column => {
            if (typeof column === "object") return column.value(dto) ?? "N/A";

            const value = dto[column];
            if (value == null) return "N/A";
            switch (column) {
                case "created":
                case "lastModified":
                    return new Date(value.toString()).toLocaleString();
                default:
                    return value as Table.Cell;
            }
        });
        table.push(row);
    });

    return table.toString();
}
