const s3 = require('./aws').s3;

async function s3attempt() {
    const response = await s3
        .getObject({
            Bucket: 'summit-terraform-scripts',
            Key: 'qa/cert-script/main.tf',
        })
        .promise();

    console.log('RESPONSE', response.Body.toString());
}

s3attempt();
