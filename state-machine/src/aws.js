const AWS = require('aws-sdk');

AWS.config.region = process.env.AWS_DEFAULT_REGION;

const secretsManager = new AWS.SecretsManager();

const sqs = new AWS.SQS({
    endpoint: process.env.LOCAL_MODE ? 'http://sqs:9324' : undefined,
});

module.exports = {
    secretsManager,
    sqs,
};
