import { emptyState } from "./chalks";
import Table from 'cli-table3';

export function dtoAsTable<T> (dtos: T[], head: string[], entityNamePlural: string): string {
    if (!dtos || dtos.length === 0) {
        return emptyState(`No ${entityNamePlural} match your request`);
    }

    const table = new Table({ head });
    dtos.forEach(dto => {
        const formatValue = (headTitle: string) => {
            if (!dto[headTitle]) return 'N/A';
            switch (headTitle) {
                case "created":
                case "lastModified":
                    return new Date(dto[headTitle]).toLocaleString();
                default:
                    return dto[headTitle];
            }
        };
        const row = head.map(formatValue);
        table.push(row);
    });

    return table.toString();
}