#!/usr/bin/env node
/**
 * KKM Local Proxy Server
 * 
 * Этот скрипт запускается на кассовом ПК и форвардит HTTP-запросы
 * от браузера (HTTPS) к локальной ККМ (HTTP), обходя ограничения
 * Mixed Content и CORS.
 * 
 * УСТАНОВКА:
 * 1. Убедитесь, что установлен Node.js (https://nodejs.org)
 * 2. Сохраните этот файл как kkm-proxy.js
 * 3. Запустите: node kkm-proxy.js
 * 
 * НАСТРОЙКА:
 * - KKM_HOST: IP-адрес ККМ (по умолчанию 192.168.8.169)
 * - KKM_PORT: Порт ККМ (по умолчанию 8080)
 * - PROXY_PORT: Порт прокси-сервера (по умолчанию 3456)
 * 
 * Можно передать через переменные окружения:
 *   KKM_HOST=192.168.1.100 KKM_PORT=5555 node kkm-proxy.js
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * В настройках ККМ укажите Local Proxy URL: http://localhost:3456
 */

const http = require('http');

// Конфигурация
const KKM_HOST = process.env.KKM_HOST || '192.168.8.169';
const KKM_PORT = parseInt(process.env.KKM_PORT || '8080', 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '3456', 10);

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Обработка CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Формируем запрос к ККМ
  const options = {
    hostname: KKM_HOST,
    port: KKM_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${KKM_HOST}:${KKM_PORT}`,
    },
    timeout: 30000,
  };

  // Удаляем заголовки, которые могут вызвать проблемы
  delete options.headers['origin'];
  delete options.headers['referer'];

  const proxyReq = http.request(options, (proxyRes) => {
    // Добавляем CORS заголовки к ответу
    const headers = {
      ...proxyRes.headers,
      ...corsHeaders,
    };

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[ERROR] Ошибка подключения к ККМ: ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({
      error: 'KKM_UNREACHABLE',
      message: `Не удалось подключиться к ККМ ${KKM_HOST}:${KKM_PORT}`,
      details: err.message,
    }));
  });

  proxyReq.on('timeout', () => {
    console.error('[ERROR] Таймаут подключения к ККМ');
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({
      error: 'KKM_TIMEOUT',
      message: 'Превышено время ожидания ответа от ККМ',
    }));
  });

  // Передаём тело запроса
  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           KKM Local Proxy Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Прокси запущен на:     http://localhost:${PROXY_PORT}`);
  console.log(`  Форвардинг на ККМ:     http://${KKM_HOST}:${KKM_PORT}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('  В настройках ККМ укажите:');
  console.log(`  Local Proxy URL: http://localhost:${PROXY_PORT}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Нажмите Ctrl+C для остановки');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Остановка прокси-сервера...');
  server.close(() => {
    console.log('[INFO] Сервер остановлен');
    process.exit(0);
  });
});
