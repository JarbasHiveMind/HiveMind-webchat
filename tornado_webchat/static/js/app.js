/*
-------------------------------------------------------------
	Author:	jcasoft	- Juan Carlos Argueta
	Web Chat Client for Mycroft

	Modified for the HiveMind by JarbasAI

-------------------------------------------------------------

*/
// HiveMind socket
const user = "Webchat_user";
const key = "webchat_key";
const ip = "0.0.0.0";
const port = 5678;
const hivemind_address = 'ws://' + ip + ":" + port;
// HIGHLY recommended to set this if using ws instead of wss
// check examples/add_keys.py under hivemind-core
const crypto_key = "ivf1NQSkQNogWYyr";

/*
Import an AES secret key from an ArrayBuffer containing the raw bytes.
Takes an ArrayBuffer string containing the bytes, and returns a Promise
that will resolve to a CryptoKey representing the secret key.
*/
function importSecretKey(rawKey) {
    return crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
}

function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}


function fromHexString(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
}

async function decrypt_msg(hex_ciphertext, hex_iv) {
    // IV must be the same length (in bits) as the key
    let iv = fromHexString(hex_iv);

    let encryption_key = await importSecretKey(new TextEncoder().encode(crypto_key));

    let decrypted = await crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv
    }, encryption_key, fromHexString(hex_ciphertext))
    return String.fromCharCode.apply(null, new Uint8Array(decrypted));

}

async function encrypt_msg(text) {
    // IV must be the same length (in bits) as the key
    let iv = await crypto.getRandomValues(new Uint8Array(16))

    let encryption_key = await importSecretKey(new TextEncoder().encode(crypto_key));

    let cyphertext = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv
    }, encryption_key, new TextEncoder().encode(text))
    return {"nonce": toHexString(iv), "ciphertext": bufferToHex(cyphertext)}

}


$(document).ready(function () {

    var authToken = btoa(user + ":" + key);

    document.cookie = 'X-Authorization=' + authToken + '; path=/';

    var ws = new WebSocket(hivemind_address);

    console.log(hivemind_address);


    async function handle_bus_message(message) {
        if (crypto_key && message.ciphertext) {
            if (message.tag) {
                message = await decrypt_msg(message["ciphertext"] + message["tag"], message["nonce"])
            } else {
                message = await decrypt_msg(message["ciphertext"], message["nonce"])
            }
            message = JSON.parse(message)
        }


        if (message.msg_type === "bus") {
            let mycroft_message = JSON.parse(message.payload);
            if (mycroft_message.type === "speak") {
                let utterance = mycroft_message.data.utterance;
                push_response(utterance)
            }
        }
    }

    async function sendMessage(message) {

        let hive_msg = message;
        if (crypto_key) {
            message = await encrypt_msg(JSON.stringify(hive_msg))
        }
        ws.send(JSON.stringify(message));
    }


    ws.onopen = function () {
        console.log("connected");
        push_response("Welcome to the HiveMind Webchat client!")
    };

    ws.onmessage = function (message) {
        message = JSON.parse(message.data);
        handle_bus_message(message)

    };

    ws.onclose = function () {
        console.log("disconnected");
    };


    $('.chat[data-chat=person2]').addClass('active-chat')
    $('.person[data-chat=person2]').addClass('active')
    $('.left .person').mousedown(function () {
        if ($(this).hasClass('.active')) {
            return false
        }
        const findChat = $(this).attr('data-chat')
        const personName = $(this).find('.name').text()
        $('.right .top .name').html(personName)
        $('.chat').removeClass('active-chat')
        $('.left .person').removeClass('active')
        $(this).addClass('active')
        $('.chat[data-chat = ' + findChat + ']').addClass('active-chat')
    });


    function push_statment(msg) {
        $('.chat').append('<div class="bubble me"><i class="fa fa-user-circle" aria-hidden="true"></i>&nbsp;&nbsp;' + msg + '</div>')
    }


    function push_response(msg) {
        $('.chat').append('<div class="bubble you"><i class="fa fa-commenting" aria-hidden="true"></i>&nbsp;&nbsp;' + msg + '</div>')

    }

    function get_resp(q) {
        let payload = {
            'type': "recognizer_loop:utterance",
            "data": {"utterances": [q]},
            "context": {
                "source": "WebChat",
                "destination": "HiveMind",
                "platform": "JarbasWebchatTerminalV0.1"
            }
        };
        sendMessage({
            'msg_type': "bus",
            "payload": payload
        });

    }


    $('#textbox_submit').click(function () {
        $(this).blur()
        $('.chat').append('<div class="bubble me"><i class="fa fa-user-circle" aria-hidden="true"></i>&nbsp;<i class="fa fa-volume-up"></i>&nbsp;' + $('#textbox').val() + '</div>')
        get_resp($('#textbox').val())
        document.getElementById('textbox').value = ''
        return false
    })


    $('#textbox').keypress(function (e) {
        if (e.which == 13) {
            $(this).blur()
            push_statment($('#textbox').val())
            get_resp($('#textbox').val())
            document.getElementById('textbox').value = ''
            return false
        }
    })

});
