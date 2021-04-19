from hivemind_webchat import webchat
import bus
import skills
from ovos_utils import create_daemon
from time import sleep
from jarbas_hive_mind import get_listener
from jarbas_hive_mind.configuration import CONFIGURATION
from jarbas_hive_mind.database import ClientDatabase


def start_mycroft():
    create_daemon(bus.main)
    sleep(2)
    create_daemon(skills.main)


def start_webchat():
    create_daemon(webchat.main)


def start_mind(config=None, bus=None):
    config = config or CONFIGURATION
    # listen
    listener = get_listener(bus=bus)
    # use http
    config["ssl"]["use_ssl"] = False
    # read port and ssl settings
    listener.load_config(config)

    # add the keys -> see also hivemind_webchat/static/js/app.js
    name = "HivemindWebChat"
    key = "ivf1NQSkQNogWYyr"
    crypto_key = "ivf1NQSkQNogWYyr"
    mail = "jarbasaai@mailfence.com"

    with ClientDatabase() as db:
        db.add_client(name, mail, key, crypto_key=crypto_key)

    listener.listen()


if __name__ == '__main__':
    start_mycroft()
    start_webchat()
    start_mind()
