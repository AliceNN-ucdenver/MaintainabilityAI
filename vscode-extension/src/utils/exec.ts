import { promisify } from 'util';
import { execFile } from 'child_process';

/** Promisified child_process.execFile — shared across panels and services. */
export const execFileAsync = promisify(execFile);
