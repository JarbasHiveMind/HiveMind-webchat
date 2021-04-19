FROM python:3.7-slim-buster

ENV TERM linux
ENV DEBIAN_FRONTEND noninteractive

# doubt all those are needed TODO minimize deps at some point
RUN set -x \
	&& apt-get update \
	&& apt-get install -y git \
        locales \
        sudo \
        curl \
	    apt-transport-https \
	    libtool \
	    libffi-dev \
	    libssl-dev \
	    autoconf \
	    automake \
	    bison \
	    swig \
	    libglib2.0-dev \
	    libicu-dev \
	    pkg-config \
	    libjpeg-dev \
	    libfann-dev \
	    build-essential \
	    libdbus-1-dev \
	    libdbus-glib-1-dev \
	    libxml2-dev \
	    libxslt1-dev \
	    zlib1g-dev \
	    libcurl4-openssl-dev \
	    libssl-dev \
	    libblas-dev \
	    liblapack-dev \
	    libatlas-base-dev \
	    gfortran \
	--no-install-recommends \
	&& rm -rf /var/lib/apt/lists/*


RUN pip3 install mycroft-lib[bus]==2021.4.2a13
RUN pip3 install mycroft-lib[skills]==2021.4.2a13
RUN pip3 install mycroft-lib[lingua_franca]==2021.4.2a13
RUN pip3 install jarbas_hive_mind==0.10.7

RUN useradd --no-log-init mycroft -m
RUN mkdir /etc/mycroft
RUN mkdir /opt/hivemind
COPY config.json /etc/mycroft/mycroft.conf

WORKDIR /opt/hivemind
COPY ./hivemind_webchat /opt/hivemind/hivemind_webchat

# Set the locale
RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# setup the launcher
COPY launch.py /opt/hivemind/launch_all.py

EXPOSE 9090
EXPOSE 5678

USER mycroft

ENTRYPOINT ["python3", "/opt/hivemind/launch_all.py"]