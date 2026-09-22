import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('routes framework catalog to controls in every deployment surface', () => {
  const vite = read('frontend/vite.config.ts');
  const compose = read('docker-compose.yml');
  const productionCompose = read('docker-compose.prod.yml');
  const ingress = read('helm/templates/ingress.yaml');
  const nginx = read('frontend/nginx.conf');

  assert.ok(
    vite.indexOf("'/api/frameworks/catalog'") < vite.indexOf("'/api/frameworks'"),
    'Vite catalog proxy must precede the generic frameworks proxy'
  );
  assert.match(compose, /controls-frameworks-catalog\.priority=100/);
  assert.match(productionCompose, /controls-frameworks-catalog\.priority=100/);
  assert.match(
    ingress,
    /path: \/api\/frameworks\/catalog[\s\S]*?name: \{\{ include "gigachad-grc\.fullname" \. \}\}-controls/
  );
  assert.match(
    nginx,
    /location \/api\/frameworks\/catalog[\s\S]*?proxy_pass http:\/\/controls:3001/
  );
});

test('does not use the removed development-only framework library API', () => {
  const page = read('frontend/src/pages/FrameworkLibrary.tsx');
  const vite = read('frontend/vite.config.ts');

  assert.doesNotMatch(page, /\/api\/framework-library/);
  assert.doesNotMatch(vite, /frameworkLibraryHandlers/);
});
