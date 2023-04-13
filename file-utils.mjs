import fs from 'fs/promises';

export async function writeFile(filename, content) {
  try {
    await fs.writeFile(filename, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing to file ${filename}:`, error.message);
    throw error;
  }
}
