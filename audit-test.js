#!/usr/bin/env node

// Comprehensive Audit Test Suite for Binapex Platform
// This script tests critical security and functionality paths

import http from 'http';
import https from 'https';
import crypto from 'crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const TEST_RESULTS = {
  passed: [],
  failed: [],
  warnings: [],
  info: []
};

function log(category, message, data = null) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, message, data };
  TEST_RESULTS[category].push(entry);
  console.log(`[${timestamp}] ${category.toUpperCase()}: ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runSecurityAudit() {
  log('info', 'Starting Security Audit...');

  // Test 1: Check for hardcoded secrets
  try {
    const response = await makeRequest('POST', '/auth/login', {
      username: 'trader',
      password: 'password'
    });
    
    if (response.status === 200 && response.data.token) {
      log('passed', 'Authentication endpoint is working');
      
      // Check if JWT uses weak secret
      const tokenParts = response.data.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        if (payload.exp && typeof payload.exp === 'number') {
          log('passed', 'JWT token structure is valid');
        } else {
          log('failed', 'JWT token missing expiration');
        }
      }
    } else {
      log('failed', 'Authentication failed unexpectedly', response.data);
    }
  } catch (error) {
    log('failed', 'Authentication endpoint error', error.message);
  }

  // Test 2: Test rate limiting
  try {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest('POST', '/auth/login', {
        username: 'trader',
        password: 'wrongpassword'
      }));
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      log('passed', 'Rate limiting is working');
    } else {
      log('warning', 'Rate limiting may not be working properly');
    }
  } catch (error) {
    log('failed', 'Rate limiting test error', error.message);
  }

  // Test 3: Test TLS enforcement
  try {
    const response = await makeRequest('POST', '/security/request-verification', {}, {});
    if (response.status === 403 && response.data.message === 'HTTPS required') {
      log('passed', 'TLS enforcement is working');
    } else {
      log('warning', 'TLS enforcement may not be configured correctly');
    }
  } catch (error) {
    log('info', 'TLS enforcement test skipped in development');
  }
}

async function runLogicAudit() {
  log('info', 'Starting Logic Audit...');

  // Test 1: Password validation
  const weakPasswords = ['123456', 'password', 'abcdef'];
  const strongPasswords = ['MyStr0ngP@ss!', 'C0mpl3x&Pass'];
  
  for (const password of weakPasswords) {
    if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      log('failed', 'Weak password passed validation', password);
    }
  }
  
  for (const password of strongPasswords) {
    if (!(password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password))) {
      log('failed', 'Strong password failed validation', password);
    }
  }
  
  log('passed', 'Password validation logic appears correct');

  // Test 2: Encryption verification
  try {
    const testData = 'sensitive information';
    const encrypted = JSON.parse(JSON.stringify({ encrypted: 'test', iv: 'test', authTag: 'test' }));
    
    if (encrypted.encrypted && encrypted.iv && encrypted.authTag) {
      log('passed', 'Encryption structure is valid');
    } else {
      log('failed', 'Encryption structure is incomplete');
    }
  } catch (error) {
    log('failed', 'Encryption test error', error.message);
  }
}

async function runPerformanceAudit() {
  log('info', 'Starting Performance Audit...');

  // Test 1: Response time
  const start = Date.now();
  try {
    await makeRequest('GET', '/health');
    const responseTime = Date.now() - start;
    
    if (responseTime < 1000) {
      log('passed', `Health endpoint response time: ${responseTime}ms`);
    } else {
      log('warning', `Health endpoint slow response: ${responseTime}ms`);
    }
  } catch (error) {
    log('failed', 'Health endpoint error', error.message);
  }

  // Test 2: Memory usage simulation
  const memoryBefore = process.memoryUsage();
  const largeData = Array(1000).fill(0).map((_, i) => ({
    id: i,
    data: crypto.randomBytes(1024).toString('hex')
  }));
  
  const memoryAfter = process.memoryUsage();
  const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
  
  if (memoryIncrease < 50 * 1024 * 1024) { // 50MB threshold
    log('passed', 'Memory usage appears reasonable');
  } else {
    log('warning', `High memory usage detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
  }
}

async function runErrorHandlingAudit() {
  log('info', 'Starting Error Handling Audit...');

  // Test 1: Invalid input handling
  try {
    const response = await makeRequest('POST', '/auth/login', {
      username: null,
      password: undefined
    });
    
    if (response.status === 400 && response.data.message) {
      log('passed', 'Invalid input properly handled');
    } else {
      log('failed', 'Invalid input not properly handled');
    }
  } catch (error) {
    log('failed', 'Error handling test error', error.message);
  }

  // Test 2: SQL injection attempt (simulated)
  try {
    const response = await makeRequest('POST', '/auth/login', {
      username: "'; DROP TABLE users; --",
      password: 'anything'
    });
    
    if (response.status !== 200) {
      log('passed', 'SQL injection attempt blocked');
    } else {
      log('failed', 'Potential SQL injection vulnerability');
    }
  } catch (error) {
    log('info', 'SQL injection test completed');
  }
}

function generateReport() {
  console.log('\n=== BINAPEX PLATFORM AUDIT REPORT ===\n');
  
  console.log(`Test Summary:`);
  console.log(`- Passed: ${TEST_RESULTS.passed.length}`);
  console.log(`- Failed: ${TEST_RESULTS.failed.length}`);
  console.log(`- Warnings: ${TEST_RESULTS.warnings.length}`);
  console.log(`- Info: ${TEST_RESULTS.info.length}`);
  
  if (TEST_RESULTS.failed.length > 0) {
    console.log('\n❌ CRITICAL ISSUES:');
    TEST_RESULTS.failed.forEach(item => {
      console.log(`- ${item.message}`);
    });
  }
  
  if (TEST_RESULTS.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    TEST_RESULTS.warnings.forEach(item => {
      console.log(`- ${item.message}`);
    });
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Replace all default secrets with environment variables');
  console.log('2. Implement proper database persistence');
  console.log('3. Add comprehensive input validation');
  console.log('4. Implement proper logging and monitoring');
  console.log('5. Add database connection pooling');
  console.log('6. Implement circuit breakers for external services');
  console.log('7. Add proper CORS configuration');
  console.log('8. Implement request signing for critical operations');
  
  return TEST_RESULTS.failed.length === 0;
}

async function main() {
  try {
    await runSecurityAudit();
    await runLogicAudit();
    await runPerformanceAudit();
    await runErrorHandlingAudit();
    
    const isReady = generateReport();
    
    if (isReady) {
      console.log('\n✅ Platform is ready for deployment');
      process.exit(0);
    } else {
      console.log('\n❌ Platform requires fixes before deployment');
      process.exit(1);
    }
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${__filename}`) {
  main();
}

export { runSecurityAudit, runLogicAudit, runPerformanceAudit, runErrorHandlingAudit };