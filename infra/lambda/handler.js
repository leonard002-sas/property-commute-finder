const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
const allowedHosts = ['suumo.jp', 'homes.co.jp', 'chintai.net'];

function text(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function firstMatch(source, expression) {
  const match = source.match(expression);
  return match ? text(match[1]) : '';
}

function extractListing(html, url) {
  const decoded = html.replace(/\u003c/g, '<').replace(/\u003e/g, '>').replace(/\"/g, '"');
  const title = firstMatch(decoded, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)
    || firstMatch(decoded, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const plain = text(decoded);
  if (/(^|\.)suumo\.jp$/i.test(new URL(url).hostname)) {
    const name = firstMatch(decoded, /<title[^>]*>\s*【SUUMO】\s*([^（(／/|]+?)(?:（|\(|／|\/|\|)/i);
    const address = firstMatch(decoded, /property_view_detail--location[\s\S]{0,1200}?property_view_detail-text[^>]*>\s*([^<]+)/i);
    const station = firstMatch(decoded, /ekiNm1\s*:\s*"([^"]+)"/);
    const stations = [...decoded.matchAll(/ekiNm[1-3]\s*:\s*"([^"]+)"/g)].map(match => match[1] + '駅').filter((value, index, values) => values.indexOf(value) === index);
    const rentYen = Number(firstMatch(decoded, /chinryo\s*:\s*"(\d+)"/));
    const layout = firstMatch(decoded, /madoriDisp\s*:\s*"([^"]+)"/);
    return { name, rent: rentYen ? (rentYen / 10000).toFixed(1).replace(/\.0$/, '') + '万円' : '', layout, station: station ? station + '駅' : '', stations, address, url };
  }
  const rent = firstMatch(plain, /([0-9]+(?:\.[0-9]+)?\s*万円)/);
  const layout = firstMatch(plain, /\b([1-9][SLDKR]{1,4})\b/i);
  const station = firstMatch(plain, /([^\s、・（）()]{1,20}駅)/);
  const address = firstMatch(plain, /((?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)[^\s、／/|<>]{3,80})/);
  return {
    name: title.replace(/\s*[｜|].*$/, '').slice(0, 100),
    rent,
    layout,
    station,
    address,
    url
  };
}

async function extractFromUrl(url) {
  let parsed;
  try { parsed = new URL(url.trim()); } catch { throw new Error('invalid_url'); }
  if (parsed.protocol !== 'https:' || !allowedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) {
    throw new Error('unsupported_site');
  }
  const response = await fetch(parsed, {
    headers: { 'user-agent': 'PropertyCommuteFinder/1.0 (user-requested listing preview)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('fetch_failed');
  return extractListing(await response.text(), parsed.href);
}

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';
  try {
    if (method === 'OPTIONS') return { statusCode: 204, headers };
    if (path === '/extract' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return { statusCode: 200, headers, body: JSON.stringify(await extractFromUrl(body.url || '')) };
    }
    if (method === 'GET') {
      const result = await db.send(new QueryCommand({
        TableName: process.env.PROPERTIES_TABLE,
        KeyConditionExpression: 'user_id = :u',
        ExpressionAttributeValues: { ':u': userId }
      }));
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    const body = JSON.parse(event.body || '{}');
    if (method === 'DELETE') {
      await db.send(new DeleteCommand({ TableName: process.env.PROPERTIES_TABLE, Key: { user_id: userId, property_id: body.property_id } }));
      return { statusCode: 204, headers };
    }
    const item = { ...body, user_id: userId, property_id: body.property_id || crypto.randomUUID(), updated_at: new Date().toISOString() };
    await db.send(new PutCommand({ TableName: process.env.PROPERTIES_TABLE, Item: item }));
    return { statusCode: 200, headers, body: JSON.stringify(item) };
  } catch (error) {
    console.error(error);
    const statusCode = ['invalid_url', 'unsupported_site'].includes(error.message) ? 400 : 502;
    return { statusCode, headers, body: JSON.stringify({ error: error.message || 'internal_error' }) };
  }
};
