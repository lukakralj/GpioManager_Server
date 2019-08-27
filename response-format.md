# Format of the server responses

### Success
If the request was accepted and there have been no errors then the format is as follows:
    {
        status: "OK",
        // request specific response
    }

### Error
If the request was invalid or an error occurred while processing that request then the format is as follows:
    {
        status: "ERR",
        err_code: "...",
        // other details
    }

## Authentication errors
If the token is missing the format is as follows:
    {
        status: "ERR",
        err_code: "NO_AUTH"
    }

If the token is present but is invalid or has expired then the format is as follows:
    {
        status: "ERR",
        err_code: "BAD_AUTH"
    }

In both cases a re-login is advised.
The client should also re-login if their public key changes.


# Error codes
NO_AUTH
BAD_AUTH
BAD_ENCRYPT
INVALID_FORMAT
LED_ERROR