import { Option } from "commander";
import { LIST_FORMATS, ListFormat } from "../utils/list-format";

export interface ListFormatOptions {
    format: ListFormat;
}

export function listFormatOption(): Option {
    return new Option("--format <format>", "List output format")
        .choices([...LIST_FORMATS])
        .default("table");
}
