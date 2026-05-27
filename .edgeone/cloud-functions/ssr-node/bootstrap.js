


/**
 * 通用框架服务器工具
 * 提供所有框架共用的HTTP服务器创建、响应处理、请求处理等功能
 * 集成Fetch Proxy代理功能
 */

import { createServer } from 'http';
import { Readable } from 'stream';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';


// ===== Fetch Proxy Injection (Production Mode Only) =====
// Inject fetch-proxy to intercept fetch calls
import __fetchProxyCrypto from 'node:crypto';

(function() {
  const __originalFetch = globalThis.fetch;

const uuid = '{{PAGES_PROXY_UUID}}';
const proxyHost = '{{PAGES_PROXY_HOST}}';

// Domains that must bypass the proxy and always use direct fetch.
// These are internal EdgeOne infrastructure services whose requests
// break when routed through openedge-proxy (e.g. STS credential
// issuance for @edgeone/pages-blob, blob CDN read/write domains).
const __proxyBypassHosts = new Set([
  'blob-sts.edgeone.site',
]);
const __proxyBypassSuffixes = [
  '.blob.edgeone.site',
  '.blob-nocache.edgeone.site',
];

function __shouldBypassProxy(host) {
  if (__proxyBypassHosts.has(host)) return true;
  for (let i = 0; i < __proxyBypassSuffixes.length; i++) {
    if (host.endsWith(__proxyBypassSuffixes[i])) return true;
  }
  return false;
}

function _fetch(
  request,
  requestInit = {},
) {
  const { host } = getUrl(request);
  // Never proxy internal EdgeOne blob infrastructure domains
  if (__shouldBypassProxy(host)) {
    return __originalFetch(request, requestInit);
  }
  const cache = getHostCache(host);
  if (cache && cache.needProxy && cache.expires > Date.now()) {
    setHostCache(host);
    return fetchByProxy(request, requestInit);
  }
  return fetchByOrigin(request, requestInit);
}

function getUrl(request) {
  // 直接从 request.url 获取 URL，避免消费 request body
  const urlString = request instanceof Request ? request.url : request;
  return new URL(urlString);
}

function getHostCache(host) {
  return new Map(globalThis._FETCHCACHES || []).get(host);
}

function setHostCache(host) {
  const value = {
    needProxy: true,
    expires: Date.now() + 1000 * 60 * 60,
  };
  if (globalThis._FETCHCACHES) {
    globalThis._FETCHCACHES.set(host, value);
  } else {
    const cache = new Map([[host, value]]);
    Object.defineProperty(globalThis, '_FETCHCACHES', {
      value: cache,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

function bufferToHex(arr) {
  return Array.prototype.map
    .call(arr, (x) => (x >= 16 ? x.toString(16) : '0' + x.toString(16)))
    .join('');
}

function generateSign({ pathname, oeTimestamp }) {
  return md5(oeTimestamp+'-'+pathname+'-'+uuid);
}

async function generateHeaders(request) {
  const { host, pathname } = getUrl(request);
  const timestamp = Date.now().toString();
  const sign = generateSign({ pathname, oeTimestamp: timestamp });
  return {
    host,
    timestamp,
    sign,
  };
}

// MD5 hash function for Node.js environment
// Node.js crypto.subtle.digest doesn't support MD5, so we use crypto.createHash instead
// Note: __fetchProxyCrypto is imported at the top level using ESM import
function md5(text) {
  const hash = __fetchProxyCrypto.createHash('md5');
  hash.update(text, 'utf8');
  return hash.digest('hex');
}

/**
 * Try to request using the native fetch; if it fails, request via the proxy
 * @returns
 */
async function fetchByOrigin(
  request,
  requestInit = {},
) {
  try {
    const res = await __originalFetch(request, {
      eo: {
        timeoutSetting: {
          connectTimeout: 500,
        },
      },
      ...requestInit,
    });
    if (res.status > 300 || res.status < 200) throw new Error('need proxy');
    return res;
  } catch (error) {
    const { host } = getUrl(request);
    setHostCache(host);
    return fetchByProxy(request, requestInit);
  }
}

/**
 * Request via AI proxy
 * @returns
 */
async function fetchByProxy(
  request,
  requestInit,
) {
  const options = {};
  if (requestInit) {
    Object.assign(options, requestInit || {});
  }
  options.headers = new Headers(options.headers || {});
  const { host, timestamp, sign } = await generateHeaders(request);
  options.headers.append('oe-host', host);
  options.headers.append('oe-timestamp', timestamp);
  options.headers.append('oe-sign', sign);
  
  let clonedRequest;
  if (request instanceof Request && typeof request.clone === 'function') {
    clonedRequest = request.clone();
  } else {
    // If request is not a Request object (e.g., URL string), create a new Request
    clonedRequest = new Request(request);
  }
  
  // Create a new request with the proxy host, preserving all properties including body
  const req = new Request(clonedRequest.url.replace(host, proxyHost), {
    method: clonedRequest.method,
    headers: clonedRequest.headers,
    body: clonedRequest.body,
  });
  
  return __originalFetch(req, options);
}
// Replace global fetch with _fetch from fetch-proxy
  if (typeof _fetch === 'function') {
    globalThis.fetch = _fetch;
    // Store original fetch for internal use
    globalThis.__originalFetch = __originalFetch;
  } else {
    console.warn('[runtime-shim] _fetch function not found, using original fetch');
  }
})();



/**
 * 固定配置 - 服务始终运行在 localhost:9000
 */
const SERVER_HOST = 'localhost';
const SERVER_PORT = 9000;
const SERVER_ADDRESS = 'localhost:9000';

/**
 * 从请求headers中构建完整URL
 * @param {Object} req - Node.js IncomingMessage对象
 * @returns {Object} 返回包含 { host, path, fullPath } 的对象
 */
export function buildURL(req) {

  // 尝试多种方式获取真实host
  const realHost = 
    req.headers['eo-pages-host'] ||
    SERVER_ADDRESS;

  // 获取协议
  const protocol = req.headers['x-forwarded-proto'] || 'https';

  // 构建完整URL
  const fullUrlRaw = protocol + '://' + realHost + req.url;
  const urlObj = new URL(fullUrlRaw);
  
  // 处理 pathname - 移除末尾的 /
  let pathname = urlObj.pathname;
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // 根据环境构建 fullPath
  let fullPath = '';
  if (req.headers.host === 'localhost:9000') {
    // localhost 环境只使用 pathname
    fullPath = pathname;
  } else {
    // 生产环境使用完整 URL
    fullPath = protocol + '://' + realHost + req.url;
    // 移除末尾的 ?
    if (fullPath.endsWith('?')) {
      fullPath = fullPath.slice(0, -1);
    }
  }
  
  return {
    protocol: protocol,
    host: realHost,
    path: pathname,
    fullPath: fullPath
  };
}

/**
 * 创建请求体ReadableStream (适用于需要流式处理的框架)
 * @param {Object} req - Node.js IncomingMessage对象
 * @returns {ReadableStream} Web ReadableStream
 */
export function createRequestStream(req) {
  return new ReadableStream({
    start(controller) {
      req.on('data', chunk => {
        controller.enqueue(new Uint8Array(chunk));
      });
      
      req.on('end', () => {
        controller.close();
      });
      
      req.on('error', error => {
        controller.error(error);
      });
    },
    
    cancel() {
      req.destroy();
    }
  });
}

/**
 * 读取完整请求体 (适用于需要一次性读取body的框架)
 * @param {Object} req - Node.js IncomingMessage对象
 * @returns {Promise<Buffer>} 请求体Buffer
 */
export async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * 处理Response对象并写入Node.js response
 * @param {Object} res - Node.js ServerResponse对象
 * @param {Response} response - Web Response对象
 * @param {Object} additionalHeaders - 额外的headers
 * @param {Object} options - 处理选项
 *   - useEdgeOneHeaders: 是否使用EdgeOne特定headers(默认false)
 *   - requestId: 请求ID
 * @returns {Promise<void>}
 */
export async function handleResponse(res, response, additionalHeaders = {}, options = {}) {
  const startTime = Date.now();
  const { useEdgeOneHeaders = true, requestId = '' } = options;
  
  // 处理null/undefined响应
  if (!response) {
    const notFoundHeaders = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };
    
    // EdgeOne特定headers
    if (useEdgeOneHeaders) {
      notFoundHeaders['functions-request-id'] = requestId;
      notFoundHeaders['eo-pages-inner-scf-status'] = '404';
      notFoundHeaders['eo-pages-inner-status-intercept'] = 'true';
    }
    
    res.writeHead(404, notFoundHeaders);
    res.end(JSON.stringify({
      error: "Not Found",
      message: "The requested path does not exist"
    }));
    console.log('Pages response status: 404');
    return;
  }

  try {
    // 处理Response对象
    if (response instanceof Response) {
      const headers = {};
      
      // 复制Response的headers
      for (const [key, value] of response.headers) {
        headers[key] = value;
      }
      
      // 合并额外的headers
      Object.assign(headers, additionalHeaders);
      
      // EdgeOne特定headers处理
      if (useEdgeOneHeaders) {
        headers['functions-request-id'] = requestId;
        
        // 如果Response中已经设置了,使用它的值;否则使用responseStatus
        if (!headers['eo-pages-inner-scf-status']) {
          headers['eo-pages-inner-scf-status'] = String(response.status);
        }
        
        // 如果Response中已经设置了,使用它的值;否则默认为false
        if (!headers['eo-pages-inner-status-intercept']) {
          headers['eo-pages-inner-status-intercept'] = 'false';
        }
      }
      
      // Validate and normalize Cache-Control header
      
function validateCacheControlHeader(headers) {
  const cacheControl = headers['cache-control'];
  if(cacheControl) {
    
    const directives = cacheControl.split(',').map(directive => directive.trim());
    const validatedDirectives = [];
    
    for (const directive of directives) {
      if (!directive) continue;
      const [key, value] = directive.split('=');
      const standardDirectives = ['max-age', 'public', 'private', 's-maxage', 'no-cache', 'no-store', 'no-transform', 'must-revalidate', 'proxy-revalidate', 'must-understand', 'stale-while-revalidate', 'stale-if-error', 'immutable'];
      if (!standardDirectives.includes(key)) {
        continue;
      }
      if (key === 'stale-while-revalidate' || key === 'stale-if-error') {
        if(!value) {
          const defaultValue = '31536000';
          validatedDirectives.push(key + '=' + defaultValue);
          continue;
        }
      }
      validatedDirectives.push(directive);
    }
    
    headers['cache-control'] = validatedDirectives.join(', ');
  }
}

      validateCacheControlHeader(headers);
      
      // 移除可能导致问题的headers
      if (headers['eop-client-geo']) {
        delete headers['eop-client-geo'];
      }
      
      // 处理set-cookie头部(特殊处理,可能有多个值)
      if (response.headers.has('set-cookie')) {
        const cookieArr = response.headers.getSetCookie();
        headers['set-cookie'] = cookieArr;
      }

      // 检查是否是流式响应
      const isStream = response.body && (
        response.headers.get('content-type')?.includes('text/event-stream') ||
        response.headers.get('transfer-encoding')?.includes('chunked') ||
        response.body instanceof ReadableStream ||
        typeof response.body.pipe === 'function' ||
        response.headers.get('x-content-type-stream') === 'true'
      );

      if (isStream) {
        // 流式响应处理
        const streamHeaders = { ...headers };

        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          streamHeaders['Content-Type'] = 'text/event-stream';
          streamHeaders['Cache-Control'] = 'no-cache';
          streamHeaders['Connection'] = 'keep-alive';
        }

        res.writeHead(response.status, streamHeaders);

        // 处理不同类型的流
        if (typeof response.body.pipe === 'function') {
          // Node.js Stream
          response.body.pipe(res);
        } else {
          // Web ReadableStream
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
                res.write(value);
              } else {
                const chunk = new TextDecoder().decode(value);
                res.write(chunk);
              }
            }
          } finally {
            reader.releaseLock();
            // SCF可能会立即冻结环境上下文,导致后续日志无法输出
            // 通过延时来确保日志输出(仅在EdgeOne模式下)
            if (useEdgeOneHeaders) {
              setTimeout(() => {
                res.end();
              }, 1);
            } else {
              res.end();
            }
          }
        }
      } else {
        // 普通响应
        // 删除可能不准确的Content-Length,让Node.js自动计算
        delete headers['content-length'];
        delete headers['Content-Length'];
        
        res.writeHead(response.status, headers);
        
        // 读取body
        if (response.body) {
          const body = await response.arrayBuffer();
          res.end(Buffer.from(body));
        } else {
          res.end();
        }
      }
    } else {
      // 非Response对象,直接返回JSON
      const jsonHeaders = {
        'Content-Type': 'application/json',
        ...additionalHeaders
      };
      
      if (useEdgeOneHeaders) {
        jsonHeaders['functions-request-id'] = requestId;
        jsonHeaders['eo-pages-inner-scf-status'] = '200';
        jsonHeaders['eo-pages-inner-status-intercept'] = 'false';
      }
      
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify(response));
    }
  } catch (error) {    
    // 错误处理
    if (!res.headersSent) {
      const errorHeaders = {
        'Content-Type': 'application/json',
        ...additionalHeaders
      };
      
      if (useEdgeOneHeaders) {
        errorHeaders['functions-request-id'] = requestId;
        errorHeaders['eo-pages-inner-scf-status'] = '502';
        errorHeaders['eo-pages-inner-status-intercept'] = 'true';
      }
      
      res.writeHead(useEdgeOneHeaders ? 502 : 500, errorHeaders);
      res.end(JSON.stringify({
        error: "Internal Server Error",
        message: error.message
      }));
    }
  } finally {
    const endTime = Date.now();
    console.log('Pages response status: ' + response?.status);
  }
}

