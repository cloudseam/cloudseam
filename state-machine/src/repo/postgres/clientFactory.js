const { secretsManager } = require('../../aws');
const { Client } = require('pg');

class ClientFactory {
    constructor() {
        this.credentials = getConfig();
    }

    async withClient(fn) {
        const config = await this.credentials;

        const client = new Client({
            user: config.username,
            host: config.host,
            database: config.dbname,
            password: config.password,
            port: config.port,
        });

        try {
            await client.connect();
        } catch (err) {
            if (err.message.indexOf('already been connected') === -1) throw err;
        }

        try {
            return await fn(client);
        } catch (err) {
            console.error(err);
        } finally {
            await client.end();
        }
    }
}

async function getConfig() {
    if (process.env.LOCAL_MODE) {
        console.log(`Using local db credentials`);
        return {
            username: 'summit',
            host: 'db',
            database: 'summit',
            password: 'summit',
        };
    }

    console.log(
        `Using credentials from ${process.env.POSTGRES_CONNECTION_SECRET}`,
    );
    const secretData = await secretsManager
        .getSecretValue({
            SecretId: process.env.POSTGRES_CONNECTION_SECRET,
        })
        .promise();
    console.log('Credentials loaded');
    return JSON.parse(secretData.SecretString);
}

module.exports = new ClientFactory();
