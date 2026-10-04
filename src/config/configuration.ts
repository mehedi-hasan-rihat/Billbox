export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'billbox-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },
});
