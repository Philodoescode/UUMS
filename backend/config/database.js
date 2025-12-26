require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'uums_user',
    password: process.env.DB_PASSWORD || 'uums_password',
    database: process.env.DB_NAME || 'uums_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  test: {
    username: process.env.DB_USER || 'uums_user',
    password: process.env.DB_PASSWORD || 'uums_password',
    database: process.env.DB_NAME_TEST || 'uums_db_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  },
};
