import { writeFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import {
  ComponentsObject, OpenAPIObject, ParameterObject, PathItemObject, ReferenceObject, SchemaObject
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const createApiDoc = (
  index: number,
  name: string,
  method: 'post' | 'get' | 'delete' | 'put',
  paths: PathItemObject,
  ret: string[],
  dtos: ComponentsObject,
) => {
  const item = paths[method];
  if (item) {
    const params = (method === 'get' && item.parameters.length > 0) ? '?' + item.parameters.map((item: ParameterObject) => `${item.name}=${item.name}`).join('&') : ''
    const output = [
      `### 2.${index + 1} ${item.description ?? '待补充'}`,
      `${method.toUpperCase()} {{base}}${name}${params}`,
    ];

    if (method === 'post' || method === 'put' || method === 'delete') {
      output.push(`Content-Type: application/json`, ``)
      const body = item.requestBody;
      if (body) {
        if ('content' in body) {
          const schema = body.content['application/json']
            .schema as ReferenceObject;
          output.push(createBodyDoc(schema.$ref, dtos));
        } else {
          output.push(JSON.stringify({ 'ref': body.$ref }, null, 2));
        }
      }
    }
    ret.push(output.join('\n'));
  }
};

const findRefObj = (ref: string, dtos: ComponentsObject) => {
  const schemas = dtos.schemas as Record<string, SchemaObject>;
  for (const key in schemas) {
    if (ref.endsWith(key)) {
      const values = schemas[key];
      for (const name in values) {
        const prop = values[name];
        const allRef = prop.allOf;
        if (allRef) {
          values[name] = findRefObj(allRef[0].$ref, dtos);
        }
      }
      return values;
    }
  }
};

const createBodyDoc = (ref: string, dtos: ComponentsObject) => {
  const schemas = dtos.schemas as Record<string, SchemaObject>;
  const output = {}
  if (schemas) {
    const dto = findRefObj(ref, dtos);
    const properties = dto.properties;
    const required = dto.required ?? [];
    if (properties) {
      for (const paramName in properties) {
        let prop = properties[paramName] as SchemaObject;
        const allRef = prop.allOf;
        if (allRef) {
          // @ts-ignore
          prop = findRefObj(allRef[0].$ref, dtos);
        }
        output[paramName] = `${prop.type},${required.includes(paramName) ? ' 必选,' : ''
          } ${prop.description ?? ''}`
      }
    }
  }
  return JSON.stringify(output, null, 2)
};

export interface ApiRestClientOpts {
  prefix: string
}

export async function createApiRestClient(document: OpenAPIObject, outputFile = join(process.cwd(), 'api.http'), opts?: ApiRestClientOpts) {
  const apiPaths = Object.keys(document.paths)
  const output: string[] = [];
  apiPaths.forEach((path, i) => {
    createApiDoc(
      i,
      path,
      'post',
      document.paths[path],
      output,
      document.components,
    );
    createApiDoc(
      i,
      path,
      'get',
      document.paths[path],
      output,
      document.components,
    );
    createApiDoc(
      i,
      path,
      'put',
      document.paths[path],
      output,
      document.components,
    );
    createApiDoc(
      i,
      path,
      'delete',
      document.paths[path],
      output,
      document.components,
    );
  });

  await promisify(writeFile)(
    outputFile,
    [
      `## 1. ${document.info.title}`,
      document.info.description,
      ``,
      '## 2. 变量定义',
      ``,
      `@base=${join('http://localhost:3000', opts.prefix ?? '')}`,
      ``,
      '## 3. 接口列表',
      ``,
      output.join('\n\n'),
    ].join('\n'),
  );
}

export default createApiRestClient