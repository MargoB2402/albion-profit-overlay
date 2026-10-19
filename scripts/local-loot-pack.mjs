// Explicitly local preview build: no registration or publishing requests.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export default async function(context){const file=path.join(context.appOutDir,'resources','app.asar');if(fs.existsSync(file))console.log('[local preview] ASAR SHA256 '+createHash('sha256').update(fs.readFileSync(file)).digest('hex'));}
