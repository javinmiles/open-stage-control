Client options can be set either with the server's `--client-options` option, or per client by adding query parameters to the server's url. One must prepend the url with a question mark (`?`) followed by `parameter=value` pairs separated with ampersands (`&`).


| Option | Value | Default | Description |
|----|----|----|----|
| hdpi | 1 / 0 | 0 | enable high resolution canvas |
| forceHdpi | number | 0 | force canvas scaling (ignore `hdpi`) |
| doubleTap | number | 375 | sets the double tap/click time threshold in milliseconds |
| zoom | number | 1 | sets the initial zoom |
| framerate | number | 60 | limit canvas drawing framerate |
| desyncCanvas | number | 0 | set to 1 to enable desynchronized canvas (may improve rendering performances) |
| lang | string | *system_default* | use a different language than the default if available (available languages: en, fr) |
| consoleLength | number | 300 | sets the maximum number of log messages in the client's console |
| id | string | *random_id* | client's unique id (use with caution: two clients should never have the same id) |
| usePercents | 1 / 0 | 0 | sets the editor's "relative units" option  |
| noFocus | 1 / 0 | 0 | (built-in client only) prevent the client window from taking focus unless a text input or a dropdown is clicked |


Example:

`http://server-ip:port?hdpi=1`
