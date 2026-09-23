import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const compose = read('docker-compose.yml');
const productionCompose = read('docker-compose.prod.yml');
const ingress = read('helm/templates/ingress.yaml');
const nginx = read('frontend/nginx.conf');
const vite = read('frontend/vite.config.ts');
const auditDeepRoutes = [
  'templates',
  'workpapers',
  'test-procedures',
  'remediation',
  'analytics',
  'planning',
  'reports',
  'audit-ai',
];

function composeServiceBlock(source, service) {
  const match = source.match(
    new RegExp(`^  ${service}:\\n([\\s\\S]*?)(?=^  [a-z0-9-]+:\\n|^networks:)`, 'm')
  );
  assert.ok(match, `missing Compose service ${service}`);
  return match[0];
}

function ingressPathBlock(route) {
  const marker = `          - path: ${route}\n`;
  const start = ingress.indexOf(marker);
  assert.notEqual(start, -1, `missing ingress route ${route}`);
  const next = ingress.indexOf('\n          - path:', start + marker.length);
  return ingress.slice(start, next === -1 ? ingress.length : next);
}

function viteProxyBlock(route) {
  const marker = `      '${route}': {`;
  const start = vite.indexOf(marker);
  assert.notEqual(start, -1, `missing Vite proxy ${route}`);
  const next = vite.indexOf("\n      '", start + marker.length);
  return vite.slice(start, next === -1 ? vite.length : next);
}

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

test('keeps production API fallback above the SPA and below specific services', () => {
  const controls = composeServiceBlock(productionCompose, 'controls');
  const frontend = composeServiceBlock(productionCompose, 'frontend');
  assert.match(
    controls,
    /controls-catchall\.rule=Host\(`\$\{APP_DOMAIN\}`\) && PathPrefix\(`\/api`\)/
  );
  assert.match(controls, /controls-catchall\.priority=2/);
  assert.match(controls, /services\.controls\.loadbalancer\.server\.port=3001/);
  assert.match(frontend, /routers\.frontend\.priority=1/);
});

test('routes distinct API contracts to their owning production services', () => {
  const frameworks = composeServiceBlock(productionCompose, 'frameworks');
  const tprm = composeServiceBlock(productionCompose, 'tprm');
  const trust = composeServiceBlock(productionCompose, 'trust');
  const audit = composeServiceBlock(productionCompose, 'audit');

  assert.match(frameworks, /PathPrefix\(`\/api\/assessments`\)/);
  assert.match(frameworks, /PathPrefix\(`\/api\/mappings`\)/);
  assert.match(frameworks, /services\.frameworks\.loadbalancer\.server\.port=3002/);
  assert.match(tprm, /PathPrefix\(`\/api\/vendor-assessments`\)/);
  assert.match(tprm, /PathPrefix\(`\/api\/tprm-config`\)/);
  assert.doesNotMatch(tprm, /PathPrefix\(`\/api\/assessments`\)/);
  assert.match(tprm, /services\.tprm\.loadbalancer\.server\.port=3005/);
  assert.match(trust, /PathPrefix\(`\/api\/answer-templates`\)/);
  assert.match(trust, /PathPrefix\(`\/api\/trust-config`\)/);
  assert.match(trust, /services\.trust\.loadbalancer\.server\.port=3006/);

  for (const route of [
    '/api/audit-portal',
    ...auditDeepRoutes.map((name) => `/api/audit/${name}`),
  ]) {
    assert.ok(audit.includes(`PathPrefix(\`${route}\`)`), `${route} must target audit`);
  }
  assert.match(audit, /services\.audit\.loadbalancer\.server\.port=3007/);
});

test('proxies API requests before the nginx SPA fallback', () => {
  const apiLocation = nginx.indexOf('location ~ ^/api(?:/|$)');
  const spaLocation = nginx.indexOf('location / {');
  assert.notEqual(apiLocation, -1);
  assert.notEqual(spaLocation, -1);
  assert.ok(apiLocation < spaLocation, 'nginx API fallback must precede the SPA fallback');
  assert.match(nginx.slice(apiLocation, spaLocation), /proxy_pass \$controls_upstream/);
  for (const [service, port] of [
    ['controls', 3001],
    ['frameworks', 3002],
    ['policies', 3004],
    ['tprm', 3005],
    ['trust', 3006],
    ['audit', 3007],
  ]) {
    assert.match(
      nginx,
      new RegExp(`set \\$${service}_upstream http://${service}:${port}`),
      `nginx direct access must route ${service} APIs to their owning service`
    );
  }
  assert.match(nginx, /resolver 127\.0\.0\.11 valid=10s/);
});

