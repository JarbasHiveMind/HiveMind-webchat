/*
-------------------------------------------------------------
	Author:	jcasoft	- Juan Carlos Argueta
	Web Chat Client for Mycroft

	Modified for the HiveMind by JarbasAI

-------------------------------------------------------------

*/
// HiveMind socket (hivemind-js client — see HiveMind-js). The client negotiates
// the highest protocol version both peers support: v3 Noise (default ChaChaPoly
// suite) where the hub offers it, else the v1 password handshake.
const user = "HivemindWebChat";


$(document).ready(function () {
	
    const hivemind_connection = new JarbasHiveMind()
    const CONNECT_LABEL = 'Connect to HiveMind'
    // One of: 'disconnected', 'connecting', 'connected'.
    let connectionState = 'disconnected'

    function setConnectionState(state) {
        connectionState = state
        const btn = $('#connectBtn')
        btn.removeClass('btn-danger btn-warning btn-success')
        if (state === 'connecting') {
            btn.addClass('btn-warning').text('Connecting...').prop('disabled', true)
        } else if (state === 'connected') {
            btn.addClass('btn-success').text('Connected').prop('disabled', false)
        } else {
            btn.addClass('btn-danger').text(CONNECT_LABEL).prop('disabled', false)
        }
    }

    setConnectionState('disconnected')
	
    // Function to open modal when the button is clicked
    $('#connectBtn').click(function () {
        $('#credentialsModal').modal('show');
    });

    // Function to handle form submission
    $('#credentialsForm').submit(function (event) {
        event.preventDefault(); // Prevent default form submission behavior

        // Retrieve input values
        var accessKey = $('#accessKey').val();
        // The password is all that is normally needed: against a v3 hub the client
        // derives the Noise PSK as argon2id(password, SHA-256(node_id)) in-browser
        // and negotiates the default ChaChaPoly suite; on the v1 path it drives the
        // PBKDF2 handshake / AES-GCM session key.
        var password = $('#password').val();
        let ip = $('#ip').val();
        let port = $('#port').val();

        // Optional protocol-v3 (Noise) options. Empty fields keep the client on
        // the password path (argon2id PSK in-browser, or v1 fallback).
        let options = {};
        let psk = ($('#psk').val() || '').trim();
        if (psk) options.psk = psk;
        let serverKey = ($('#serverKey').val() || '').trim();
        if (serverKey) options.serverNoiseKey = serverKey;

        setConnectionState('connecting')
        try {
            hivemind_connection.connect(ip, port, user, accessKey, password, options);
        } catch (error) {
            console.error("Error connecting to HiveMind:", error);
            push_response("Error connecting to HiveMind: " + error)
            setConnectionState('disconnected')
        }
	    
        // Close the modal
        $('#credentialsModal').modal('hide');
    });
	

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

    // Text from the user and from the hub is untrusted. Set it with .text(),
    // never as an HTML string, so markup in it shows as text.
    function push_bubble(side, icon, msg) {
        const bubble = $('<div class="bubble ' + side + '">')
        bubble.append($('<i class="fa ' + icon + '" aria-hidden="true">'))
        bubble.append($('<span>').text('\u00a0\u00a0' + msg))
        $('.chat').append(bubble)
    }

    function push_statement(msg) {
        push_bubble('me', 'fa-user-circle', msg)
    }

    function push_response(msg) {
        push_bubble('you', 'fa-commenting', msg)
    }

    hivemind_connection.onHiveConnected = function () {
        push_response("Welcome to the HiveMind Webchat client!")
        setConnectionState('connected')
    };

    hivemind_connection.onMycroftSpeak = function (mycroft_message) {
        let utterance = mycroft_message.data.utterance;
        push_response(utterance)
    }

    hivemind_connection.onHiveDisconnected = function () {
        // A failed connect attempt already shows its reason in onHiveError.
        // Only a connection that was up can be "lost".
        if (connectionState === 'connected') {
            push_response("Hivemind connection lost...")
        }
        setConnectionState('disconnected')
    };

    // A close code 1008 (Policy Violation) means the hub rejected the
    // credentials/handshake — terminal, not a transient drop. The client
    // does not auto-retry (connect() only fires from the credentials form),
    // but without this the user just sees the generic "connection lost"
    // message in onHiveDisconnected with no indication why.
    hivemind_connection.onHiveError = function (error) {
        console.error("HiveMind error:", error);
        const detail = error && error.message ? error.message : error
        if (connectionState === 'connecting') {
            push_response("Could not connect to HiveMind: " + detail);
        } else {
            push_response("HiveMind error: " + detail);
        }
    };

    // sendUtterance returns a promise. It rejects when the connection is not
    // ready or the send fails, so tell the user the message was not sent.
    function send_utterance(text) {
        return Promise.resolve()
            .then(function () { return hivemind_connection.sendUtterance(text) })
            .catch(function (error) {
                console.error("HiveMind send failed:", error);
                push_response("Message not sent: " + (error && error.message ? error.message : error));
            })
    }

    $('#textbox').keypress(function (e) {
        if (e.which == 13) {
            $(this).blur()
            push_statement($('#textbox').val())
            send_utterance($('#textbox').val())
            document.getElementById('textbox').value = ''
            return false
        }
    })

    $('#textbox_submit').click(function () {
        $(this).blur()
        push_statement($('#textbox').val())
        send_utterance($('#textbox').val())
        document.getElementById('textbox').value = ''
        return false
    })

   
});
