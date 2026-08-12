import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input:
    process.env.HISSAB_OPENAPI_URL ?? 'http://127.0.0.1:3000/docs/openapi.json',
  output: 'src/api/generated'
});
