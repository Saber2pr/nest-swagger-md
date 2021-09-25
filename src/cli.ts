#!/usr/bin/env node

import { join } from 'path';

import fs from 'fs'
import { spawn } from 'child_process';

const runScript = (workspace: string, path: string, args: string[]) => {
  return new Promise(resolve => {
    const task = spawn(`yarn nest start ${path}`, args, {
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

const wrap = (str: string) => `\n/// sa replace start\n${str}\n/// sa replace end\n`

const switchContent = (content: string,original: string, newStr: string) => {
  const injectStr = wrap(newStr)
  if(content.includes(injectStr)){
    return content.replace(injectStr, original)
  }else {
    return content.replace(original, injectStr)
  }
}

if(code){
  const original = "const document = SwaggerModule.createDocument(app, options)"
  if(code.includes(original)){
    const newCode = code.replace(original, original + ";await createApiDocs(document);process.exit(1);")
    const lib = `import {createApiDocs} from '@saber2pr/nest-swagger-md';\n`
    fs.writeFileSync(entry, lib + switchContent(code, original, newCode))
    runScript(process.cwd(), entry, [])
    fs.writeFileSync(entry, switchContent(code.replace(lib, ''), original, newCode))
  } else {
    console.log(`Main.ts should contain: \n${original}`)
  }
}