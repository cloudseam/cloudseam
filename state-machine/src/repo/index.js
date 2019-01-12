let repo = null;

if (
    process.env.POSTGRES_CONNECTION_SECRET !== undefined ||
    process.env.LOCAL_MODE
) {
    repo = require('./postgres');
}

if (repo === null) throw new Error('No backing store has been configured');

module.exports = new repo();
