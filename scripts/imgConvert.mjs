// Copyright 2017-2023 @polkadot/apps authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';

import { zlibSync } from 'fflate/node';

import { stringCamelCase } from '@polkadot/util';

const WITH_ZLIB = false;

const MIME = {
  gif: 'image/gif',
  png: 'image/png',
  svg: 'image/svg+xml'
}

const all = {};

for (let dir of ['extensions', 'external', 'chains', 'nodes']) {
  const sub = path.join('packages/apps-config/src/ui/logos', dir);
  const result = {};

  fs
    .readdirSync(sub)
    .forEach((file) => {
      const full = path.join(sub, file);

      if (file !== 'index.ts' && fs.lstatSync(full).isFile()) {
        const parts = file.split('.');
        const ext = parts[parts.length - 1];
        const mime = MIME[ext];

        if (!mime) {
          console.error(`Unable to determine mime for ${f}`);
        } else {
          const data = `data:${mime};base64,${fs.readFileSync(full).toString('base64')}`;
          const compressed = Buffer.from(zlibSync(Buffer.from(data), { level: 9 }));
          const base64 = compressed.toString('base64');
          const k = `${stringCamelCase(`${dir}_${parts.slice(0, parts.length - 1).join('_')}`)}${ext.toUpperCase()}`;
          const v = WITH_ZLIB
          ? `unz(';base64,${base64}', ${compressed.length}, ${data.length})`
          : `'${data}'`;;

          result[k] = v;
          all[k] = v;
        }
      }
    });

    if (Object.keys(result).length) {
      let srcs = '';

      for (let dir of ['endpoints', 'extensions', 'links']) {
      const srcroot = path.join('packages/apps-config/src', dir);

        fs
          .readdirSync(srcroot)
          .forEach((file) => {
            const full = path.join(srcroot, file);

            if (fs.lstatSync(full).isFile() && file.endsWith('.ts')) {
              srcs += fs.readFileSync(full).toString();
            }
          });
      }

      const notfound = Object
        .keys(result)
        .filter((k) => !srcs.includes(k));

      if (notfound.length) {
        console.log('\n', dir.padEnd(10), ' :: ', notfound.length, 'not referenced', '\n\t', notfound.join(', '), '\n');
      }

      fs.writeFileSync(path.join(sub, 'index.ts'), `// Copyright 2017-2023 @polkadot/apps-config authors & contributors
// SPDX-License-Identifier: Apache-2.0

// do not edit
// auto-generated by scripts/imgConvert.mjs
${
  WITH_ZLIB
    ? "\nimport { unz } from '../../../util';\n"
    : ''
}
${Object.keys(result).sort().map((k) => `export const ${k} = ${result[k]};`).join('\n')}
`);
    }
}

const allKeys = Object.keys(all);
const dupes = {};

 allKeys.forEach((a) => {
  const d = allKeys.filter((b) =>
    a !== b &&
    all[a] === all[b]
  );

  if (d.length) {
    dupes[a] = d;
  }
 });

if (Object.keys(dupes).length) {
  const dupeMsg = `${Object.keys(dupes).length} dupes found`;

  console.log('\n', dupeMsg);

  for (let [k, d] of Object.entries(dupes)) {
    console.log('\t', k.padStart(20), ' :: ', d.join(', '));
  }

  throw new Error(`FATAL: ${dupeMsg}`);
}