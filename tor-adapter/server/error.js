var errors = require('request-promise/errors');

function handle_error(res, err) {
    if (err instanceof errors.StatusCodeError) {
        res.status(err.statusCode).json(JSON.stringify(err));
    } else {
        res.status(400).json(JSON.stringify(err));
    }
}

export {handle_error}
