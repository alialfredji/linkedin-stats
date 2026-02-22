import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extractCsrfToken, loadCookies } from './auth.js';

// ---------------------------------------------------------------------------
// loadCookies
// ---------------------------------------------------------------------------
describe('loadCookies', () => {
  let tmpDir: string;
  let cookiePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'li-test-'));
    cookiePath = path.join(tmpDir, 'cookies.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a valid cookie file with li_at only', () => {
    fs.writeFileSync(cookiePath, JSON.stringify({ li_at: 'AQE_test_token' }));
    const cookies = loadCookies(cookiePath);
    expect(cookies.li_at).toBe('AQE_test_token');
    expect(cookies.JSESSIONID).toBeUndefined();
  });

  it('loads a valid cookie file with all optional fields', () => {
    fs.writeFileSync(
      cookiePath,
      JSON.stringify({
        li_at: 'AQE_token',
        JSESSIONID: 'ajax:12345',
        liap: 'true',
        li_rm: 'some_rm_value',
      })
    );
    const cookies = loadCookies(cookiePath);
    expect(cookies.li_at).toBe('AQE_token');
    expect(cookies.JSESSIONID).toBe('ajax:12345');
    expect(cookies.liap).toBe('true');
    expect(cookies.li_rm).toBe('some_rm_value');
  });

  it('throws if the file does not exist', () => {
    expect(() => loadCookies('/nonexistent/path/cookies.json')).toThrowError(
      /Cookie file not found/
    );
  });

  it('throws if the file contains invalid JSON', () => {
    fs.writeFileSync(cookiePath, 'not json at all {{');
    expect(() => loadCookies(cookiePath)).toThrowError(/not valid JSON/);
  });

  it('throws if li_at is missing', () => {
    fs.writeFileSync(cookiePath, JSON.stringify({ JSESSIONID: 'ajax:123' }));
    expect(() => loadCookies(cookiePath)).toThrowError(/validation failed/i);
  });

  it('throws if li_at is an empty string', () => {
    fs.writeFileSync(cookiePath, JSON.stringify({ li_at: '' }));
    expect(() => loadCookies(cookiePath)).toThrowError(/validation failed/i);
  });

  it('ignores unknown fields', () => {
    fs.writeFileSync(cookiePath, JSON.stringify({ li_at: 'token', unknownField: 'ignored' }));
    const cookies = loadCookies(cookiePath);
    expect(cookies.li_at).toBe('token');
  });

  it('loads cookies from a Playwright Cookie[] array (format saved by linkedin-auth)', () => {
    const playwrightCookies = [
      {
        name: 'lang',
        value: 'v=2&lang=en-us',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'JSESSIONID',
        value: '"ajax:9091792520626038571"',
        domain: '.www.linkedin.com',
        path: '/',
        expires: 1779497090,
        httpOnly: false,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'li_at',
        value: 'AQE_token_from_playwright',
        domain: '.linkedin.com',
        path: '/',
        expires: 1779497090,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'liap',
        value: 'true',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'li_rm',
        value: 'some_rm',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
    ];
    fs.writeFileSync(cookiePath, JSON.stringify(playwrightCookies));
    const cookies = loadCookies(cookiePath);
    expect(cookies.li_at).toBe('AQE_token_from_playwright');
    expect(cookies.JSESSIONID).toBe('"ajax:9091792520626038571"');
    expect(cookies.liap).toBe('true');
    expect(cookies.li_rm).toBe('some_rm');
  });

  it('loads Playwright array with only li_at present', () => {
    const playwrightCookies = [
      {
        name: 'li_at',
        value: 'AQE_only_token',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
    ];
    fs.writeFileSync(cookiePath, JSON.stringify(playwrightCookies));
    const cookies = loadCookies(cookiePath);
    expect(cookies.li_at).toBe('AQE_only_token');
    expect(cookies.JSESSIONID).toBeUndefined();
  });

  it('throws when Playwright array is missing li_at', () => {
    const playwrightCookies = [
      {
        name: 'lang',
        value: 'v=2&lang=en-us',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'None',
      },
    ];
    fs.writeFileSync(cookiePath, JSON.stringify(playwrightCookies));
    expect(() => loadCookies(cookiePath)).toThrowError(/missing required 'li_at' cookie/);
  });

  it('ignores extra cookies in Playwright array that are not linkedin fields', () => {
    const playwrightCookies = [
      {
        name: 'li_at',
        value: 'AQE_token',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      },
      {
        name: 'some_other_cookie',
        value: 'ignored',
        domain: '.linkedin.com',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'None',
      },
    ];
    fs.writeFileSync(cookiePath, JSON.stringify(playwrightCookies));
    const cookies = loadCookies(cookiePath);
    expect(cookies.li_at).toBe('AQE_token');
    expect(Object.keys(cookies)).toEqual(['li_at']);
  });
});

// ---------------------------------------------------------------------------
// extractCsrfToken
// ---------------------------------------------------------------------------
describe('extractCsrfToken', () => {
  it('returns the raw value when not quoted', () => {
    expect(extractCsrfToken('ajax:123456789')).toBe('ajax:123456789');
  });

  it('strips surrounding double-quotes', () => {
    expect(extractCsrfToken('"ajax:123456789"')).toBe('ajax:123456789');
  });

  it('handles values without the ajax: prefix', () => {
    expect(extractCsrfToken('plain_token')).toBe('plain_token');
  });

  it('returns empty string for empty input', () => {
    expect(extractCsrfToken('')).toBe('');
  });
});
