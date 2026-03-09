const fs = require('fs');

const log = fs.readFileSync('tsc_output.txt', 'utf8');
const lines = log.split('\n');

for (const line of lines) {
    const match = line.match(/^src\/([^:]+)\((\d+),(\d+)\): error TS7006: Parameter '([^']+)' implicitly has an 'any' type\./);
    if (match) {
        const file = 'src/' + match[1];
        const lineNum = parseInt(match[2], 10) - 1; // 0-indexed
        const colNum = parseInt(match[3], 10) - 1;
        const paramName = match[4];

        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const fileLines = content.split('\n');

            const targetLine = fileLines[lineNum];

            // We know 'paramName' parameter is implicitly 'any'.
            // We just need to replace the exact occurrence of `paramName` with `paramName: any`
            // or `(paramName)` with `(paramName: any)`.
            // The easiest way is to use regex or string replace at the exact column.

            // Since column number might point to the start of the param name
            if (targetLine.substring(colNum, colNum + paramName.length) === paramName) {
                fileLines[lineNum] = targetLine.substring(0, colNum + paramName.length) + ': any' + targetLine.substring(colNum + paramName.length);
                fs.writeFileSync(file, fileLines.join('\n'));
                console.log(`Fixed ${file} at line ${lineNum + 1}`);
            } else {
                console.log(`Failed to match at ${file} line ${lineNum + 1}: expected ${paramName} at col ${colNum}, got ${targetLine.substring(colNum, colNum + paramName.length)}`);
            }
        }
    }
}
