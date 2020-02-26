/*
-------------------------------------------------------------
	Author:	jcasoft	- Juan Carlos Argueta
	Web Chat Client for Mycroft

	Modified for the HiveMind by JarbasAI

-------------------------------------------------------------

*/


$(document).ready(function () {

    // HiveMind socket
    var user = "dummy_user";
    var key = "dummy_key";
    let ip = "0.0.0.0";
    let port = 5678;
    var authToken = btoa(user + ":" + key);

    document.cookie = 'X-Authorization=' + authToken + '; path=/';

    var ws = new WebSocket('ws://' + ip + ":" + port);

    console.log('ws://' + ip + ":" + port);


    ws.onopen = function () {
        console.log("connected");
        push_response("Welcome to the HiveMind Webchat client!")
    };

    ws.onmessage = function (message) {
        message = JSON.parse(message.data);

        if (message.msg_type === "bus"){
            let mycroft_message =JSON.parse(message.payload);
            console.log("Received: " + mycroft_message.type);
            if (mycroft_message.type === "speak"){
                let utterance = mycroft_message.data.utterance;
                push_response(utterance)
            }
        }

    };

    ws.onclose = function () {
        console.log("disconnected");
    };

    var sendMessage = function (message) {
        // TODO hivemind message
        let hive_msg = message

        console.log("sending:" + JSON.stringify(hive_msg));
        ws.send(JSON.stringify(message));
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
            "data":{"utterances": [q]},
            "context": {"source": "WebChat", "destination": "HiveMind", "platform": "JarbasWebchatTerminalV0.1"}
        };
        sendMessage({
            'msg_type': "bus",
            "payload": payload,
            "context": {"source": "WebChat", "destination": "HiveMind", "platform": "JarbasWebchatTerminalV0.1"}
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
