/*
-------------------------------------------------------------
	Author:	jcasoft	- Juan Carlos Argueta
	Web Chat Client for Mycroft

	Modified for the HiveMind by JarbasAI

-------------------------------------------------------------

*/
// HiveMind socket
const user = "HivemindWebChatV0.2";
var key = "DEMO";
var ip = "0.0.0.0";
var port = 5678;
var crypto_key = null;


$(document).ready(function () {
    // prompt user for hivemind creds
    // TODO a nice modal
    let host = prompt("Please enter HiveMind host (wss not supported!)", "0.0.0.0:5678");
    key = prompt("Please enter HiveMind access key", "your_access_key");
    crypto_key = prompt("Please enter HiveMind encryption key", "exactly_16chars");
    ip = host.split(":")[0]
    port = host.split(":")[1]

    const hivemind_connection = new JarbasHiveMind()

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

    hivemind_connection.connect(ip, port, user, key, crypto_key);
});
