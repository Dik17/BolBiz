import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpec } from '../src/site/schema.js';
import { auditSpec } from '../src/site/audit.js';
import { renderSite, esc } from '../src/site/render.js';
import { contrastRatio, readableOn, darkenToContrast } from '../src/site/contrast.js';
import { sampleSpec } from './fixtures.js';

test('contrast maths matches WCAG reference values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(readableOn('#f2a516'), '#111111');
  assert.ok(contrastRatio(darkenToContrast('#ffcc00'), '#ffffff') >= 4.5);
});

test('normalizeSpec fills English UI defaults and cleans phone numbers', () => {
  const { spec, errors } = normalizeSpec(sampleSpec());
  assert.deepEqual(errors, []);
  assert.equal(spec.content.en.ui.send_label, 'Send message');
  assert.equal(spec.contact.whatsapp, '+919876543210');
});

test('normalizeSpec rejects missing translations and bad colours', () => {
  const raw = sampleSpec({ brand_color: 'red' });
  raw.content.primary.ui = {};
  const { errors } = normalizeSpec(raw);
  assert.ok(errors.some((e) => e.includes('brand_color')));
  assert.ok(errors.some((e) => e.includes('missing translations')));
});

test('audit fails low-contrast colours and suggests a fix', () => {
  const { spec } = normalizeSpec(sampleSpec({ brand_color: '#ffd54f' }));
  const a = auditSpec(spec);
  assert.equal(a.passed, false);
  const f = a.findings.find((x) => x.id === 'contrast');
  assert.match(f.fix, /#[0-9a-f]{6}/);
});

test('audit fails when there is no way to contact the business', () => {
  const { spec } = normalizeSpec(sampleSpec({ contact: {} }));
  assert.ok(auditSpec(spec).findings.some((f) => f.id === 'contact' && f.level === 'fail'));
});

test('audit passes a good bilingual spec', () => {
  const { spec } = normalizeSpec(sampleSpec());
  const a = auditSpec(spec);
  assert.equal(a.passed, true, JSON.stringify(a.findings));
  assert.ok(a.score >= 80);
});

test('renderer sets lang, hreflang and escapes model-written text', () => {
  const raw = sampleSpec();
  raw.content.en.business_name = '<script>alert(1)</script>';
  const { spec } = normalizeSpec(raw);
  const mr = renderSite(spec, { lang: 'primary', basePath: '/s/x' });
  assert.match(mr, /<html lang="mr">/);
  assert.match(mr, /hreflang="en"/);
  const en = renderSite(spec, { lang: 'en', basePath: '/s/x' });
  assert.ok(!en.includes('<script>alert(1)'));
  assert.ok(en.includes(esc('<script>alert(1)</script>')));
  assert.match(en, /https:\/\/wa\.me\/919876543210/);
});

test('preview mode disables the contact form and blocks indexing', () => {
  const { spec } = normalizeSpec(sampleSpec());
  const html = renderSite(spec, { mode: 'preview' });
  assert.match(html, /noindex/);
  assert.match(html, /type="submit" disabled/);
});

test('renders all three plans with distinct features', () => {
  const raw = sampleSpec();
  raw.content.primary.highlights = [{ title: 'घरगुती', text: 'रोज ताजे' }];
  raw.content.en.highlights = [{ title: 'Home made', text: 'Fresh every day' }];
  const { spec } = normalizeSpec(raw);
  const basic = renderSite(spec, { tier: 'basic' });
  const standard = renderSite(spec, { tier: 'standard' });
  const premium = renderSite(spec, { tier: 'premium', lang: 'en' });
  assert.ok(!basic.includes('<form'), 'free plan has no contact form');
  assert.ok(standard.includes('<form'));
  assert.match(premium, /I%27d%20like%20to%20order|I'd like to order|like%20to%20order/);
  assert.ok(premium.includes('Home made'));
  for (const html of [basic, standard, premium]) assert.match(html, /<html lang="(mr|en)">/);
});
