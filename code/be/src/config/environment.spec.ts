import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('uses safe local-development defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/hissab',
      DATABASE_SSL: false,
      DATABASE_POOL_MAX: 10,
    });
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnvironment({ PORT: '70000' })).toThrow(
      'PORT must be an integer between 1 and 65535.',
    );
  });

  it('requires an explicit non-development database URL', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL is required outside development.',
    );

    expect(() => validateEnvironment({ NODE_ENV: 'test' })).toThrow(
      'DATABASE_URL is required outside development.',
    );
  });

  it('requires production secrets', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app',
      }),
    ).toThrow('JWT_ACCESS_SECRET is required.');
  });
});
