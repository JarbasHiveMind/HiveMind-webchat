# HiveMind - Local WebChat

![logo](./javascript.png)

Mycroft Webchat Terminal - Connecting to the HiveMind with [javascript](https://github.com/JarbasHiveMind/HiveMind-js) reference implementation

This uses tornado to serve the webchat

![](./webchat.png)


## Usage

This uses [HiveMindJs](https://github.com/JarbasHiveMind/HiveMind-js)

change hivemind settings at ```hivemind_webchat/static/js/app.js```

run ```python -m hivemind_webchat```

Access from web browser `http://localhost:9090`

default settings are
```javascript
// HiveMind socket
user = "HivemindWebChat";
key = "ivf1NQSkQNogWYyr";
crypto_key = "ivf1NQSkQNogWYyr";
ip = "127.0.0.1";
port = 5678;
hivemind_address = 'ws://' + ip + ":" + port
```

## Privacy

Securing tornado is out of scope for this repo, it is currently served by HTTP, you probably want to set up nginx or equivalent with [let's encrypt](https://letsencrypt.org/) certificates

Hivemind Encryption is supported

## Credits

Original Webchat UI: [jcasoft](https://github.com/jcasoft/external-services)


