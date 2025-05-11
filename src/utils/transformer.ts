import { set } from 'lodash';

function parseNestedQueryParams(query: Record<string, any>): any {
  const result: any = {};

  for (const key in query) {
    set(result, key, query[key]);
  }

  return result;
}

export { parseNestedQueryParams };
