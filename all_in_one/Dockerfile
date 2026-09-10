FROM python:3.14-slim-bookworm

ENV TERM=linux
ENV DEBIAN_FRONTEND=noninteractive

RUN set -x \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends \
	    git \
	    locales \
	    build-essential \
	&& rm -rf /var/lib/apt/lists/*

# webchat UI + optional headless hivemind-bus-client bridge.
# The hub (hivemind-core) and skills/agent (ovos-core) run as separate
# services — see all_in_one/launch.py for the architecture notes.
# Runtime deps (tornado, ovos-utils, hivemind-bus-client 2.x) are declared in
# pyproject.toml, so installing the package below pulls the whole graph.
RUN useradd --no-log-init hivemind -m
RUN mkdir /opt/hivemind

WORKDIR /opt/hivemind
COPY ../ /opt/hivemind/HiveMind-webchat
RUN pip3 install --no-cache-dir /opt/hivemind/HiveMind-webchat

# Set the locale
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

EXPOSE 9090

USER hivemind

ENTRYPOINT ["python3", "/opt/hivemind/HiveMind-webchat/all_in_one/launch.py"]
