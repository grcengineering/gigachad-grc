import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const compose = fs.readFileSync(path.resolve(process.cwd(), 'docker-compose.yml'), 'utf8');

test('routes the built-in framework catalog to controls with explicit priority', () => {
  assert.match(
    compose,
    /controls-frameworks-catalog\.rule=PathPrefix\(`\/api\/frameworks\/catalog`\)/
  );
  assert.match(compose, /controls-frameworks-catalog\.priority=100/);
});

test('keeps user management on the controls catch-all', () => {
  assert.match(compose, /controls-catchall\.rule=PathPrefix\(`\/api`\)/);
  assert.doesNotMatch(compose, /frameworks-users/);
});

test('keeps tenant frameworks on the frameworks service', () => {
  assert.match(compose, /routers\.frameworks\.rule=PathPrefix\(`\/api\/frameworks`\)/);
  assert.match(compose, /services\.frameworks\.loadbalancer\.server\.port=3002/);
});
