var errors = require('request-promise/errors');

function handle_error(res, err) {
    res.json({ error: err })
}

module.exports= {handle_error}
