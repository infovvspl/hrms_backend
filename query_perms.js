import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/logistic_backend' }); // assuming default or wait, what's the db URL?
