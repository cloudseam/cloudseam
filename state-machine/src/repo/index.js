let repo = null;

if (process.env.POSTGRES_CONNECTION_SECRET !== undefined) {
    repo = require('./postgres');
} else if (process.env.DYNAMODB_TABLE !== undefined || process.env.LOCAL_MODE) {
    repo = require('./dynamodb');
}

if (repo === null) throw new Error('No backing store has been configured');

module.exports = new repo();
