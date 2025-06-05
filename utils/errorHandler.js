// utils/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err); // Log error for debugging

    // If the request expects JSON (e.g., AJAX request), send error as JSON
    if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Something went wrong!'
        });
    }

    // If not an AJAX request, send a generic error message
    res.status(err.status || 500).send('An unexpected error occurred.');
};

module.exports = errorHandler;
