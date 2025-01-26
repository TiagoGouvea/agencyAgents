import fs from 'node:fs';

export function saveOutput(logFileName: any, content: string) {
  if (!fs.existsSync(logFileName)) {
    fs.writeFileSync(logFileName, content);
  } else {
    fs.appendFileSync(logFileName, content + `\r\n`);
  }
}
