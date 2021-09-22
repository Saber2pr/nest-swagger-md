import { ApiRestClientOpts } from './core/http';
import { promisify } from 'util';
import { OpenAPIObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { existsSync, mkdir } from 'fs';
import { dirname } from 'path';

import { createApiMarkdownDocs, createApiRestClient } from './core';

export * from './core'
export default createApiMarkdownDocs

export const createApiDocs = async (document: OpenAPIObject, fileName = 'api', opts?: ApiRestClientOpts) => {
  const dir = dirname(fileName)
  if (!existsSync(dir)) {
    await promisify(mkdir)(dir)
  }
  await createApiMarkdownDocs(document, `${fileName}.md`)
  await createApiRestClient(document, `${fileName}.http`, opts)
}