const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const headers = {'content-type':'application/json','access-control-allow-origin':'*'};
exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || 'local-demo';
  const method = event.requestContext?.http?.method || 'GET';
  try {
    if (method === 'GET') {
      const result = await db.send(new QueryCommand({TableName:process.env.PROPERTIES_TABLE,KeyConditionExpression:'user_id = :u',ExpressionAttributeValues:{':u':userId}}));
      return {statusCode:200,headers,body:JSON.stringify(result.Items || [])};
    }
    const body = JSON.parse(event.body || '{}');
    if (method === 'DELETE') { await db.send(new DeleteCommand({TableName:process.env.PROPERTIES_TABLE,Key:{user_id:userId,property_id:body.property_id}})); return {statusCode:204,headers}; }
    const item = {...body,user_id:userId,property_id:body.property_id || crypto.randomUUID(),updated_at:new Date().toISOString()};
    await db.send(new PutCommand({TableName:process.env.PROPERTIES_TABLE,Item:item}));
    return {statusCode:200,headers,body:JSON.stringify(item)};
  } catch (error) { console.error(error); return {statusCode:500,headers,body:JSON.stringify({error:'internal_error'})}; }
};
