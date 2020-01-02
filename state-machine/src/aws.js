const AWS = require('aws-sdk');

AWS.config.region = process.env.AWS_DEFAULT_REGION;
AWS.config.correctClockSkew = true;

const secretsManager = new AWS.SecretsManager();

const sqs = new AWS.SQS({
    endpoint: process.env.LOCAL_MODE ? 'http://sqs:9324' : undefined,
});

const dynamoClient = new AWS.DynamoDB.DocumentClient({
    endpoint: process.env.LOCAL_MODE ? 'http://dynamodb:8000' : undefined,
});

module.exports = {
    secretsManager,
    sqs,
    s3: new AWS.S3(),
    dynamoClient,
};
