#!/usr/bin/env node

import { join } from 'path';

import fs from 'fs'
import { spawn } from 'child_process';

const runScript = (workspace: string, path: string, args: string[]) => {
  return new Promise(resolve => {
    const task = spawn(`yarn nest start`, args, {
      cwd: workspace,
      env: process.env,
      shell: true,
      stdio: "inherit"
    })
    task.on('close', resolve)
  })
}

let code = ''

const entry = join(process.cwd(), 'src/main.ts')
try {
  code = fs.readFileSync(entry).toString()
} catch (error) {
  console.log(`Read File Fail: ${entry}`)
}

if(code){
  const original = "const document = SwaggerModule.createDocument(app, options)"
  const newCode = original + ";await createApiDocs(document);"
  if(code.includes(original)){
    const lib = `const {createApiDocs} = require('/usr/local/lib/node_modules/@saber2pr/nest-swagger-md');\n`
    let newContent = lib + code.replace(original, newCode);
    newContent = newContent.replace(/await app\.listen[\s\S]*?\n/, 'await app.listen(60030, () => process.exit(1));\n')
    fs.writeFileSync(entry, newContent)
    runScript(process.cwd(), entry, []).then(() => {
      fs.writeFileSync(entry, code)
    })
  } else {
    console.log(`Main.ts should contain: \n${original}`)
  }
}