const AWS = require('aws-sdk');

AWS.config.region = process.env.AWS_DEFAULT_REGION;
AWS.config.correctClockSkew = true;

AWS.config.sqs = {
    endpoint: process.env.LOCAL_MODE ? 'http://sqs:9324' : undefined,
};

module.exports = {
    sqsClient: new AWS.SQS(),
    s3: new AWS.S3(),
    lambda: new AWS.Lambda(),
};
