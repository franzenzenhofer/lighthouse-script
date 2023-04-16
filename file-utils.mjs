import fs from 'fs/promises';

export async function readFile(file) {
  try {
    const content = await fs.readFile(file, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading from file ${file}:`, error.message);
    throw error;
  }
}

export async function writeFile(filename, content) {
  try {
    await fs.writeFile(filename, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing to file ${filename}:`, error.message);
    throw error;
  }
}

// Add this function to file-utils.mjs
export async function writeFileWithBackup(filename, content) {
  try {
    await fs.copyFile(filename, `${filename}.bak`); // Create a backup before writing
    await fs.writeFile(filename, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing to file with backup ${filename}:`, error.message);
    throw error;
  }
}


export async function revertFile(file) {
  try {
    await fs.copyFile(`${file}.bak`, file);
  } catch (error) {
    console.error(`Error reverting file ${file}:`, error.message);
    throw error;
  }
}
