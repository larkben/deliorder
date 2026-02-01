import 'dotenv/config';
import { spawn } from 'child_process';

const server = spawn('node', ['build/index.js'], {
    env: process.env,
    stdio: 'inherit'
});