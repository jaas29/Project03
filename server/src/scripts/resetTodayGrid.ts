import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri);
  const today = new Date().toISOString().slice(0, 10);
  // Delete all of today's puzzles so the server regenerates them all cleanly
  const result = await mongoose.connection.collection('puzzles').deleteMany({ date: today });
  console.log(`Deleted ${result.deletedCount} puzzle(s) for ${today} — restart the server to regenerate`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
