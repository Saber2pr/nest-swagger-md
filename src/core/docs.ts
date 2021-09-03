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
  if (name === '/') return;
  const item = paths[method];
  if (item) {
    const output = [
      `### 2.${index + 1} ${name}`,
      `* 接口：${method.toUpperCase()} ${name}`,
      `* 说明：${item.description ?? '待补充'}`,
    ];
    if (method === 'get') {
      if (item.parameters.length) {
        output.push(
          '* 参数：',
          item.parameters
            .map((item: ParameterObject) => {
              const paramSchema = item.schema as SchemaObject;
              return `  - ${item.name}: ${paramSchema.type},${
                item.required ? ' 必选,' : ''
              } ${item.description ?? '待补充'}`;
            })
            .join('\n'),
        );
      }
    } else if (method === 'post' || method === 'put') {
      const body = item.requestBody;
      if (body) {
        if ('content' in body) {
          const schema = body.content['application/json']
            .schema as ReferenceObject;
          output.push('* 参数：', createBodyDoc(schema.$ref, dtos));
        } else {
          output.push('* 参数：', `  - 参考：${body.$ref}`);
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
  const output = [];
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
        output.push(
          `  - ${paramName}: ${prop.type},${
            required.includes(paramName) ? ' 必选,' : ''
          } ${prop.description ?? ''}`,
        );
      }
    }
  }
  return output.join('\n');
};

export async function createApiMarkdownDocs(document: OpenAPIObject) {
  const apiPaths = Object.keys(document.paths).filter(path => path !== '/')
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
    join(process.cwd(), 'api.md'),
    [
      `## 1. ${document.info.title}`,
      document.info.description,
      '',
      '## 2. 接口列表',
      output.join('\n\n'),
    ].join('\n'),
  );
}

export default createApiMarkdownDocs