test('keeps Vite service proxies ahead of its controls fallback', () => {
  assert.match(vite, /VITE_ENABLE_DEV_STUBS === 'true'/);
  const expectedProxies = [
    ['/api/vendor-assessments', 'http://localhost:3005'],
    ['/api/tprm-config', 'http://localhost:3005'],
    ['/api/answer-templates', 'http://localhost:3006'],
    ['/api/trust-config', 'http://localhost:3006'],
    ['/api/audit-portal', 'http://localhost:3007'],
    ...auditDeepRoutes.map((name) => [`/api/audit/${name}`, 'http://localhost:3007']),
  ];
  for (const [route, target] of expectedProxies) {
    assert.ok(viteProxyBlock(route).includes(`target: '${target}'`), `${route} has wrong target`);
  }
  const auditDeep = vite.indexOf("'/api/audit/templates'");
  const controlsAudit = vite.indexOf("'/api/audit':");
  const apiFallback = vite.indexOf("'/api':");
  assert.ok(auditDeep < controlsAudit, 'deep audit proxies must precede controls audit logs');
  assert.ok(controlsAudit < apiFallback, 'controls API fallback must remain last');
});

test('keeps Helm service targets ahead of API and SPA fallbacks', () => {
  const expectedRoutes = [
    ['/api/assessments', 'frameworks'],
    ['/api/vendor-assessments', 'tprm'],
    ['/api/answer-templates', 'trust'],
    ['/api/trust-config', 'trust'],
    ['/api/audit-portal', 'audit'],
    ...auditDeepRoutes.map((name) => [`/api/audit/${name}`, 'audit']),
    ['/api', 'controls'],
    ['/', 'frontend'],
  ];
  for (const [route, service] of expectedRoutes) {
    assert.ok(
      ingressPathBlock(route).includes(`"gigachad-grc.fullname" . }}-${service}`),
      `${route} must target ${service}`
    );
  }
  const specific = ingress.indexOf('          - path: /api/audit/analytics\n');
  const apiFallback = ingress.indexOf('          - path: /api\n');
  const spaFallback = ingress.indexOf('          - path: /\n');
  assert.ok(specific < apiFallback, 'specific Helm APIs must precede /api');
  assert.ok(apiFallback < spaFallback, 'Helm /api fallback must precede /');
});

test('standardizes backend controller prefixes on same-origin API paths', () => {
  for (const [file, route] of [
    ['services/tprm/src/assessments/assessments.controller.ts', 'api/vendor-assessments'],
    ['services/trust/src/templates/templates.controller.ts', 'api/answer-templates'],
    ['services/trust/src/config/trust-config.controller.ts', 'api/trust-config'],
    ['services/controls/src/bcdr/plan-attestations.controller.ts', 'api/bcdr'],
    ...auditDeepRoutes.map((name) => [
      `services/audit/src/${name === 'audit-ai' ? 'ai' : name}/${name}.controller.ts`,
      `api/audit/${name}`,
    ]),
  ]) {
    assert.ok(read(file).includes(`@Controller('${route}')`), `${file} has the wrong prefix`);
  }
});

test('uses implemented frontend paths and methods instead of shadow contracts', () => {
  const assessments = read('frontend/src/pages/AssessmentDetail.tsx');
  const apiClient = read('frontend/src/lib/api.ts');
  const answerTemplates = read('frontend/src/pages/AnswerTemplates.tsx');
  const scheduledReports = read('frontend/src/pages/ScheduledReportsPage.tsx');
  const tprmConfig = read('frontend/src/pages/TPRMConfiguration.tsx');
  const auditorLogin = read('frontend/src/pages/AuditorLogin.tsx');
  assert.match(assessments, /vendorAssessmentsApi/);
  assert.match(apiClient, /api\.get\('\/api\/vendor-assessments'/);
  assert.match(apiClient, /api\.patch\(`\/api\/vendor-assessments/);
  assert.match(answerTemplates, /api\.patch\(`\/api\/answer-templates/);
  assert.match(scheduledReports, /scheduledReportsApi/);
  assert.match(apiClient, /api\.get\('\/api\/scheduled-reports'\)/);
  assert.match(tprmConfig, /api\.get\('\/api\/tprm-config'\)/);
  assert.match(auditorLogin, /api\.post<AuditorLoginResponse>\('\/api\/audit-portal\/auth'/);
  for (const source of [assessments, scheduledReports, tprmConfig, auditorLogin]) {
    assert.doesNotMatch(
      source,
      /\/api\/(?:reports\/scheduled|config\/tprm|auditor\/|assessments(?:\/|`|'|"))/
    );
  }
});
