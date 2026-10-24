import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './user-agent';

describe('parseUserAgent', () => {
    it.each([
        [
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
            'Chrome',
            'Linux',
        ],
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',
            'Edge',
            'Windows',
        ],
        [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7; rv:140.0) Gecko/20100101 Firefox/140.0',
            'Firefox',
            'macOS',
        ],
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
            'Safari',
            'iOS',
        ],
        [
            'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36',
            'Chrome',
            'Android',
        ],
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 OPR/120.0.0.0',
            'Opera',
            'Windows',
        ],
    ])('%s', (ua, browser, os) => {
        expect(parseUserAgent(ua)).toEqual({ browser, os });
    });

    it('leaves what is not a browser to the caller', () => {
        expect(parseUserAgent('echophase-cli')).toBeNull();
        expect(parseUserAgent('')).toBeNull();
    });

    it('says what it cannot tell', () => {
        expect(parseUserAgent('Mozilla/5.0 (compatible; SomeBot/1.0)')).toEqual(
            { browser: null, os: null }
        );
    });
});
