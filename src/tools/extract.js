import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

const readFirstTwoLines = () => {
    const results = [];
    const parser = parse({
        delimiter: ',',
        from_line: 1,
        to_line: 2
    });

    createReadStream('sudoku.csv')
        .pipe(parser)
        .on('data', (data) => {
            results.push(data);
        })
        .on('end', () => {
            console.log('前两行数据:', results);
        });
}
