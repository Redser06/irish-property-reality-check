import { describe, expect, it } from 'vitest';
import {
  isAllowedListingHost,
  isPrivateAddress,
  isPunycodeHost,
  normaliseHost,
  validateListingUrl,
} from './urlGuard';

describe('validateListingUrl — hostile input', () => {
  const REJECTED: Array<[string, string]> = [
    // Credential-embedding: the real host is evil.com.
    ['https://daft.ie@evil.com/x', 'userinfo-present'],
    ['https://daft.ie:hunter2@evil.com/x', 'userinfo-present'],
    // Suffix confusion — an allowlisted name as a LABEL, not the registrable domain.
    ['https://daft.ie.evil.com/x', 'not-allowed-host'],
    ['https://notdaft.ie/x', 'not-allowed-host'],
    ['https://daft.ie.co/x', 'not-allowed-host'],
    ['https://evil.com/daft.ie', 'not-allowed-host'],
    // Scheme abuse.
    ['http://daft.ie/x', 'not-https'],
    ['file:///etc/passwd', 'not-https'],
    ['ftp://daft.ie/x', 'not-https'],
    ['gopher://daft.ie:70/x', 'not-https'],
    ['data:text/html,<h1>hi</h1>', 'not-https'],
    // Port abuse.
    ['https://daft.ie:8080/x', 'non-default-port'],
    ['https://daft.ie:22/x', 'non-default-port'],
    // Homoglyph attack. The raw paste uses a Cyrillic 'а' in "dаft.ie"; the URL
    // parser silently punycodes it to xn--dft-6cd.ie, which looks nothing like
    // the real host by the time we see it — hence rejecting the whole class.
    ['https://dаft.ie/x', 'punycode-host'],
    ['https://xn--dft-6cd.ie/x', 'punycode-host'],
    ['https://xn--80ak6aa92e.com/x', 'punycode-host'],
    // Direct-to-infrastructure attempts. None are allowlisted, so they die early.
    ['https://169.254.169.254/latest/meta-data/', 'not-allowed-host'],
    ['https://metadata.google.internal/x', 'not-allowed-host'],
    ['https://localhost/x', 'not-allowed-host'],
    ['https://127.0.0.1/x', 'not-allowed-host'],
    ['https://[::1]/x', 'not-allowed-host'],
    ['https://2130706433/x', 'not-allowed-host'], // decimal 127.0.0.1
    ['https://0x7f.0.0.1/x', 'not-allowed-host'], // hex-ish 127.0.0.1
    ['https://10.0.0.5/x', 'not-allowed-host'],
    // Malformed.
    ['not a url', 'bad-url'],
    ['', 'bad-url'],
    ['https://', 'bad-url'],
  ];

  it.each(REJECTED)('rejects %s', (input, reason) => {
    const verdict = validateListingUrl(input);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe(reason);
  });

  const ACCEPTED = [
    'https://www.daft.ie/for-sale/terraced-house-14-oak-road-dublin-12/5678901',
    'https://daft.ie/for-sale/x/1',
    'https://www.myhome.ie/residential/brochure/3-bed-semi-crumlin-dublin-12/4839201',
    'https://www.propertypal.com/property-for-sale/belfast',
    'https://www.rightmove.co.uk/properties/123456',
    'https://www.zoopla.co.uk/for-sale/details/123456',
    'https://www.onthemarket.com/details/123456/',
    'https://daft.ie:443/x', // explicit default port is fine
    'https://DAFT.IE/x', // case is normalised
    'https://daft.ie./x', // trailing root dot is legitimate
  ];

  it.each(ACCEPTED)('accepts %s', (input) => {
    expect(validateListingUrl(input).ok).toBe(true);
  });
});

describe('isPrivateAddress', () => {
  const PRIVATE = [
    '127.0.0.1', '127.1.2.3', '10.0.0.1', '10.255.255.255',
    '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', // AWS/GCP metadata
    '169.254.0.1', '100.64.0.1', '0.0.0.0', '255.255.255.255',
    '224.0.0.1', '198.18.0.1', '192.0.2.1', '203.0.113.1',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1',
    '::ffff:127.0.0.1', // IPv4-mapped loopback
    '::ffff:169.254.169.254',
    '::127.0.0.1', // IPv4-compatible
    '64:ff9b::7f00:1', // NAT64
    '2002:7f00:0001::', // 6to4 wrapping 127.0.0.1
    '0x7f.0.0.1', // hex octet — unparseable, so blocked
    '010.0.0.1', // octal-looking — blocked
    '', '   ', 'garbage',
  ];

  it.each(PRIVATE)('blocks %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  const PUBLIC = ['8.8.8.8', '1.1.1.1', '104.16.0.1', '172.32.0.1', '192.169.0.1', '2606:4700::1111'];

  it.each(PUBLIC)('allows %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it('does not confuse 172.32/16 with the 172.16/12 private block', () => {
    expect(isPrivateAddress('172.15.0.1')).toBe(false);
    expect(isPrivateAddress('172.16.0.1')).toBe(true);
    expect(isPrivateAddress('172.31.255.255')).toBe(true);
    expect(isPrivateAddress('172.32.0.1')).toBe(false);
  });
});

describe('host helpers', () => {
  it('normalises case and the trailing root dot', () => {
    expect(normaliseHost('WWW.Daft.IE.')).toBe('www.daft.ie');
  });

  it('detects punycode in any label', () => {
    expect(isPunycodeHost('xn--dft-ncd.ie')).toBe(true);
    expect(isPunycodeHost('shop.xn--dft-ncd.ie')).toBe(true);
    expect(isPunycodeHost('daft.ie')).toBe(false);
  });

  it('matches the full host, never a suffix', () => {
    expect(isAllowedListingHost('daft.ie')).toBe(true);
    expect(isAllowedListingHost('daft.ie.evil.com')).toBe(false);
    expect(isAllowedListingHost('evil-daft.ie')).toBe(false);
  });
});
