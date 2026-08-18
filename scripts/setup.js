#!/usr/bin/env node

/**
 * Interactive setup script for the template
 * Helps new users get started quickly by:
 * 1. Checking for .env file
 * 2. Copying example.env if needed
 * 3. Running prisma generate if needed
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setup() {
  console.log('\n🚀 Simple Vite React Express - Setup\n');
  console.log('─'.repeat(45));

  // Check for .env file
  const envPath = path.join(rootDir, '.env');
  const exampleEnvPath = path.join(rootDir, 'example.env');

  if (!fs.existsSync(envPath)) {
    log.warn('.env file not found');

    if (fs.existsSync(exampleEnvPath)) {
      log.step('Copying example.env to .env...');
      fs.copyFileSync(exampleEnvPath, envPath);
      log.success('.env file created from example.env');
      log.warn('Please update DATABASE_URL in .env with your credentials');
    } else {
      log.error('example.env not found. Please create .env manually.');
      process.exit(1);
    }
  } else {
    log.success('.env file exists');
  }

  // Check for node_modules
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log.warn('node_modules not found');
    log.step('Run "npm install" to install dependencies');
  } else {
    log.success('Dependencies installed');
  }

  // Check for Prisma client
  const prismaClientPath = path.join(rootDir, 'node_modules', '.prisma', 'client');
  if (!fs.existsSync(prismaClientPath)) {
    log.warn('Prisma client not generated');

    const answer = await prompt('Generate Prisma client now? (y/n): ');
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      log.step('Running prisma generate...');
      try {
        execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
        log.success('Prisma client generated');
      } catch (error) {
        log.error('Failed to generate Prisma client');
        log.info('Run "npx prisma generate" manually after fixing any issues');
      }
    }
  } else {
    log.success('Prisma client exists');
  }

  // Next steps
  console.log('\n─'.repeat(45));
  console.log('\n📋 Next Steps:\n');
  console.log('  1. Update DATABASE_URL in .env with your PostgreSQL credentials');
  console.log('  2. Run "npm run db:setup" to initialize the database');
  console.log('  3. Run "npm run db:seed" to add sample data (optional)');
  console.log('  4. Run "npm run dev" to start development servers');
  console.log('\n🌐 Open http://localhost:3000 when ready!\n');
}

setup().catch(console.error);