/**
 * 创建通用框架服务器
 * @param {Function} handler - 框架的请求处理函数 async (req, context) => Response
 * @param {Object} options - 配置选项
 *   - onBeforeRequest: 请求前钩子 (req) => void
 *   - onAfterResponse: 响应后钩子 (req, res, response) => void
 *   - errorHandler: 错误处理函数 (error, req, res) => void
 *   - buildContext: 构建context函数 (req) => context
 *   - useEdgeOneHeaders: 是否使用EdgeOne特定headers (默认false)
 *   - logFullPath: 是否记录完整请求路径 (默认true)
 * @returns {Server} HTTP Server实例
 */
export function createFrameworkServer(handler, options = {}) {
  const {
    onBeforeRequest = null,
    onAfterResponse = null,
    errorHandler = null,
    buildContext = () => ({}),
    useEdgeOneHeaders = true,
    logFullPath = true,
  } = options;

  const server = createServer(async (req, res) => {
    const requestStartTime = Date.now();
    
    try {
      // 请求前钩子
      if (onBeforeRequest) {
        await onBeforeRequest(req);
      }

      // 构建URL
      const url = buildURL(req);

      console.log('Pages request path: ' + url.fullPath);

      // 构建context
      const context = buildContext(req);

      // 调用框架handler
      const response = await handler(req, context);

      // 设置额外headers和选项
      const requestId = req.headers['x-scf-request-id'] || req.headers['functions-request-id'] || '';
      const additionalHeaders = {};
      additionalHeaders['functions-request-id'] = requestId;

      
      const handleResponseOptions = {
        useEdgeOneHeaders,
        requestId
      };

      // 处理响应
      await handleResponse(res, response, additionalHeaders, handleResponseOptions);

      // 响应后钩子
      if (onAfterResponse) {
        await onAfterResponse(req, res, response);
      }

      const requestEndTime = Date.now();
      
    } catch (error) {      
      // EdgeOne日志格式
      if (useEdgeOneHeaders) {
        console.log('Pages response status: 502');
      }
      
      // 使用自定义错误处理器或默认处理器
      if (errorHandler) {
        await errorHandler(error, req, res);
      } else {
        // 默认错误处理
        if (!res.headersSent) {
          const requestId = req.headers['x-scf-request-id'] || req.headers['functions-request-id'] || '';
          const errorHeaders = {
            'Content-Type': 'application/json'
          };
          
          if (useEdgeOneHeaders) {
            errorHeaders['functions-request-id'] = requestId;
            errorHeaders['eo-pages-inner-scf-status'] = '502';
            errorHeaders['eo-pages-inner-status-intercept'] = 'true';
          } else {
            errorHeaders['functions-request-id'] = requestId;
          }
          
          res.writeHead(useEdgeOneHeaders ? 502 : 500, errorHeaders);
          res.end(JSON.stringify({
            error: "Internal Server Error",
            code: "FRAMEWORK_HANDLER_ERROR",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }));
        }
      }
    }
  });

   // 启动服务器
  server.listen(SERVER_PORT, SERVER_HOST, () => {
  });

  return server;
}

/**
 * 辅助函数:将Node.js Stream转换为Web ReadableStream
 * @param {Stream} nodeStream - Node.js Stream
 * @returns {ReadableStream} Web ReadableStream
 */
export function nodeStreamToWebStream(nodeStream) {
  return Readable.toWeb(nodeStream);
}

/**
 * 辅助函数:将Web ReadableStream转换为Node.js Stream
 * @param {ReadableStream} webStream - Web ReadableStream
 * @returns {Stream} Node.js Stream
 */
export function webStreamToNodeStream(webStream) {
  return Readable.fromWeb(webStream);
}

export function importShim() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const timingPath = resolve(__dirname, './timing.js');
  if (existsSync(timingPath)) {
    import('./timing.js');
  }
}

export default {
  createFrameworkServer,
  handleResponse,
  buildURL,
  createRequestStream,
  readRequestBody,
  nodeStreamToWebStream,
  webStreamToNodeStream,
};

