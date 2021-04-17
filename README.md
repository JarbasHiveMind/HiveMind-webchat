# HiveMind - WebChat Terminal

![logo](./javascript.png)

Mycroft Webchat Terminal - Connecting to the HiveMind with javascript reference implementation

This uses tornado to serve the webchat

![](./webchat.png)


## Usage

change hivemind settings at ```tornado_webchat/static/js/app.js```

run ```python tornado_webchat/__main__.py```

Access from web browser http://your_ip_address:9090

## Privacy

Securing tornado is out of scope for this repo, it is currently served by HTTP, you probably want to set up nginx or equivalent with [let's encrypt](https://letsencrypt.org/) certificates

Hivemind connection is http by default! This is because browsers reject self signed certs, you may want to use [let's  encrypt](https://letsencrypt.org/) certificates and configure [HiveMind-core](https://github.com/OpenJarbas/HiveMind-core) to use them

Hivemind Encryption is supported

## Credits

Original Webchat UI: [jcasoft](https://github.com/jcasoft/external-services)


