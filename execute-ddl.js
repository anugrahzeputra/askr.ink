const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres.qajclxkxhrtdxrbmrsly:enigmacampB%40tch7@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Successfully connected to Supabase PostgreSQL!');

    const sqlPath = path.join(__dirname, 'supabase', 'schema.sql');
    const ddl = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing DDL from supabase/schema.sql...');
    await client.query(ddl);
    console.log('✓ DDL execution completed successfully!');

    // Verify created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n=== Public Tables in Supabase ===');
    console.table(tableRes.rows);

    // Verify columns for links table
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'links'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== Structure of "links" Table ===');
    console.table(colRes.rows);

    // Verify RLS policies
    const policyRes = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public';
    `);

    console.log('\n=== Active Row Level Security (RLS) Policies ===');
    console.table(policyRes.rows);

    await client.end();
  } catch (err) {
    console.error('Error executing DDL:', err);
    process.exit(1);
  }
}

run();
