var errors = require('request-promise/errors');

function handle_error(res, err) {
    if (err instanceof errors.StatusCodeError) {
        res.status(err.statusCode).json(err);
    } else {
        res.status(400).json(err);
    }
}

module.exports= {handle_error}
