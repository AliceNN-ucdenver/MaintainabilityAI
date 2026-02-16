import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { TechStack } from '../types';

const FRAMEWORK_DEPS: Record<string, string> = {
  'express': 'Express',
  'fastify': 'Fastify',
  'koa': 'Koa',
  'hapi': 'Hapi',
  'next': 'Next.js',
  'nuxt': 'Nuxt',
  'nest': 'NestJS',
  '@nestjs/core': 'NestJS',
  'gatsby': 'Gatsby',
  'remix': 'Remix',
  'sveltekit': 'SvelteKit',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'spring-boot': 'Spring Boot',
};

const DB_DEPS: Record<string, string> = {
  'pg': 'PostgreSQL',
  'mysql2': 'MySQL',
  'mongodb': 'MongoDB',
  'mongoose': 'MongoDB',
  'sqlite3': 'SQLite',
  'better-sqlite3': 'SQLite',
  'prisma': 'Prisma',
  '@prisma/client': 'Prisma',
  'typeorm': 'TypeORM',
  'sequelize': 'Sequelize',
  'drizzle-orm': 'Drizzle',
  'redis': 'Redis',
  'ioredis': 'Redis',
};

const TEST_DEPS: Record<string, string> = {
  'jest': 'Jest',
  'vitest': 'Vitest',
  'mocha': 'Mocha',
  'ava': 'Ava',
  '@testing-library/react': 'Testing Library',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
};

const VALIDATION_DEPS: Record<string, string> = {
  'zod': 'Zod',
  'joi': 'Joi',
  'yup': 'Yup',
  'ajv': 'AJV',
  'class-validator': 'class-validator',
  'io-ts': 'io-ts',
};

export class TechStackDetector {
  async detect(): Promise<TechStack> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const stack: TechStack = {
      language: 'Unknown',
      runtime: 'Unknown',
      framework: 'Unknown',
      database: 'Unknown',
      testing: 'Unknown',
      validation: 'Unknown',
      cicd: 'Unknown',
      packageManager: 'Unknown',
    };

    if (!workspaceRoot) {
      return stack;
    }

    await this.detectFromPackageJson(workspaceRoot, stack);
    this.detectLanguage(workspaceRoot, stack);
    this.detectCiCd(workspaceRoot, stack);
    this.detectPackageManager(workspaceRoot, stack);

    return stack;
  }

  private async detectFromPackageJson(root: string, stack: TechStack): Promise<void> {
    const pkgPath = path.join(root, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return;
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Detect Node.js version
      if (pkg.engines?.node) {
        const ver = pkg.engines.node.replace(/[^\d.]/g, '').split('.')[0];
        stack.runtime = `Node ${ver}`;
      } else {
        stack.runtime = 'Node.js';
      }

      // Detect framework
      for (const [dep, name] of Object.entries(FRAMEWORK_DEPS)) {
        if (allDeps[dep]) {
          stack.framework = name;
          break;
        }
      }

      // Detect database
      const dbMatches: string[] = [];
      for (const [dep, name] of Object.entries(DB_DEPS)) {
        if (allDeps[dep]) {
          dbMatches.push(name);
        }
      }
      if (dbMatches.length > 0) {
        stack.database = [...new Set(dbMatches)].join(', ');
      }

      // Detect testing
      for (const [dep, name] of Object.entries(TEST_DEPS)) {
        if (allDeps[dep]) {
          stack.testing = name;
          break;
        }
      }

      // Detect validation
      for (const [dep, name] of Object.entries(VALIDATION_DEPS)) {
        if (allDeps[dep]) {
          stack.validation = name;
          break;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private detectLanguage(root: string, stack: TechStack): void {
    if (fs.existsSync(path.join(root, 'tsconfig.json'))) {
      stack.language = 'TypeScript';
    } else if (fs.existsSync(path.join(root, 'package.json'))) {
      stack.language = 'JavaScript';
    } else if (fs.existsSync(path.join(root, 'requirements.txt')) || fs.existsSync(path.join(root, 'pyproject.toml'))) {
      stack.language = 'Python';
    } else if (fs.existsSync(path.join(root, 'go.mod'))) {
      stack.language = 'Go';
    } else if (fs.existsSync(path.join(root, 'Cargo.toml'))) {
      stack.language = 'Rust';
    } else if (fs.existsSync(path.join(root, 'pom.xml')) || fs.existsSync(path.join(root, 'build.gradle'))) {
      stack.language = 'Java';
    }
  }

  private detectCiCd(root: string, stack: TechStack): void {
    if (fs.existsSync(path.join(root, '.github', 'workflows'))) {
      stack.cicd = 'GitHub Actions';
    } else if (fs.existsSync(path.join(root, '.gitlab-ci.yml'))) {
      stack.cicd = 'GitLab CI';
    } else if (fs.existsSync(path.join(root, 'Jenkinsfile'))) {
      stack.cicd = 'Jenkins';
    } else if (fs.existsSync(path.join(root, '.circleci'))) {
      stack.cicd = 'CircleCI';
    }
  }

  private detectPackageManager(root: string, stack: TechStack): void {
    // JS/Node package managers
    if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) {
      stack.packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(root, 'yarn.lock'))) {
      stack.packageManager = 'yarn';
    } else if (fs.existsSync(path.join(root, 'bun.lockb'))) {
      stack.packageManager = 'bun';
    } else if (fs.existsSync(path.join(root, 'package-lock.json'))) {
      stack.packageManager = 'npm';
    // Python package managers
    } else if (fs.existsSync(path.join(root, 'uv.lock'))) {
      stack.packageManager = 'uv';
    } else if (fs.existsSync(path.join(root, 'poetry.lock'))) {
      stack.packageManager = 'poetry';
    } else if (fs.existsSync(path.join(root, 'Pipfile.lock'))) {
      stack.packageManager = 'pipenv';
    } else if (fs.existsSync(path.join(root, 'requirements.txt'))) {
      stack.packageManager = 'pip';
    }
  }

  formatForContext(stack: TechStack): string {
    const parts: string[] = [];

    if (stack.language !== 'Unknown') {
      parts.push(stack.language);
    }
    if (stack.runtime !== 'Unknown') {
      parts.push(stack.runtime);
    }
    if (stack.framework !== 'Unknown') {
      parts.push(`${stack.framework} framework`);
    }
    if (stack.database !== 'Unknown') {
      parts.push(`${stack.database} database`);
    }
    if (stack.testing !== 'Unknown') {
      parts.push(`${stack.testing} testing`);
    }
    if (stack.validation !== 'Unknown') {
      parts.push(`${stack.validation} validation`);
    }
    if (stack.cicd !== 'Unknown') {
      parts.push(stack.cicd);
    }

    return parts.length > 0
      ? parts.join(', ')
      : 'No tech stack detected — please specify manually';
  }
}
