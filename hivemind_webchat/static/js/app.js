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
    $('#connectBtn').addClass('btn-danger')
	
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

        try {
            hivemind_connection.connect(ip, port, user, accessKey, password, options);
        } catch (error) {
            console.error("Error connecting to HiveMind:", error);
            push_response("Error connecting to HiveMind: " + error)
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

    function push_statement(msg) {
        $('.chat').append('<div class="bubble me"><i class="fa fa-user-circle" aria-hidden="true"></i>&nbsp;&nbsp;' + msg + '</div>')
    }

    function push_response(msg) {
        $('.chat').append('<div class="bubble you"><i class="fa fa-commenting" aria-hidden="true"></i>&nbsp;&nbsp;' + msg + '</div>')

    }

    hivemind_connection.onHiveConnected = function () {
        push_response("Welcome to the HiveMind Webchat client!")
        $('#connectBtn').removeClass('btn-danger').addClass('btn-success').text('Connected');
    };

    hivemind_connection.onMycroftSpeak = function (mycroft_message) {
        let utterance = mycroft_message.data.utterance;
        push_response(utterance)
    }

    hivemind_connection.onHiveDisconnected = function () {
        push_response("Hivemind connection lost...")
    };

    $('#textbox').keypress(function (e) {
        if (e.which == 13) {
            $(this).blur()
            push_statement($('#textbox').val())
            hivemind_connection.sendUtterance($('#textbox').val())
            document.getElementById('textbox').value = ''
            return false
        }
    })

    $('#textbox_submit').click(function () {
        $(this).blur()
        $('.chat').append('<div class="bubble me"><i class="fa fa-user-circle" aria-hidden="true"></i>&nbsp;<i class="fa fa-volume-up"></i>&nbsp;' + $('#textbox').val() + '</div>')
        hivemind_connection.sendUtterance($('#textbox').val())
        document.getElementById('textbox').value = ''
        return false
    })

   
});
