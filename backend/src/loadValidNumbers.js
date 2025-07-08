import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import ValidNumber from './models/ValidNumber.js';

dotenv.config();

const loadData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const filePath = path.resolve('./output1.txt');
    const data = fs.readFileSync(filePath, 'utf-8');
    const numbers = data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(n => ({ number: n }));

    await ValidNumber.deleteMany();
    await ValidNumber.insertMany(numbers);

    console.log("✅ Valid numbers loaded into MongoDB.");
    process.exit();
  } catch (err) {
    console.error("❌ Error loading valid numbers:", err);
    process.exit(1);
  }
};

loadData();
