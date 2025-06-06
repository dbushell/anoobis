# 𓃣 Anoobis

Anoobis is a (proof-of-concept) proof-of-work CAPTCHA.

Do not use this in production I'm just experimenting for educational purposes.

Inspired by [Anubis](https://anubis.techaro.lol).

## Usage

Run the Deno server with:

```sh
deno run --allow-read --allow-net main.ts
```

This serves a reverse proxy listening on:

```
http://0.0.0.0:80
```

Proxied hosts and configured in `anoobis.json`.

A test website at `http://anoobis.test` is also served.

An easy way to resolve DNS is to edit `/etc/hosts` with the entry:

```
127.0.0.1 anoobis.test
```

DNS should point to the reverse proxy not the test website itself.

* * *

[MIT License](/LICENSE) | Copyright © 2025 [David Bushell](https://dbushell.com)
