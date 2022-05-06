var errors = require('request-promise/errors');

function handle_error(res, err) {
    //res.json({ error: JSON.stringify(err) })
        //.status(500)
    if (err instanceof errors.StatusCodeError) {
        res.json({ error: err }).status(err.statusCode)
        
    } else {
        res.json({ error: err }).status(500)
    }
}

module.exports= {handle_error}
