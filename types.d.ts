interface CsvDataItem {
    x: number
    y: number
}
interface CsvDataRecords {
    meta: Array<Record<string, string>>
    data: Array<Array<CsvDataItem>>
}
interface CsvDataJson {
    name: string
    labels: string[]
    lines: number
    records: CsvDataRecords
}
