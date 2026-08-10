import { describe, expect, it } from 'vitest';
import { extractHead, extractOgFields } from './og';

const page = (head: string, body = '<p>irrelevant</p>') =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

describe('extractOgFields', () => {
  it('reads the standard Open Graph tags', () => {
    const fields = extractOgFields(
      page(`
        <meta property="og:title" content="3 bed Terraced House, 14 Oak Road, Dublin 12" />
        <meta property="og:description" content="Asking &euro;425,000. 102 sq m of living space." />
        <meta property="og:image" content="https://cdn.example.com/a.jpg" />
        <meta property="og:site_name" content="Daft.ie" />
      `),
    );

    expect(fields.title).toBe('3 bed Terraced House, 14 Oak Road, Dublin 12');
    expect(fields.description).toBe('Asking €425,000. 102 sq m of living space.');
    expect(fields.imageUrl).toBe('https://cdn.example.com/a.jpg');
    expect(fields.siteName).toBe('Daft.ie');
  });

  it('accepts name= as well as property=, since plenty of CMSes emit it', () => {
    expect(extractOgFields(page('<meta name="og:title" content="Hello">')).title).toBe('Hello');
  });

  it('lets the first writer win so og:title beats a later twitter:title', () => {
    const fields = extractOgFields(
      page(`
        <meta property="og:title" content="Canonical">
        <meta name="twitter:title" content="Secondary">
      `),
    );
    expect(fields.title).toBe('Canonical');
  });

  it('falls back to <title> when there is no og:title', () => {
    expect(extractOgFields(page('<title>Fallback Title</title>')).title).toBe('Fallback Title');
  });

  it('handles single quotes and unquoted attribute values', () => {
    expect(extractOgFields(page("<meta property='og:title' content='Single'>")).title).toBe('Single');
    expect(extractOgFields(page('<meta property=og:title content=Unquoted>')).title).toBe('Unquoted');
  });

  it('decodes numeric and named entities', () => {
    const fields = extractOgFields(page('<meta property="og:title" content="&#8364;425,000 &amp; rising &#x2014; nice">'));
    expect(fields.title).toBe('€425,000 & rising — nice');
  });

  it('drops a non-https image rather than handing back something we would not load', () => {
    expect(extractOgFields(page('<meta property="og:image" content="http://cdn.example.com/a.jpg">')).imageUrl).toBeUndefined();
    expect(extractOgFields(page('<meta property="og:image" content="javascript:alert(1)">')).imageUrl).toBeUndefined();
  });

  it('ignores meta tags that appear after the head closes', () => {
    const html = '<html><head><title>Real</title></head><body><meta property="og:title" content="Injected"></body></html>';
    expect(extractOgFields(html).title).toBe('Real');
  });

  it('caps any single field so a hostile page cannot bloat the response', () => {
    const huge = 'x'.repeat(5_000);
    expect(extractOgFields(page(`<meta property="og:title" content="${huge}">`)).title!.length).toBe(500);
  });

  it('returns nothing rather than guessing when the head is empty', () => {
    expect(extractOgFields(page(''))).toEqual({});
  });

  it('never executes or retains script content', () => {
    const fields = extractOgFields(page('<script>window.x=1</script><meta property="og:title" content="Safe">'));
    expect(fields.title).toBe('Safe');
    expect(JSON.stringify(fields)).not.toContain('window.x');
  });
});

describe('extractHead', () => {
  it('stops at the closing head tag', () => {
    expect(extractHead('<head><title>a</title></head><body>BODY</body>')).not.toContain('BODY');
  });

  it('truncates a head that never closes', () => {
    expect(extractHead(`<head>${'x'.repeat(200_000)}`, 1_000)).toHaveLength(1_000);
  });
});
